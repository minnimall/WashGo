using System.ComponentModel.DataAnnotations;

namespace WashGOApi.Models;

public class RegisterRequest
{
    [Required, MaxLength(100)] public string FullName { get; set; } = "";
    [Required, EmailAddress] public string Email { get; set; } = "";
    [Required, MinLength(8), MaxLength(100)] public string Password { get; set; } = "";
    [MaxLength(20)] public string? Phone { get; set; }
    [Required] public string Role { get; set; } = Roles.Customer;
}

public class LoginRequest
{
    [Required, EmailAddress] public string Email { get; set; } = "";
    [Required, MaxLength(100)] public string Password { get; set; } = "";
}

public record UserInfo(string Id, string FullName, string Email, string[] Roles);
public record AuthResponse(DateTime ExpiresAt, UserInfo User);