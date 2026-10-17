using System.ComponentModel.DataAnnotations;

namespace WashGOApi.Models;

public record EmailRequest(
    [Required, EmailAddress, MaxLength(254)] string Email);

public record ConfirmEmailRequest(
    [Required, MaxLength(100)] string UserId,
    [Required, MaxLength(2000)] string Token);

public record ResetPasswordRequest(
    [Required, MaxLength(100)] string UserId,
    [Required, MaxLength(2000)] string Token,
    [Required, MinLength(8), MaxLength(100)] string NewPassword);

public record GoogleLoginRequest(
    [Required, MaxLength(5000)] string Credential);