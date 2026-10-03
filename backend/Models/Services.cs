namespace WashGOApi.Models;

public class ServiceType
{
    public int Id { get; set; }
    public string Code { get; set; } = "";   // เช่น WASH_DRY, WASH_DRY_FOLD
    public string Name { get; set; } = "";
    public bool IsActive { get; set; } = true;

    public ICollection<ServicePrice> Prices { get; set; } = new List<ServicePrice>();
}

public class ServicePrice
{
    public int Id { get; set; }
    public int ServiceTypeId { get; set; }
    public ServiceType ServiceType { get; set; } = null!;
    public LaundrySize Size { get; set; }
    public decimal Price { get; set; }
}