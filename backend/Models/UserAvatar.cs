namespace WashGOApi.Models;

public class UserAvatar
{
    public string UserId { get; set; } = null!;
    public ApplicationUser User { get; set; } = null!;
    public byte[] Data { get; set; } = [];
    public string ContentType { get; set; } = "image/jpeg";
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}