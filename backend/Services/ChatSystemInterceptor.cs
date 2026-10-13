using System.Runtime.CompilerServices;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using WashGOApi.Models;

namespace WashGOApi.Services;

// สร้างข้อความระบบในแชทอัตโนมัติเมื่อสถานะออเดอร์/การชำระเงินเปลี่ยน
public class ChatSystemInterceptor(IHubContext<ChatHub> hub) : SaveChangesInterceptor
{
    sealed record Note(int OrderId, string CustomerId, string RiderId, ChatMessage Msg);

    // interceptor เป็น singleton จึงเก็บรายการรอ push แยกตาม DbContext
    readonly ConditionalWeakTable<DbContext, List<Note>> pending = new();

    static string? OrderText(OrderStatus s) => s switch
    {
        OrderStatus.Accepted => "Rider รับงานแล้ว",
        OrderStatus.GoingToPickup => "Rider กำลังเดินทางไปรับผ้า",
        OrderStatus.PickedUp => "Rider รับผ้าแล้ว",
        OrderStatus.AwaitingPriceConfirmation => "รอลูกค้ายืนยันราคาใหม่",
        OrderStatus.Washing => "เริ่มซักผ้าแล้ว",
        OrderStatus.WashingCompleted => "ซักผ้าเสร็จแล้ว",
        OrderStatus.Delivering => "Rider กำลังนำผ้าไปส่ง",
        OrderStatus.Delivered => "ส่งผ้าแล้ว กรุณาชำระเงินและกดยืนยันรับผ้า",
        OrderStatus.Completed => "ออเดอร์เสร็จสมบูรณ์ ขอบคุณที่ใช้บริการ",
        OrderStatus.Cancelled => "ออเดอร์ถูกยกเลิก",
        _ => null,
    };

    static string? PayText(PaymentStatus s) => s switch
    {
        PaymentStatus.SlipUploaded => "ลูกค้าส่งสลิปโอนเงินแล้ว รอ Rider ตรวจสอบ",
        PaymentStatus.Paid => "ยืนยันการชำระเงินแล้ว",
        PaymentStatus.Rejected => "Rider ปฏิเสธสลิป กรุณาส่งสลิปใหม่",
        _ => null,
    };

    public override async ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData e, InterceptionResult<int> result, CancellationToken ct = default)
    {
        if (e.Context is { } db) await CollectAsync(db, ct);
        return result;
    }

    public override async ValueTask<int> SavedChangesAsync(
        SaveChangesCompletedEventData e, int result, CancellationToken ct = default)
    {
        if (e.Context is { } db && pending.TryGetValue(db, out var list))
        {
            pending.Remove(db);
            foreach (var n in list)
            {
                var dto = new ChatMessageDto(n.Msg.Id, "System", ChatMessageType.System, n.Msg.Body, n.Msg.CreatedAt, null);
                try
                {
                    await hub.Clients.Groups(ChatHub.UserGroup(n.CustomerId), ChatHub.UserGroup(n.RiderId))
                        .SendAsync("chat:message", n.OrderId, dto, ct);
                }
                catch { /* push ไม่สำเร็จไม่กระทบข้อมูล ผู้ใช้จะเห็นตอนดึงรอบถัดไป */ }
            }
        }
        return result;
    }

    public override Task SaveChangesFailedAsync(DbContextErrorEventData e, CancellationToken ct = default)
    {
        if (e.Context is { } db) pending.Remove(db);
        return Task.CompletedTask;
    }

    async Task CollectAsync(DbContext db, CancellationToken ct)
    {
        db.ChangeTracker.DetectChanges();
        var items = new List<(int OrderId, string Cust, string Rider, string Text)>();

        // สถานะออเดอร์เปลี่ยน (ต้องมี Rider แล้ว ถึงจะมีห้องแชท)
        foreach (var en in db.ChangeTracker.Entries<Order>().Where(x => x.State == EntityState.Modified).ToList())
        {
            var p = en.Property(o => o.Status);
            if (!p.IsModified || Equals(p.OriginalValue, p.CurrentValue) || en.Entity.RiderId is null) continue;
            if (OrderText(en.Entity.Status) is { } text)
                items.Add((en.Entity.Id, en.Entity.CustomerId, en.Entity.RiderId, text));
        }

        // สถานะการชำระเงินเปลี่ยน
        foreach (var en in db.ChangeTracker.Entries<Payment>().Where(x => x.State == EntityState.Modified).ToList())
        {
            var p = en.Property(x => x.Status);
            if (!p.IsModified || Equals(p.OriginalValue, p.CurrentValue)) continue;
            if (PayText(en.Entity.Status) is not { } text) continue;

            var orderId = en.Entity.OrderId;
            var o = await db.Set<Order>().AsNoTracking()
                .Where(x => x.Id == orderId && x.RiderId != null)
                .Select(x => new { x.Id, x.CustomerId, x.RiderId })
                .FirstOrDefaultAsync(ct);
            if (o is not null) items.Add((o.Id, o.CustomerId, o.RiderId!, text));
        }

        if (items.Count == 0) return;

        var list = new List<Note>();
        foreach (var (orderId, cust, rider, text) in items)
        {
            var thread = db.Set<ChatThread>().Local.FirstOrDefault(t => t.OrderId == orderId)
                         ?? await db.Set<ChatThread>().FirstOrDefaultAsync(t => t.OrderId == orderId, ct);
            if (thread is null)
            {
                thread = new ChatThread { OrderId = orderId };
                db.Add(thread);
            }

            var msg = new ChatMessage { Thread = thread, SenderId = null, Type = ChatMessageType.System, Body = text };
            thread.LastMessageAt = msg.CreatedAt;
            db.Add(msg);
            list.Add(new Note(orderId, cust, rider, msg));
        }

        pending.Remove(db);
        pending.Add(db, list);
    }
}