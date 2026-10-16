using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WashGOApi.Data;
using WashGOApi.Models;

namespace WashGOApi.Controllers;

[ApiController]
[Authorize(Roles = Roles.Rider)]
[Route("api/rider/reviews")]
public class RiderReviewsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var riderId = User.FindFirstValue("sub")!;
        var q = db.Reviews.AsNoTracking().Where(r => r.RiderId == riderId && !r.IsHidden);

        var stats = await q.GroupBy(_ => 1)
            .Select(g => new { Count = g.Count(), Avg = g.Average(r => (decimal)r.Rating) })
            .FirstOrDefaultAsync();

        // ไม่ส่งตัวตนลูกค้า ส่งแค่เลขออเดอร์
        var recent = await q.OrderByDescending(r => r.CreatedAt).Take(20)
            .Select(r => new { r.Rating, r.Comment, r.CreatedAt, r.Order.OrderNo })
            .ToListAsync();

        return Ok(new { count = stats?.Count ?? 0, average = stats?.Avg, recent });
    }
}