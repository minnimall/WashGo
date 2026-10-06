using System.ComponentModel.DataAnnotations;

namespace WashGOApi.Models;

public class SubmitVerificationForm
{
    [Required, MaxLength(100)] public string LegalName { get; set; } = "";
    [Required, MaxLength(30)] public string NationalId { get; set; } = "";
    [Required, MaxLength(100)] public string Vehicle { get; set; } = "";
    [MaxLength(30)] public string? PromptPayId { get; set; }
    public IFormFile? IdCard { get; set; }
    public IFormFile? Selfie { get; set; }
}

public class OrderImageForm
{
    [Required] public OrderImageType? Type { get; set; }
    public IFormFile? File { get; set; }
}

public class ReasonRequest
{
    [Required, MaxLength(300)] public string Reason { get; set; } = "";
}

public class AvailabilityRequest { public bool IsAccepting { get; set; } }
public class ChangeStatusRequest { public OrderStatus ToStatus { get; set; } }

public record OrderImageDto(int Id, OrderImageType Type, DateTime CreatedAt);

public record RiderMeDto(
    RiderVerificationStatus Status, string? RejectReason, bool IsAcceptingJobs,
    string LegalName, string? Vehicle, string? NationalIdMasked,
    bool HasIdCard, bool HasSelfie, DateTime? SubmittedAt);

// ก่อนรับงานเห็นแค่ระยะห่าง ไม่เห็นที่อยู่ลูกค้า
public record AvailableJobDto(
    int Id, string OrderNo, string ServiceName, LaundrySize Size, decimal TotalPrice,
    int ExtraItems, DetergentSource DetergentSource, double? DistanceKm, DateTime CreatedAt);

public record RiderJobSummaryDto(
    int Id, string OrderNo, OrderStatus Status, string ServiceName, LaundrySize Size,
    decimal TotalPrice, string PickupAddress, string DeliveryAddress, DateTime CreatedAt);

public record NextStepDto(OrderStatus Status, OrderImageType? RequiredImage, bool RequiredImageDone);

public record RiderJobDetailDto(
    int Id, string OrderNo, OrderStatus Status, string ServiceName,
    LaundrySize EstimatedSize, LaundrySize? FinalSize,
    DetergentSource DetergentSource, string? DetergentNote, string? CareNote,
    decimal TotalPrice, string CustomerName, string? CustomerPhone, DateTime CreatedAt,
    LocationDto PickupLocation, LocationDto DeliveryLocation,
    List<OrderLineDto> Lines, List<StatusStepDto> Timeline, List<OrderImageDto> Images,
    NextStepDto? Next, bool CanRelease);

public record AdminRiderListItemDto(
    string UserId, string FullName, string Email, RiderVerificationStatus Status,
    string? Vehicle, DateTime? SubmittedAt);

public record AdminRiderDetailDto(
    string UserId, string FullName, string Email, string? Phone, string LegalName,
    string? NationalId, string? PromptPayId, string? Vehicle,
    RiderVerificationStatus Status, string? RejectReason,
    DateTime? SubmittedAt, DateTime? ReviewedAt, bool HasIdCard, bool HasSelfie);