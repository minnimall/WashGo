using System.ComponentModel.DataAnnotations;

namespace WashGOApi.Models;

public class Review
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public Order Order { get; set; } = null!;
    public string CustomerId { get; set; } = null!;
    public string RiderId { get; set; } = null!;
    public int Rating { get; set; }                 // 1-5
    [MaxLength(500)] public string? Comment { get; set; }
    public bool IsHidden { get; set; }              // แอดมินซ่อนได้ (ทำในรอบหลัง)
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public record SaveReviewRequest([Range(1, 5)] int Rating, [MaxLength(500)] string? Comment);
public record ReviewDto(int Rating, string? Comment, DateTime CreatedAt);