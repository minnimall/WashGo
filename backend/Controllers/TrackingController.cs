using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using WashGOApi.Data;
using WashGOApi.Models;

namespace WashGOApi.Controllers;

public class PositionRequest
{
    [Range(-90, 90)] public double Lat { get; set; }
    [Range(-180, 180)] public double Lng { get; set; }
}

public record RiderPoint(double Lat, double Lng, DateTime At);

// ตำแหน่ง Rider เก็บในหน่วยความจำชั่วคราว (หมดอายุเอง) ไม่บันทึกลงฐานข้อมูล
[ApiController]
[Route("api/orders/{orderId:int}/tracking")]
[Authorize]
public class TrackingController(AppDbContext db, IMemoryCache cache) : ControllerBase
{
    static readonly TimeSpan Ttl = TimeSpan.FromMinutes(3);
    static readonly TimeSpan MinGap = TimeSpan.FromSeconds(3);

    string UserId => User.FindFirstValue("sub")!;

    static string Key(int orderId) => $"rider-pos:{orderId}";

    // แชร์ตำแหน่งเฉพาะตอนกำลังไปรับผ้า หรือกำลังนำผ้าไปส่ง
    static string? ModeOf(OrderStatus s) => s switch
    {
        OrderStatus.GoingToPickup => "pickup",
        OrderStatus.Delivering => "delivery",
        _ => null,
    };

    [HttpPut]
    [Authorize(Roles = Roles.Rider)]
    public async Task<IActionResult> Update(int orderId, PositionRequest req)
    {
        var userId = UserId;
        var status = await db.Orders.AsNoTracking()
            .Where(o => o.Id == orderId && o.RiderId == userId)
            .Select(o => (OrderStatus?)o.Status)
            .FirstOrDefaultAsync();
        if (status is null) return NotFound();

        if (ModeOf(status.Value) is null)
            return Conflict(new { error = "ขณะนี้ไม่ได้อยู่ในช่วงแชร์ตำแหน่ง" });

        if (cache.TryGetValue(Key(orderId), out RiderPoint? last) && last is not null &&
            DateTime.UtcNow - last.At < MinGap)
            return NoContent();   // ส่งถี่เกินไป ข้ามไป

        cache.Set(Key(orderId), new RiderPoint(req.Lat, req.Lng, DateTime.UtcNow), Ttl);
        return NoContent();
    }

    // ลูกค้าเจ้าของออเดอร์เท่านั้น
    [HttpGet]
    [Authorize(Roles = Roles.Customer)]
    public async Task<IActionResult> Get(int orderId)
    {
        var userId = UserId;
        var status = await db.Orders.AsNoTracking()
            .Where(o => o.Id == orderId && o.CustomerId == userId)
            .Select(o => (OrderStatus?)o.Status)
            .FirstOrDefaultAsync();
        if (status is null) return NotFound();

        var mode = ModeOf(status.Value);
        RiderPoint? point = null;
        if (mode is not null) cache.TryGetValue(Key(orderId), out point);
        else cache.Remove(Key(orderId));   // พ้นช่วงแชร์แล้ว ลบตำแหน่งทิ้ง

        return Ok(new
        {
            status,
            mode,
            point = point is null ? null : new { point.Lat, point.Lng, point.At },
        });
    }
}