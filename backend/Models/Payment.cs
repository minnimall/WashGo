using System.ComponentModel.DataAnnotations;

namespace WashGOApi.Models;

public class Payment
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public Order Order { get; set; } = null!;

    public PaymentMethod? Method { get; set; }
    public PaymentStatus Status { get; set; } = PaymentStatus.Unpaid;
    public decimal Amount { get; set; }          // snapshot จาก Order.TotalPrice ตอนเริ่มชำระ

    public int? SlipImageId { get; set; }        // สลิปล่าสุด (ประวัติทั้งหมดอยู่ใน OrderImages)
    public OrderImage? SlipImage { get; set; }
    public int SlipAttempts { get; set; }
    public string? RejectReason { get; set; }

    public string? ConfirmedByRiderId { get; set; }
    public ApplicationUser? ConfirmedBy { get; set; }
    public DateTime? ConfirmedAt { get; set; }

    public uint Version { get; set; }            // map ไป xmin กันแก้ซ้อนกัน
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class SlipForm
{
    public IFormFile? File { get; set; }
}

public class ConfirmPaymentRequest
{
    [Required] public PaymentMethod? Method { get; set; }
}

public record PayToDto(string RiderName, string? PromptPay);

public record PaymentViewDto(
    OrderStatus OrderStatus, PaymentStatus Status, PaymentMethod? Method, decimal Amount,
    int? SlipImageId, int AttemptsLeft, string? RejectReason, DateTime? ConfirmedAt,
    PayToDto? PayTo);