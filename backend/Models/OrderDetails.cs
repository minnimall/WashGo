namespace WashGOApi.Models;

public static class AppSettingKeys
{
    public const string DeliveryFee = "DeliveryFee";
    public const string PlatformFeePercent = "PlatformFeePercent";
}

public class CatalogItem
{
    public int Id { get; set; }
    public CatalogItemType Type { get; set; }
    public string Name { get; set; } = "";
    public decimal Price { get; set; }
    public bool IsActive { get; set; } = true;
}

public class AppSetting
{
    public string Key { get; set; } = "";
    public string Value { get; set; } = "";
}

// ชื่อกับราคาต่อหน่วยเป็น snapshot ณ ตอนสั่ง ปรับราคาในแคตตาล็อกทีหลังไม่กระทบ Order เก่า
public class OrderLine
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public Order Order { get; set; } = null!;

    public int? CatalogItemId { get; set; }
    public CatalogItem? CatalogItem { get; set; }

    public CatalogItemType Type { get; set; }
    public string Name { get; set; } = "";
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; } = 1;
}

public class OrderImage
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public Order Order { get; set; } = null!;

    public OrderImageType Type { get; set; }
    public string ImagePath { get; set; } = "";   // เก็บเฉพาะ path (private bucket)

    public string UploadedByUserId { get; set; } = "";
    public ApplicationUser UploadedBy { get; set; } = null!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class OrderStatusHistory
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public Order Order { get; set; } = null!;

    public OrderStatus? FromStatus { get; set; }   // null = สร้าง Order ครั้งแรก
    public OrderStatus ToStatus { get; set; }

    public string? ChangedByUserId { get; set; }   // null = ระบบเปลี่ยนเอง
    public ApplicationUser? ChangedBy { get; set; }
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}