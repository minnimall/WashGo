using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WashGOApi.Data;
using WashGOApi.Models;

namespace WashGOApi.Controllers;

[ApiController]
[Route("api/admin/pricing")]
[Authorize(Roles = Roles.Admin)]
public class AdminPricingController(AppDbContext db) : ControllerBase
{
    string AdminId => User.FindFirstValue("sub")!;

    public record DeliveryFeeRequest([Range(0, 5000)] decimal Value);
    public record SizePriceRequest([Required, MaxLength(20)] string Size, [Range(0, 100000)] decimal Price);
    public record ServiceUpdateRequest(bool IsActive, [Required, MaxLength(10)] List<SizePriceRequest> Prices);
    public record ItemCreateRequest([Required, MaxLength(30)] string Type, [Required, MaxLength(100)] string Name, [Range(0, 100000)] decimal Price);
    public record ItemUpdateRequest([Required, MaxLength(100)] string Name, [Range(0, 100000)] decimal Price, bool IsActive);

    static decimal Money(decimal v) => Math.Round(v, 2, MidpointRounding.AwayFromZero);

    void Audit(string action, string targetType, string targetId, string detail) =>
        db.AuditLogs.Add(new AuditLog
        {
            ActorId = AdminId,
            Action = action,
            TargetType = targetType,
            TargetId = targetId,
            Reason = detail.Length > 500 ? detail[..500] : detail,
            CreatedAt = DateTime.UtcNow,
        });

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var feeText = await db.AppSettings.AsNoTracking()
            .Where(s => s.Key == AppSettingKeys.DeliveryFee)
            .Select(s => s.Value).FirstOrDefaultAsync();
        decimal.TryParse(feeText, NumberStyles.Number, CultureInfo.InvariantCulture, out var fee);

        var services = await db.ServiceTypes.AsNoTracking().OrderBy(s => s.Id)
            .Select(s => new { s.Id, s.Name, s.IsActive, Prices = s.Prices.Select(p => new { p.Size, p.Price }).ToList() })
            .ToListAsync();

        var items = await db.CatalogItems.AsNoTracking()
            .OrderBy(c => c.Type).ThenBy(c => c.Name)
            .Select(c => new { c.Id, c.Type, c.Name, c.Price, c.IsActive })
            .ToListAsync();

        return Ok(new
        {
            deliveryFee = fee,
            services = services.Select(s => new
            {
                s.Id, s.Name, s.IsActive,
                prices = s.Prices.OrderBy(p => p.Size).Select(p => new { size = p.Size.ToString(), p.Price }),
            }),
            items = items.Select(c => new { c.Id, type = c.Type.ToString(), c.Name, c.Price, c.IsActive }),
        });
    }

    [HttpPut("delivery-fee")]
    public async Task<IActionResult> SetDeliveryFee(DeliveryFeeRequest req)
    {
        var value = Money(req.Value);
        var text = value.ToString("0.##", CultureInfo.InvariantCulture);

        var row = await db.AppSettings.FirstOrDefaultAsync(s => s.Key == AppSettingKeys.DeliveryFee);
        var old = row?.Value ?? "-";
        if (row is null) db.AppSettings.Add(new AppSetting { Key = AppSettingKeys.DeliveryFee, Value = text });
        else row.Value = text;

        Audit("SetDeliveryFee", "Setting", AppSettingKeys.DeliveryFee, $"ค่าส่ง {old} → {text}");
        await db.SaveChangesAsync();
        return Ok(new { deliveryFee = value });
    }

    [HttpPut("services/{id:int}")]
    public async Task<IActionResult> UpdateService(int id, ServiceUpdateRequest req)
    {
        var svc = await db.ServiceTypes.Include(s => s.Prices).FirstOrDefaultAsync(s => s.Id == id);
        if (svc is null) return NotFound();

        var changes = new List<string>();
        foreach (var r in req.Prices)
        {
            var p = svc.Prices.FirstOrDefault(x => x.Size.ToString() == r.Size);
            if (p is null) return BadRequest(new { error = $"ไม่พบไซส์ {r.Size}" });

            var price = Money(r.Price);
            if (p.Price != price)
            {
                changes.Add($"{r.Size} {p.Price:0.##}→{price:0.##}");
                p.Price = price;
            }
        }
        if (svc.IsActive != req.IsActive)
        {
            changes.Add(req.IsActive ? "เปิดให้บริการ" : "ปิดให้บริการ");
            svc.IsActive = req.IsActive;
        }

        if (changes.Count > 0)
        {
            Audit("UpdateService", "Service", svc.Id.ToString(), $"{svc.Name}: {string.Join(", ", changes)}");
            await db.SaveChangesAsync();
        }
        return Ok();
    }

    [HttpPost("items")]
    public async Task<IActionResult> CreateItem(ItemCreateRequest req)
    {
        if (!Enum.TryParse<CatalogItemType>(req.Type, true, out var type) || !Enum.IsDefined(type))
            return BadRequest(new { error = "ประเภทรายการไม่ถูกต้อง" });

        var name = Input.Clean(req.Name);
        if (string.IsNullOrWhiteSpace(name))
            return BadRequest(new { error = "กรุณากรอกชื่อรายการ" });
        if (await db.CatalogItems.AnyAsync(c => c.Type == type && c.Name == name))
            return Conflict(new { error = "มีรายการชื่อนี้อยู่แล้ว" });

        var item = new CatalogItem { Type = type, Name = name, Price = Money(req.Price), IsActive = true };
        db.CatalogItems.Add(item);
        await db.SaveChangesAsync();   // ได้ Id ก่อนเขียน audit

        Audit("CreateCatalogItem", "CatalogItem", item.Id.ToString(), $"เพิ่ม {name} ราคา {item.Price:0.##}");
        await db.SaveChangesAsync();
        return StatusCode(StatusCodes.Status201Created, new { item.Id });
    }

    [HttpPut("items/{id:int}")]
    public async Task<IActionResult> UpdateItem(int id, ItemUpdateRequest req)
    {
        var item = await db.CatalogItems.FirstOrDefaultAsync(c => c.Id == id);
        if (item is null) return NotFound();

        var name = Input.Clean(req.Name);
        if (string.IsNullOrWhiteSpace(name))
            return BadRequest(new { error = "กรุณากรอกชื่อรายการ" });
        if (await db.CatalogItems.AnyAsync(c => c.Id != id && c.Type == item.Type && c.Name == name))
            return Conflict(new { error = "มีรายการชื่อนี้อยู่แล้ว" });

        var price = Money(req.Price);
        var detail = $"{item.Name} → {name}, ราคา {item.Price:0.##}→{price:0.##}, " +
                     $"{(item.IsActive ? "เปิด" : "ปิด")}→{(req.IsActive ? "เปิด" : "ปิด")}";

        item.Name = name;
        item.Price = price;
        item.IsActive = req.IsActive;

        Audit("UpdateCatalogItem", "CatalogItem", item.Id.ToString(), detail);
        await db.SaveChangesAsync();
        return Ok();
    }
}