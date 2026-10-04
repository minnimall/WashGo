namespace WashGOApi.Models;

public class Order
{
    public int Id { get; set; }
    public string OrderNo { get; set; } = "";

    public string CustomerId { get; set; } = "";
    public ApplicationUser Customer { get; set; } = null!;
    public string? RiderId { get; set; }
    public ApplicationUser? Rider { get; set; }

    public int ServiceTypeId { get; set; }
    public ServiceType ServiceType { get; set; } = null!;

    public int PickupLocationId { get; set; }
    public Location PickupLocation { get; set; } = null!;
    public int DeliveryLocationId { get; set; }
    public Location DeliveryLocation { get; set; } = null!;

    public LaundrySize EstimatedSize { get; set; }
    public LaundrySize? FinalSize { get; set; }
    public DetergentSource DetergentSource { get; set; } = DetergentSource.Standard;
    public string? DetergentNote { get; set; }
    public string? CareNote { get; set; }

    public OrderStatus Status { get; set; } = OrderStatus.Pending;
    public uint Version { get; set; }   // map ไป xmin ของ Postgres กัน Rider รับงานซ้ำ

    // snapshot ราคา ณ ตอนสั่ง
    public decimal ServicePrice { get; set; }
    public decimal DeliveryFee { get; set; }
    public decimal ExtrasTotal { get; set; }
    public decimal PlatformFee { get; set; }
    public decimal TotalPrice { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<OrderLine> Lines { get; set; } = new List<OrderLine>();
    public ICollection<OrderImage> Images { get; set; } = new List<OrderImage>();
    public ICollection<OrderStatusHistory> StatusHistories { get; set; } = new List<OrderStatusHistory>();
}