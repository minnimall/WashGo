using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WashGOApi.Data;
using WashGOApi.Models;
using WashGOApi.Services;

namespace WashGOApi.Controllers;

[ApiController]
[Route("api/admin/riders")]
[Authorize(Roles = Roles.Admin)]
public class AdminRidersController(AppDbContext db, PiiProtector pii, StorageService storage) : ControllerBase
{
    string AdminId => User.FindFirstValue("sub")!;

    void Audit(string action, string targetId, string? reason = null) =>
        db.AuditLogs.Add(new AuditLog
        {
            ActorId = AdminId,
            Action = action,
            TargetType = "RiderProfile",
            TargetId = targetId,
            Reason = reason,
        });

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] RiderVerificationStatus status = RiderVerificationStatus.PendingReview)
    {
        var rows = await db.RiderProfiles.AsNoTracking()
            .Where(r => r.VerificationStatus == status)
            .OrderBy(r => r.SubmittedAt).Take(100)
            .Select(r => new AdminRiderListItemDto(
                r.UserId, r.User.FullName, r.User.Email ?? "", r.VerificationStatus, r.Vehicle, r.SubmittedAt))
            .ToListAsync();

        return Ok(rows);
    }

    // เปิดดูข้อมูลส่วนบุคคล (ถอดรหัสเลขบัตร) ทุกครั้งบันทึก AuditLog
    [HttpGet("{userId}")]
    public async Task<IActionResult> Detail(string userId)
    {
        var p = await db.RiderProfiles.AsNoTracking().Include(r => r.User)
            .FirstOrDefaultAsync(r => r.UserId == userId);
        if (p is null) return NotFound();

        Audit("ViewRiderProfile", userId);
        await db.SaveChangesAsync();

        return Ok(new AdminRiderDetailDto(
            p.UserId, p.User.FullName, p.User.Email ?? "", p.User.PhoneNumber, p.LegalName,
            string.IsNullOrEmpty(p.NationalId) ? null : pii.Unprotect(p.NationalId),
            string.IsNullOrEmpty(p.PromptPayId) ? null : pii.Unprotect(p.PromptPayId),
            p.Vehicle, p.VerificationStatus, p.RejectReason, p.SubmittedAt, p.ReviewedAt,
            p.IdCardImagePath is not null, p.SelfieImagePath is not null));
    }

    // kind = idcard | selfie
    [HttpGet("{userId}/documents/{kind}")]
    public async Task<IActionResult> Document(string userId, string kind)
    {
        var paths = await db.RiderProfiles.AsNoTracking()
            .Where(r => r.UserId == userId)
            .Select(r => new { r.IdCardImagePath, r.SelfieImagePath })
            .FirstOrDefaultAsync();

        var path = kind switch
        {
            "idcard" => paths?.IdCardImagePath,
            "selfie" => paths?.SelfieImagePath,
            _ => null,
        };
        if (path is null) return NotFound();

        var data = await storage.DownloadAsync(path);
        if (data is null) return NotFound();

        Audit("ViewRiderDocument", userId, kind);
        await db.SaveChangesAsync();

        return File(data, ImageValidator.ContentTypeOf(path));
    }

    [HttpPost("{userId}/approve")]
    public Task<IActionResult> Approve(string userId) =>
        Review(userId, RiderVerificationStatus.Approved, "ApproveRider", null);

    [HttpPost("{userId}/reject")]
    public Task<IActionResult> Reject(string userId, ReasonRequest req) =>
        Review(userId, RiderVerificationStatus.Rejected, "RejectRider", req.Reason.Trim());

    async Task<IActionResult> Review(string userId, RiderVerificationStatus target, string action, string? reason)
    {
        var p = await db.RiderProfiles.FirstOrDefaultAsync(r => r.UserId == userId);
        if (p is null) return NotFound();

        if (p.VerificationStatus != RiderVerificationStatus.PendingReview)
            return Conflict(new { error = "รายการนี้ไม่ได้อยู่ในสถานะรอตรวจสอบ (อาจมี Admin คนอื่นตรวจไปแล้ว)" });

        p.VerificationStatus = target;
        p.ReviewedAt = DateTime.UtcNow;
        p.RejectReason = reason;          // approve = null
        p.IsAcceptingJobs = false;        // ให้ Rider เปิดรับงานเองหลังอนุมัติ

        Audit(action, userId, reason);
        await db.SaveChangesAsync();
        return NoContent();
    }
}