using Microsoft.AspNetCore.Identity;

namespace WashGOApi.Models;

// Email, PhoneNumber, Id มีใน IdentityUser อยู่แล้ว
public class ApplicationUser : IdentityUser
{
    public string FullName { get; set; } = "";
    public bool IsSuspended { get; set; }
    public string? SuspendedReason { get; set; }

    public RiderProfile? RiderProfile { get; set; }
}

public class RiderProfile
{
    public string UserId { get; set; } = "";   // PK + FK
    public ApplicationUser User { get; set; } = null!;

    public string LegalName { get; set; } = "";
    public string NationalId { get; set; } = "";
    public string? IdCardImagePath { get; set; }   // เก็บเฉพาะ path (private bucket)
    public string? SelfieImagePath { get; set; }
    public string? Vehicle { get; set; }
    public string? PromptPayId { get; set; }
    public string? BankName { get; set; }
    public string? BankAccountNo { get; set; }

    public RiderVerificationStatus VerificationStatus { get; set; } = RiderVerificationStatus.Registered;
    public bool IsAcceptingJobs { get; set; }
    public decimal Rating { get; set; }
}

public class Location
{
    public int Id { get; set; }
    public string UserId { get; set; } = "";
    public ApplicationUser User { get; set; } = null!;

    public string? Label { get; set; }
    public bool IsSaved { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string Address { get; set; } = "";
    public string? Building { get; set; }
    public string? Floor { get; set; }
    public string? Room { get; set; }
    public string? Landmark { get; set; }
    public string? ImagePath { get; set; }
}