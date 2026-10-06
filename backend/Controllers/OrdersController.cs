using System.Globalization;
using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WashGOApi.Data;
using WashGOApi.Models;

namespace WashGOApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = Roles.Customer)]
public class OrdersController(AppDbContext db) : ControllerBase
{
    const int MaxPendingOrders = 5;     // กันสร้างออเดอร์รัวๆ
    const int MaxExtraLines = 20;
    const int MaxQuantity = 20;

    string UserId => User.FindFirstValue("sub")!;

    [HttpPost]
    public async Task<IActionResult> Create(CreateOrderRequest req)
    {
        var userId = UserId;

        if (!Enum.IsDefined(req.Size) || !Enum.IsDefined(req.DetergentSource))
            return BadRequest(new { error = "ข้อมูลไซส์หรือน้ำยาไม่ถูกต้อง" });
        if (!req.AcceptDamageTerms)
            return BadRequest(new { error = "กรุณายอมรับเงื่อนไขความเสียหายของผ้าก่อนสั่ง" });

        var extras = req.Extras ?? [];
        if (extras.Count > MaxExtraLines)
            return BadRequest(new { error = "เลือกรายการเสริมได้ไม่เกิน 20 รายการ" });

        var pending = await db.Orders.CountAsync(o => o.CustomerId == userId && o.Status == OrderStatus.Pending);
        if (pending >= MaxPendingOrders)
            return Conflict(new { error = $"มีออเดอร์ที่รอ Rider รับงานอยู่ {MaxPendingOrders} รายการแล้ว กรุณารอหรือยกเลิกก่อน" });

        // 1) บริการ + ไซส์ → ราคาจากฐานข้อมูล
        var service = await db.ServiceTypes.AsNoTracking().Include(s => s.Prices)
            .FirstOrDefaultAsync(s => s.Id == req.ServiceTypeId && s.IsActive);
        var servicePrice = service?.Prices.FirstOrDefault(p => p.Size == req.Size);
        if (service is null || servicePrice is null)
            return BadRequest(new { error = "ไม่พบบริการหรือไซส์ที่เลือก" });

        // 2) จุดรับ/ส่ง ต้องเป็นของลูกค้าคนนี้เท่านั้น (กัน IDOR)
        var locationIds = new[] { req.PickupLocationId, req.DeliveryLocationId }.Distinct().ToList();
        var ownedCount = await db.Locations.AsNoTracking()
            .CountAsync(l => locationIds.Contains(l.Id) && l.UserId == userId && l.IsSaved);
        if (ownedCount != locationIds.Count)
            return BadRequest(new { error = "ไม่พบจุดรับหรือจุดส่งที่เลือก" });

        // 3) รายการเสริม: รวมรายการซ้ำ ตรวจจำนวน ดึงชื่อ/ราคาจากแคตตาล็อก
        var wanted = extras.GroupBy(e => e.CatalogItemId).ToDictionary(g => g.Key, g => g.Sum(e => e.Quantity));
        if (wanted.Values.Any(q => q < 1 || q > MaxQuantity))
            return BadRequest(new { error = "จำนวนรายการเสริมต้องอยู่ระหว่าง 1-20" });

        var ids = wanted.Keys.ToList();
        var catalog = await db.CatalogItems.AsNoTracking()
            .Where(c => ids.Contains(c.Id) && c.IsActive).ToListAsync();
        if (catalog.Count != wanted.Count)
            return BadRequest(new { error = "รายการเสริมบางอย่างไม่พร้อมให้บริการ" });

        // snapshot: เก็บชื่อและราคา ณ ตอนสั่งไว้ในออเดอร์
        var lines = catalog.Select(c => new OrderLine
        {
            CatalogItemId = c.Id,
            Type = c.Type,
            Name = c.Name,
            UnitPrice = c.Price,
            Quantity = wanted[c.Id],
        }).ToList();
        var extrasTotal = lines.Sum(l => l.UnitPrice * l.Quantity);

        // 4) ค่าส่งและค่าแพลตฟอร์มจาก AppSettings
        var settings = await db.AppSettings.AsNoTracking()
            .Where(s => s.Key == AppSettingKeys.DeliveryFee || s.Key == AppSettingKeys.PlatformFeePercent)
            .ToDictionaryAsync(s => s.Key, s => s.Value);
        var deliveryFee = ReadDecimal(settings, AppSettingKeys.DeliveryFee);
        var feePercent = ReadDecimal(settings, AppSettingKeys.PlatformFeePercent);

        var platformFee = Math.Round((servicePrice.Price + extrasTotal) * feePercent / 100m, 2, MidpointRounding.AwayFromZero);
        var total = servicePrice.Price + deliveryFee + extrasTotal + platformFee;

        // 5) เลขออเดอร์
        string orderNo;
        do { orderNo = NewOrderNo(); }
        while (await db.Orders.AnyAsync(o => o.OrderNo == orderNo));

        var order = new Order
        {
            OrderNo = orderNo,
            CustomerId = userId,                  // จาก token เสมอ
            ServiceTypeId = service.Id,
            PickupLocationId = req.PickupLocationId,
            DeliveryLocationId = req.DeliveryLocationId,
            EstimatedSize = req.Size,
            DetergentSource = req.DetergentSource,
            DetergentNote = Input.Clean(req.DetergentNote),
            CareNote = Input.Clean(req.CareNote),
            Status = OrderStatus.Pending,         // สถานะเริ่มต้นกำหนดโดยเซิร์ฟเวอร์
            ServicePrice = servicePrice.Price,
            DeliveryFee = deliveryFee,
            ExtrasTotal = extrasTotal,
            PlatformFee = platformFee,
            TotalPrice = total,
            CreatedAt = DateTime.UtcNow,
            Lines = lines,
            StatusHistories =
            {
                new OrderStatusHistory
                {
                    FromStatus = null,
                    ToStatus = OrderStatus.Pending,
                    ChangedByUserId = userId,
                    Note = "ลูกค้าสร้างออเดอร์ และยอมรับเงื่อนไขความเสียหายของผ้า",
                },
            },
        };

        // SaveChanges ครั้งเดียว = ออเดอร์ + รายการ + ประวัติ สำเร็จพร้อมกันหรือไม่สำเร็จเลย
        db.Orders.Add(order);
        await db.SaveChangesAsync();

        return StatusCode(StatusCodes.Status201Created, await LoadDetailAsync(order.Id, userId));
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var userId = UserId;
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 50);

        var query = db.Orders.AsNoTracking().Where(o => o.CustomerId == userId);
        var total = await query.CountAsync();

        var rows = await query
            .OrderByDescending(o => o.CreatedAt).ThenByDescending(o => o.Id)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(o => new
            {
                o.Id, o.OrderNo, o.Status, ServiceName = o.ServiceType.Name,
                o.EstimatedSize, o.FinalSize, o.TotalPrice, o.CreatedAt,
            })
            .ToListAsync();

        var items = rows.Select(r => new OrderSummaryDto(
            r.Id, r.OrderNo, r.Status, r.ServiceName, r.FinalSize ?? r.EstimatedSize, r.TotalPrice, r.CreatedAt));

        return Ok(new { total, page, pageSize, items });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id)
    {
        var detail = await LoadDetailAsync(id, UserId);
        return detail is null ? NotFound() : Ok(detail);   // ของคนอื่นก็ตอบ 404 ไม่บอกว่ามีอยู่
    }

    [HttpPost("{id:int}/cancel")]
    public async Task<IActionResult> Cancel(int id)
    {
        var userId = UserId;
        var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == id && o.CustomerId == userId);
        if (order is null) return NotFound();

        if (order.Status != OrderStatus.Pending)
            return Conflict(new { error = "ยกเลิกเองได้เฉพาะออเดอร์ที่ยังไม่มี Rider รับงาน" });

        var from = order.Status;
        order.Status = OrderStatus.Cancelled;
        db.OrderStatusHistories.Add(new OrderStatusHistory
        {
            OrderId = order.Id,
            FromStatus = from,
            ToStatus = OrderStatus.Cancelled,
            ChangedByUserId = userId,
            Note = "ลูกค้ายกเลิกออเดอร์",
        });

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            // Version (xmin) เปลี่ยน = มีคนแก้ออเดอร์นี้ตัดหน้า เช่น Rider เพิ่งกดรับงาน
            return Conflict(new { error = "สถานะออเดอร์เพิ่งเปลี่ยน (อาจมี Rider รับงานแล้ว) กรุณาโหลดหน้าใหม่" });
        }

        return Ok(await LoadDetailAsync(order.Id, userId));
    }

    async Task<OrderDetailDto?> LoadDetailAsync(int id, string userId)
    {
        var o = await db.Orders.AsNoTracking()
            .Include(x => x.ServiceType)
            .Include(x => x.Rider)
            .Include(x => x.PickupLocation)
            .Include(x => x.DeliveryLocation)
            .Include(x => x.Lines)
            .Include(x => x.StatusHistories)
            .Include(x => x.Images)
            .AsSplitQuery()
            .FirstOrDefaultAsync(x => x.Id == id && x.CustomerId == userId);   // ตรวจเจ้าของใน query เดียวกัน

        if (o is null) return null;

        return new OrderDetailDto(
            o.Id, o.OrderNo, o.Status, o.ServiceType.Name,
            o.EstimatedSize, o.FinalSize,
            o.DetergentSource, o.DetergentNote, o.CareNote,
            o.ServicePrice, o.DeliveryFee, o.ExtrasTotal, o.PlatformFee, o.TotalPrice,
            o.Rider?.FullName, o.CreatedAt,
            LocationDto.From(o.PickupLocation), LocationDto.From(o.DeliveryLocation),
            o.Lines.OrderBy(l => l.Id)
                .Select(l => new OrderLineDto(l.Type, l.Name, l.UnitPrice, l.Quantity, l.UnitPrice * l.Quantity))
                .ToList(),
            // Timeline ส่งแค่สถานะกับเวลา ไม่ส่งโน้ตภายใน
            o.StatusHistories.OrderBy(h => h.CreatedAt).ThenBy(h => h.Id)
                .Select(h => new StatusStepDto(h.FromStatus, h.ToStatus, h.CreatedAt))
                .ToList(),
            o.Images.OrderBy(i => i.Id).Select(i => new OrderImageDto(i.Id, i.Type, i.CreatedAt)).ToList());
    }

    static decimal ReadDecimal(Dictionary<string, string> settings, string key)
    {
        // ถ้าค่าตั้งไว้หายหรือผิดรูปแบบ ให้ล้มเลย ดีกว่าคิดราคาผิดแล้วขาดทุนเงียบๆ
        if (settings.TryGetValue(key, out var text) &&
            decimal.TryParse(text, NumberStyles.Number, CultureInfo.InvariantCulture, out var value) &&
            value >= 0)
            return value;

        throw new InvalidOperationException($"App setting '{key}' is missing or invalid");
    }

    static string NewOrderNo()
    {
        const string alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";   // ไม่มี I O 0 1 กันอ่านสลับ
        var suffix = new string(Enumerable.Range(0, 6)
            .Select(_ => alphabet[RandomNumberGenerator.GetInt32(alphabet.Length)]).ToArray());
        return $"WG-{DateTime.UtcNow:yyMMdd}-{suffix}";
    }
}