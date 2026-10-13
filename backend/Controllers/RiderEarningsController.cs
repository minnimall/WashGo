using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using WashGOApi.Data;
using WashGOApi.Models;
using WashGOApi.Services;

namespace WashGOApi.Controllers;

[ApiController]
[Route("api/rider/earnings")]
[Authorize(Roles = Roles.Rider)]
public class RiderEarningsController(AppDbContext db, IMemoryCache cache) : ControllerBase
{
    static readonly TimeSpan Th = TimeSpan.FromHours(7);   // ไทยไม่มี DST
    long q1Ms, q2Ms;

    public record DayDto(string Date, int Jobs, decimal Total);
    public record MonthDto(string Month, int Jobs, decimal Total);
    public record EarningJobDto(int OrderId, string OrderNo, PaymentMethod? Method, decimal Amount, decimal DeliveryFee, DateTime At);
    public record EarningsDto(
        decimal Today, int TodayJobs, decimal Month, int MonthJobs, decimal MonthDelivery,
        decimal AllTime, int AllJobs,
        List<DayDto> Days, List<MonthDto> Months, List<EarningJobDto> Recent);

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var me = User.FindFirstValue("sub")!;

        // แคชสั้นๆ ต่อ Rider (หน้าแรกกับหน้ารายได้ใช้ข้อมูลชุดเดียวกัน)
        var dto = await cache.GetOrCreateAsync($"rider-earnings:{me}", entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(15);
            return BuildAsync(me);
        });
        if (q1Ms + q2Ms > 0) Response.Headers["Server-Timing"] = $"q1;dur={q1Ms}, q2;dur={q2Ms}";
        return Ok(dto);
    }

    async Task<EarningsDto> BuildAsync(string me)
    {
        var paid = from p in db.Payments.AsNoTracking()
                   join o in db.Orders.AsNoTracking() on p.OrderId equals o.Id
                   where o.RiderId == me && p.Status == PaymentStatus.Paid && p.ConfirmedAt != null
                   select new { o.Id, o.OrderNo, p.Method, p.Amount, o.DeliveryFee, At = p.ConfirmedAt!.Value };

        var sw = System.Diagnostics.Stopwatch.StartNew();

        // query 1: ยอดรวมทั้งหมด (คำนวณในฐานข้อมูล รอบเดียว)
        var all = await paid.GroupBy(_ => 1)
            .Select(g => new { Jobs = g.Count(), Total = g.Sum(x => x.Amount) })
            .FirstOrDefaultAsync();
        q1Ms = sw.ElapsedMilliseconds;
        sw.Restart();

        var today = (DateTime.UtcNow + Th).Date;
        var monthStart = new DateTime(today.Year, today.Month, 1);
        var fromUtc = DateTime.SpecifyKind(monthStart.AddMonths(-5) - Th, DateTimeKind.Utc);

        // query 2: แถวย้อนหลัง 6 เดือน (เฉพาะคอลัมน์ที่ใช้) แล้วรวมกลุ่มในหน่วยความจำ
        var rows = (await paid.Where(x => x.At >= fromUtc)
                .OrderByDescending(x => x.At).Take(5000).ToListAsync())
            .Select(x => new { x.Id, x.OrderNo, x.Method, x.Amount, x.DeliveryFee, x.At, Local = x.At + Th })
            .ToList();

        q2Ms = sw.ElapsedMilliseconds;
        var todayRows = rows.Where(r => r.Local.Date == today).ToList();
        var monthRows = rows.Where(r => r.Local >= monthStart).ToList();

        var byDay = rows.GroupBy(r => r.Local.Date).ToDictionary(g => g.Key, g => (Jobs: g.Count(), Total: g.Sum(r => r.Amount)));
        var days = Enumerable.Range(0, 30).Select(i => today.AddDays(-29 + i)).Select(d =>
            byDay.TryGetValue(d, out var v)
                ? new DayDto(d.ToString("yyyy-MM-dd"), v.Jobs, v.Total)
                : new DayDto(d.ToString("yyyy-MM-dd"), 0, 0)).ToList();

        var byMonth = rows.GroupBy(r => (r.Local.Year, r.Local.Month))
            .ToDictionary(g => g.Key, g => (Jobs: g.Count(), Total: g.Sum(r => r.Amount)));
        var months = Enumerable.Range(0, 6).Select(i => monthStart.AddMonths(-5 + i)).Select(m =>
            byMonth.TryGetValue((m.Year, m.Month), out var v)
                ? new MonthDto(m.ToString("yyyy-MM"), v.Jobs, v.Total)
                : new MonthDto(m.ToString("yyyy-MM"), 0, 0)).ToList();

        var recent = rows.Take(20)
            .Select(r => new EarningJobDto(r.Id, r.OrderNo, r.Method, r.Amount, r.DeliveryFee, r.At)).ToList();

        return new EarningsDto(
            todayRows.Sum(r => r.Amount), todayRows.Count,
            monthRows.Sum(r => r.Amount), monthRows.Count, monthRows.Sum(r => r.DeliveryFee),
            all?.Total ?? 0, all?.Jobs ?? 0, days, months, recent);
    }
}