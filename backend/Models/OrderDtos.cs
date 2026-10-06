using System.ComponentModel.DataAnnotations;

namespace WashGOApi.Models;

public static class Input
{
    // ตัดช่องว่าง ถ้าว่างให้เป็น null
    public static string? Clean(string? s)
    {
        var t = s?.Trim();
        return string.IsNullOrEmpty(t) ? null : t;
    }
}

public class LocationRequest
{
    [MaxLength(50)] public string? Label { get; set; }
    [Required, MaxLength(300)] public string Address { get; set; } = "";
    [MaxLength(100)] public string? Building { get; set; }
    [MaxLength(20)] public string? Floor { get; set; }
    [MaxLength(20)] public string? Room { get; set; }
    [MaxLength(200)] public string? Landmark { get; set; }
    [Range(-90, 90)] public double Latitude { get; set; }
    [Range(-180, 180)] public double Longitude { get; set; }
}

public record LocationDto(
    int Id, string? Label, string Address, string? Building,
    string? Floor, string? Room, string? Landmark, double Latitude, double Longitude)
{
    public static LocationDto From(Location l) =>
        new(l.Id, l.Label, l.Address, l.Building, l.Floor, l.Room, l.Landmark, l.Latitude, l.Longitude);
}

public class OrderExtraRequest
{
    public int CatalogItemId { get; set; }
    [Range(1, 20)] public int Quantity { get; set; } = 1;
}

// สังเกต: ไม่มีช่องราคาเลย ราคาทั้งหมดเซิร์ฟเวอร์คำนวณเอง
public class CreateOrderRequest
{
    public int ServiceTypeId { get; set; }
    public LaundrySize Size { get; set; }
    public int PickupLocationId { get; set; }
    public int DeliveryLocationId { get; set; }
    public DetergentSource DetergentSource { get; set; } = DetergentSource.Standard;
    [MaxLength(300)] public string? DetergentNote { get; set; }
    [MaxLength(500)] public string? CareNote { get; set; }
    public List<OrderExtraRequest>? Extras { get; set; }
    public bool AcceptDamageTerms { get; set; }
}

public record OrderLineDto(CatalogItemType Type, string Name, decimal UnitPrice, int Quantity, decimal LineTotal);

public record StatusStepDto(OrderStatus? From, OrderStatus To, DateTime At);

public record OrderSummaryDto(
    int Id, string OrderNo, OrderStatus Status, string ServiceName,
    LaundrySize Size, decimal TotalPrice, DateTime CreatedAt);

public record OrderDetailDto(
    int Id, string OrderNo, OrderStatus Status, string ServiceName,
    LaundrySize EstimatedSize, LaundrySize? FinalSize,
    DetergentSource DetergentSource, string? DetergentNote, string? CareNote,
    decimal ServicePrice, decimal DeliveryFee, decimal ExtrasTotal, decimal PlatformFee, decimal TotalPrice,
    string? RiderName, DateTime CreatedAt,
    LocationDto PickupLocation, LocationDto DeliveryLocation,
    List<OrderLineDto> Lines, List<StatusStepDto> Timeline, List<OrderImageDto> Images);