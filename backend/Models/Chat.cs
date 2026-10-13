using System.ComponentModel.DataAnnotations;

namespace WashGOApi.Models;

public enum ChatMessageType { Text, Image, Slip, System }   // Slip/System เผื่อฟีเจอร์ต่อไป

// 1 ออเดอร์ = 1 ห้องแชท สร้างตอนมีคนส่งข้อความแรก
public class ChatThread
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public Order Order { get; set; } = null!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastMessageAt { get; set; }

    public ICollection<ChatMessage> Messages { get; set; } = new List<ChatMessage>();
}

public class ChatMessage
{
    public int Id { get; set; }
    public int ThreadId { get; set; }
    public ChatThread Thread { get; set; } = null!;

    public string? SenderId { get; set; }          // null = ข้อความระบบ
    public ApplicationUser? Sender { get; set; }

    public ChatMessageType Type { get; set; }
    public string? Body { get; set; }
    public string? ImagePath { get; set; }         // เก็บเฉพาะ path (private bucket)

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReadAt { get; set; }
    public bool IsDeleted { get; set; }            // soft delete เท่านั้น
}

public class SendChatRequest
{
    [Required, MaxLength(1000)] public string Body { get; set; } = "";
}

// Sender = "Customer" | "Rider" | "System" (ไม่ส่ง id ผู้ใช้ออกไป)
public record ChatMessageDto(
    int Id, string Sender, ChatMessageType Type, string? Body, DateTime CreatedAt, DateTime? ReadAt);

public record ChatHistoryDto(bool CanSend, bool HasMore, List<ChatMessageDto> Messages);