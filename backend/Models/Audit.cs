namespace WashGOApi.Models;

public class AuditLog
{
    public long Id { get; set; }
    public string? ActorId { get; set; }
    public ApplicationUser? Actor { get; set; }
    public string Action { get; set; } = "";
    public string TargetType { get; set; } = "";
    public string? TargetId { get; set; }
    public string? Reason { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}