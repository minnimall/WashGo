using System.Diagnostics;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using WashGOApi.Data;
using WashGOApi.Models;
using WashGOApi.Services;

namespace WashGOApi.Controllers;

[ApiController]
[Route("api/admin/dashboard")]
[Authorize(Roles = Roles.Admin)]
public class AdminDashboardController(AppDbContext db, IMemoryCache cache) : ControllerBase
{
    static readonly TimeSpan Th = TimeSpan.FromHours(7);
    static readonly SemaphoreSlim Gate = new(1, 1);   // กันคำขอพร้อมกันคำนวณซ้ำ
    const string Key = "admin-dashboard";

    public record DashboardDto(
        int Customers, int Riders, int RidersApproved, int RidersPending, int Suspended,
        int OrdersTotal, int OrdersToday, int OrdersWaiting, int OrdersActive, int OrdersCompleted, int OrdersCancelled,
        decimal PaidToday, decimal PaidMonth, decimal PaidAll, int PaidJobs);

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        if (cache.TryGetValue(Key, out DashboardDto? hit) && hit is not null) return Ok(hit);

        await Gate.WaitAsync();
        try
        {
            // คำขอที่รอคิวอยู่อาจได้ผลจากคนก่อนหน้าแล้ว
            if (cache.TryGetValue(Key, out hit) && hit is not null) return Ok(hit);

            var sw = Stopwatch.StartNew();
            var dto = await BuildAsync();
            Response.Headers["Server-Timing"] = $"db;dur={sw.ElapsedMilliseconds}";

            cache.Set(Key, dto, TimeSpan.FromSeconds(30));
            return Ok(dto);
        }
        finally
        {
            Gate.Release();
        }
    }

    // query เดียว: ทุกค่าเป็น scalar subquery ใน SELECT เดียว จึงเสียเวลาไป-กลับฐานข้อมูลแค่ 1 รอบ
    async Task<DashboardDto> BuildAsync()
    {
        var todayTh = (DateTime.UtcNow + Th).Date;
        var todayUtc = DateTime.SpecifyKind(todayTh - Th, DateTimeKind.Utc);
        var monthUtc = DateTime.SpecifyKind(new DateTime(todayTh.Year, todayTh.Month, 1) - Th, DateTimeKind.Utc);
        var active = JobFlow.ActiveStatuses;

        var r = await db.Users.AsNoTracking().Take(1).Select(_ => new
        {
            Customers = db.UserRoles.Count(ur => db.Roles.Any(x => x.Id == ur.RoleId && x.Name == Roles.Customer)),
            Riders = db.UserRoles.Count(ur => db.Roles.Any(x => x.Id == ur.RoleId && x.Name == Roles.Rider)),
            Suspended = db.Users.Count(u => u.IsSuspended),

            RidersApproved = db.RiderProfiles.Count(p => p.VerificationStatus == RiderVerificationStatus.Approved),
            RidersPending = db.RiderProfiles.Count(p => p.VerificationStatus == RiderVerificationStatus.PendingReview),

            OrdersTotal = db.Orders.Count(),
            OrdersToday = db.Orders.Count(o => o.CreatedAt >= todayUtc),
            OrdersWaiting = db.Orders.Count(o => o.Status == OrderStatus.Pending),
            OrdersActive = db.Orders.Count(o => active.Contains(o.Status)),
            OrdersCompleted = db.Orders.Count(o => o.Status == OrderStatus.Completed),
            OrdersCancelled = db.Orders.Count(o => o.Status == OrderStatus.Cancelled),

            PaidJobs = db.Payments.Count(p => p.Status == PaymentStatus.Paid && p.ConfirmedAt != null),
            PaidAll = db.Payments.Where(p => p.Status == PaymentStatus.Paid && p.ConfirmedAt != null)
                .Sum(p => (decimal?)p.Amount) ?? 0m,
            PaidMonth = db.Payments.Where(p => p.Status == PaymentStatus.Paid && p.ConfirmedAt >= monthUtc)
                .Sum(p => (decimal?)p.Amount) ?? 0m,
            PaidToday = db.Payments.Where(p => p.Status == PaymentStatus.Paid && p.ConfirmedAt >= todayUtc)
                .Sum(p => (decimal?)p.Amount) ?? 0m,
        }).FirstAsync();

        return new DashboardDto(
            r.Customers, r.Riders, r.RidersApproved, r.RidersPending, r.Suspended,
            r.OrdersTotal, r.OrdersToday, r.OrdersWaiting, r.OrdersActive, r.OrdersCompleted, r.OrdersCancelled,
            r.PaidToday, r.PaidMonth, r.PaidAll, r.PaidJobs);
    }
}