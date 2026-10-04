using System.Globalization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WashGOApi.Data;
using WashGOApi.Models;

namespace WashGOApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CatalogController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var serviceTypes = await db.ServiceTypes.AsNoTracking()
            .Include(s => s.Prices).Where(s => s.IsActive).ToListAsync();
        var items = await db.CatalogItems.AsNoTracking()
            .Where(c => c.IsActive).OrderBy(c => c.Id).ToListAsync();
        var feeText = await db.AppSettings.AsNoTracking()
            .Where(s => s.Key == AppSettingKeys.DeliveryFee)
            .Select(s => s.Value).FirstOrDefaultAsync();

        decimal.TryParse(feeText, NumberStyles.Number, CultureInfo.InvariantCulture, out var deliveryFee);

        // ส่งเฉพาะ DTO ไม่ส่ง Entity ตรงๆ
        return Ok(new
        {
            services = serviceTypes.Select(s => new
            {
                s.Id, s.Code, s.Name,
                prices = s.Prices.OrderBy(p => p.Size)
                    .Select(p => new { size = p.Size.ToString(), p.Price }),
            }),
            items = items.Select(c => new { c.Id, type = c.Type.ToString(), c.Name, c.Price }),
            deliveryFee,
        });
    }
}