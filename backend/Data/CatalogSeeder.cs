using Microsoft.EntityFrameworkCore;
using WashGOApi.Models;

namespace WashGOApi.Data;

public static class CatalogSeeder
{
    // ใส่เฉพาะตอนตารางว่าง ราคาที่ Admin ปรับภายหลังจะไม่ถูกเขียนทับตอนแอปรีสตาร์ต
    public static async Task SeedAsync(AppDbContext db)
    {
        if (!await db.ServiceTypes.AnyAsync())
        {
            db.ServiceTypes.AddRange(
                new ServiceType { Code = "WASH_DRY", Name = "ซัก+อบ", Prices = Prices(80, 150, 220) },
                new ServiceType { Code = "WASH_DRY_FOLD", Name = "ซัก+อบ+พับ", Prices = Prices(100, 180, 260) });
        }

        if (!await db.CatalogItems.AnyAsync())
        {
            db.CatalogItems.AddRange(
                new CatalogItem { Type = CatalogItemType.Item, Name = "ผ้านวม", Price = 120 },
                new CatalogItem { Type = CatalogItemType.Item, Name = "ผ้าปู", Price = 60 },
                new CatalogItem { Type = CatalogItemType.AddOn, Name = "ปรับผ้านุ่ม", Price = 10 });
        }

        var defaults = new Dictionary<string, string>
        {
            [AppSettingKeys.DeliveryFee] = "40",
            [AppSettingKeys.PlatformFeePercent] = "0",
        };
        var existing = await db.AppSettings.Select(s => s.Key).ToListAsync();
        foreach (var (key, value) in defaults)
            if (!existing.Contains(key))
                db.AppSettings.Add(new AppSetting { Key = key, Value = value });

        await db.SaveChangesAsync();
    }

    static List<ServicePrice> Prices(decimal s, decimal m, decimal l) =>
    [
        new() { Size = LaundrySize.S, Price = s },
        new() { Size = LaundrySize.M, Price = m },
        new() { Size = LaundrySize.L, Price = l },
    ];
}