using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using WashGOApi.Data;
using WashGOApi.Models;
using WashGOApi.Services;

namespace WashGOApi.Controllers;

[ApiController]
[Authorize(Roles = Roles.Customer)]
[Route("api/orders/{orderId:int}/review")]
public class ReviewsController(AppDbContext db) : ControllerBase
{
    string UserId => User.FindFirstValue("sub")!;

    [HttpGet]
    public async Task<IActionResult> Get(int orderId)
    {
        var userId = UserId;

        // ออเดอร์ต้องเป็นของลูกค้าคนนี้ ไม่งั้น 404 (กัน IDOR)
        var order = await db.Orders.AsNoTracking()
            .Where(o => o.Id == orderId && o.CustomerId == userId)
            .Select(o => new { o.Status, o.RiderId })
            .FirstOrDefaultAsync();
        if (order is null) return NotFound();

        var review = await db.Reviews.AsNoTracking()
            .Where(r => r.OrderId == orderId)
            .Select(r => new ReviewDto(r.Rating, r.Comment, r.CreatedAt))
            .FirstOrDefaultAsync();

        var can = review is null && order.Status == OrderStatus.Completed && order.RiderId != null;
        return Ok(new { canReview = can, review });
    }

    [HttpPost]
    public async Task<IActionResult> Create(int orderId, SaveReviewRequest req)
    {
        var userId = UserId;

        var order = await db.Orders.AsNoTracking()
            .Where(o => o.Id == orderId && o.CustomerId == userId)
            .Select(o => new { o.Status, o.RiderId })
            .FirstOrDefaultAsync();
        if (order is null) return NotFound();

        if (order.Status != OrderStatus.Completed || order.RiderId is null)
            return Conflict(new { error = "รีวิวได้หลังออเดอร์เสร็จสิ้นเท่านั้น" });

        db.Reviews.Add(new Review
        {
            OrderId = orderId,
            CustomerId = userId,          // จาก token เสมอ
            RiderId = order.RiderId,      // จากออเดอร์ ไม่รับจากผู้ใช้
            Rating = req.Rating,
            Comment = Input.Clean(req.Comment),
        });

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: "23505" })
        {
            return Conflict(new { error = "ออเดอร์นี้ถูกรีวิวไปแล้ว" });
        }

        await RatingCalculator.RecalcRiderAsync(db, order.RiderId);
        return StatusCode(StatusCodes.Status201Created);
    }
}