using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using WashGOApi.Data;
using WashGOApi.Models;
using WashGOApi.Services;

namespace WashGOApi.Controllers;

[ApiController]
[Route("api/orders/{orderId:int}/chat")]
[Authorize]
public class ChatController(AppDbContext db, StorageService storage, IHubContext<ChatHub> hub) : ControllerBase
{
    const int MaxPerMinute = 30;

    // Me/Other = บทบาทของเรา และ user id ของอีกฝ่าย
    sealed record Room(int OrderId, string CustomerId, string RiderId, OrderStatus Status, string Me, string Other);

    string UserId => User.FindFirstValue("sub")!;

    // ผู้เข้าร่วมคือลูกค้ากับ Rider "ปัจจุบัน" ของออเดอร์ ถ้าไม่ใช่ตอบ 404 เหมือนไม่มีห้องนี้
    async Task<Room?> FindRoomAsync(int orderId)
    {
        var userId = UserId;
        var o = await db.Orders.AsNoTracking()
            .Where(x => x.Id == orderId && x.RiderId != null &&
                        (x.CustomerId == userId || x.RiderId == userId))
            .Select(x => new { x.Id, x.CustomerId, x.RiderId, x.Status })
            .FirstOrDefaultAsync();
        if (o is null) return null;

        var isCustomer = o.CustomerId == userId;
        return new Room(o.Id, o.CustomerId, o.RiderId!, o.Status,
            isCustomer ? "Customer" : "Rider", isCustomer ? o.RiderId! : o.CustomerId);
    }

    static bool CanSend(Room r) => JobFlow.ActiveStatuses.Contains(r.Status);

    static ChatMessageDto ToDto(ChatMessage m, Room r) => new(
        m.Id,
        m.SenderId is null ? "System" : m.SenderId == r.CustomerId ? "Customer" : "Rider",
        m.Type, m.Body, m.CreatedAt, m.ReadAt);

    [HttpGet]
    public async Task<IActionResult> History(int orderId, [FromQuery] int? before, [FromQuery] int limit = 50)
    {
        var room = await FindRoomAsync(orderId);
        if (room is null) return NotFound();

        limit = Math.Clamp(limit, 1, 100);
        var threadId = await db.ChatThreads.AsNoTracking()
            .Where(t => t.OrderId == orderId).Select(t => (int?)t.Id).FirstOrDefaultAsync();
        if (threadId is null) return Ok(new ChatHistoryDto(CanSend(room), false, []));

        var q = db.ChatMessages.AsNoTracking().Where(m => m.ThreadId == threadId && !m.IsDeleted);
        if (before is { } b) q = q.Where(m => m.Id < b);

        var rows = await q.OrderByDescending(m => m.Id).Take(limit + 1).ToListAsync();
        var page = rows.Take(limit).Reverse().Select(m => ToDto(m, room)).ToList();
        return Ok(new ChatHistoryDto(CanSend(room), rows.Count > limit, page));
    }

    [HttpGet("unread")]
    public async Task<IActionResult> Unread(int orderId)
    {
        var room = await FindRoomAsync(orderId);
        if (room is null) return NotFound();

        var userId = UserId;
        var n = await db.ChatMessages.CountAsync(m =>
            m.Thread.OrderId == orderId && !m.IsDeleted &&
            m.SenderId != null && m.SenderId != userId && m.ReadAt == null);
        return Ok(new { count = n });
    }

    [HttpPost("messages")]
    public async Task<IActionResult> Send(int orderId, SendChatRequest req)
    {
        var body = Input.Clean(req.Body);
        if (body is null) return BadRequest(new { error = "กรุณาพิมพ์ข้อความ" });

        var room = await FindRoomAsync(orderId);
        if (room is null) return NotFound();
        if (!CanSend(room)) return Conflict(new { error = "แชทนี้ปิดแล้ว (อ่านได้อย่างเดียว)" });
        if (await TooFastAsync()) return TooMany();

        var thread = await ThreadAsync(orderId);
        var msg = new ChatMessage
        {
            ThreadId = thread.Id,
            SenderId = UserId,
            Type = ChatMessageType.Text,
            Body = body,
        };
        db.ChatMessages.Add(msg);
        thread.LastMessageAt = msg.CreatedAt;
        await db.SaveChangesAsync();

        var dto = ToDto(msg, room);
        await PushAsync(room, dto);
        return Ok(dto);
    }

    [HttpPost("images")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(8_000_000)]
    [EnableRateLimiting("upload")]
    public async Task<IActionResult> SendImage(int orderId, [FromForm] PhotoForm form)
    {
        var room = await FindRoomAsync(orderId);
        if (room is null) return NotFound();
        if (!CanSend(room)) return Conflict(new { error = "แชทนี้ปิดแล้ว (อ่านได้อย่างเดียว)" });
        if (await TooFastAsync()) return TooMany();

        var (img, err) = await ImageValidator.ReadAsync(form.File);   // ตรวจชนิดไฟล์จากไบต์จริง
        if (img is null) return BadRequest(new { error = err });

        var path = $"chat/{orderId}/{Guid.NewGuid():N}.{img.Ext}";
        await storage.UploadAsync(path, img.Data, img.ContentType);

        var thread = await ThreadAsync(orderId);
        var msg = new ChatMessage
        {
            ThreadId = thread.Id,
            SenderId = UserId,
            Type = ChatMessageType.Image,
            ImagePath = path,
        };
        db.ChatMessages.Add(msg);
        thread.LastMessageAt = msg.CreatedAt;
        try
        {
            await db.SaveChangesAsync();
        }
        catch
        {
            await storage.DeleteAsync(path);
            throw;
        }

        var dto = ToDto(msg, room);
        await PushAsync(room, dto);
        return Ok(dto);
    }

    // ทำเครื่องหมายว่าอ่านข้อความของอีกฝ่ายแล้ว และบอกอีกฝ่ายให้ขึ้น "อ่านแล้ว"
    [HttpPost("read")]
    public async Task<IActionResult> MarkRead(int orderId)
    {
        var room = await FindRoomAsync(orderId);
        if (room is null) return NotFound();

        var threadId = await db.ChatThreads.AsNoTracking()
            .Where(t => t.OrderId == orderId).Select(t => (int?)t.Id).FirstOrDefaultAsync();
        if (threadId is null) return NoContent();

        var userId = UserId;
        var now = (DateTime?)DateTime.UtcNow;
        var n = await db.ChatMessages
            .Where(m => m.ThreadId == threadId && m.SenderId != null && m.SenderId != userId && m.ReadAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(m => m.ReadAt, now));

        if (n > 0)
            await hub.Clients.Group(ChatHub.UserGroup(room.Other)).SendAsync("chat:read", orderId);
        return NoContent();
    }

    // รูปในแชท: เฉพาะลูกค้ากับ Rider ปัจจุบันของออเดอร์นั้น
    [HttpGet("~/api/chat/images/{messageId:int}")]
    public async Task<IActionResult> Image(int messageId)
    {
        var userId = UserId;
        var row = await db.ChatMessages.AsNoTracking()
            .Where(m => m.Id == messageId && m.Type == ChatMessageType.Image && !m.IsDeleted)
            .Select(m => new { m.ImagePath, m.Thread.Order.CustomerId, m.Thread.Order.RiderId })
            .FirstOrDefaultAsync();

        if (row?.ImagePath is null || !(row.CustomerId == userId || row.RiderId == userId))
            return NotFound();

        var data = await storage.DownloadAsync(row.ImagePath);
        if (data is null) return NotFound();

        Response.Headers.CacheControl = "private, max-age=3600";   // รูปแก้ไม่ได้ เก็บแคชในเครื่องผู้ใช้ได้
        return File(data, ImageValidator.ContentTypeOf(row.ImagePath));
    }

    // ============ ตัวช่วย ============

    async Task<ChatThread> ThreadAsync(int orderId)
    {
        var t = await db.ChatThreads.FirstOrDefaultAsync(x => x.OrderId == orderId);
        if (t is not null) return t;

        t = new ChatThread { OrderId = orderId };
        db.ChatThreads.Add(t);
        try
        {
            await db.SaveChangesAsync();
            return t;
        }
        catch (DbUpdateException)
        {
            // อีกฝ่ายสร้างห้องพร้อมกัน ใช้ห้องที่มีอยู่แล้ว
            db.Entry(t).State = EntityState.Detached;
            return await db.ChatThreads.FirstAsync(x => x.OrderId == orderId);
        }
    }

    // จำกัดต่อ "คน" (rate limiter ของโปรเจกต์ทำงานก่อนล็อกอิน จึงแยกรายคนไม่ได้)
    async Task<bool> TooFastAsync()
    {
        var userId = UserId;
        var since = DateTime.UtcNow.AddMinutes(-1);
        return await db.ChatMessages.CountAsync(m => m.SenderId == userId && m.CreatedAt > since) >= MaxPerMinute;
    }

    IActionResult TooMany() =>
        StatusCode(StatusCodes.Status429TooManyRequests, new { error = "ส่งข้อความถี่เกินไป กรุณารอสักครู่" });

    Task PushAsync(Room r, ChatMessageDto dto) =>
        hub.Clients.Groups(ChatHub.UserGroup(r.CustomerId), ChatHub.UserGroup(r.RiderId))
            .SendAsync("chat:message", r.OrderId, dto);
}