namespace WashGOApi.Models;

public static class JobFlow
{
    public const int MaxActiveJobs = 3;

    // งานที่ยังไม่จบ (ใช้แยกแท็บ และแสดงเบอร์ลูกค้า)
    public static readonly OrderStatus[] ActiveStatuses =
    [
        OrderStatus.Accepted, OrderStatus.GoingToPickup, OrderStatus.PickedUp,
        OrderStatus.AwaitingPriceConfirmation, OrderStatus.Washing,
        OrderStatus.WashingCompleted, OrderStatus.Delivering, OrderStatus.Delivered,
    ];

    // งานที่นับเข้าโควต้า 3 งาน (ไม่นับ Delivered เพราะรอลูกค้าชำระเงิน ซึ่งยังไม่ได้ทำ)
    public static readonly OrderStatus[] LimitStatuses =
    [
        OrderStatus.Accepted, OrderStatus.GoingToPickup, OrderStatus.PickedUp,
        OrderStatus.AwaitingPriceConfirmation, OrderStatus.Washing,
        OrderStatus.WashingCompleted, OrderStatus.Delivering,
    ];

    // สถานะปัจจุบัน → (สถานะถัดไปที่ Rider กดได้, รูปที่ต้องมีก่อนกด)
    public static readonly Dictionary<OrderStatus, (OrderStatus Next, OrderImageType? RequiredImage)> Steps = new()
    {
        [OrderStatus.Accepted] = (OrderStatus.GoingToPickup, null),
        [OrderStatus.GoingToPickup] = (OrderStatus.PickedUp, OrderImageType.PickupLaundry),
        [OrderStatus.PickedUp] = (OrderStatus.Washing, OrderImageType.WashReceipt),
        [OrderStatus.Washing] = (OrderStatus.WashingCompleted, null),
        [OrderStatus.WashingCompleted] = (OrderStatus.Delivering, null),
        [OrderStatus.Delivering] = (OrderStatus.Delivered, OrderImageType.Delivery),
    };

    // รูปแต่ละชนิดอัปโหลดได้ตอนสถานะไหนบ้าง
    public static readonly Dictionary<OrderImageType, OrderStatus[]> ImageAllowedAt = new()
    {
        [OrderImageType.PickupLaundry] = [OrderStatus.GoingToPickup, OrderStatus.PickedUp],
        [OrderImageType.Detergent] = [OrderStatus.GoingToPickup, OrderStatus.PickedUp],
        [OrderImageType.SizeAdjust] = [OrderStatus.GoingToPickup, OrderStatus.PickedUp],
        [OrderImageType.WashReceipt] = [OrderStatus.PickedUp, OrderStatus.Washing],
        [OrderImageType.Delivery] = [OrderStatus.Delivering, OrderStatus.Delivered],
        [OrderImageType.PaymentSlip] = [],   // อัปโหลดผ่าน PaymentsController โดยลูกค้าเท่านั้น
        [OrderImageType.CustomerLaundry] = [],   // อัปโหลดผ่าน OrderPhotosController โดยลูกค้าเท่านั้น
    };

    public static readonly Dictionary<OrderImageType, string> ImageLabels = new()
    {
        [OrderImageType.PickupLaundry] = "รูปผ้าตอนรับ",
        [OrderImageType.Detergent] = "รูปน้ำยา",
        [OrderImageType.SizeAdjust] = "รูปปรับไซส์",
        [OrderImageType.WashReceipt] = "รูปใบรับซัก",
        [OrderImageType.Delivery] = "รูปผ้าที่ส่งมอบ",
        [OrderImageType.PaymentSlip] = "สลิปโอนเงิน",
        [OrderImageType.CustomerLaundry] = "รูปผ้าจากลูกค้า",
    };
}