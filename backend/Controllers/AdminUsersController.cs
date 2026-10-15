using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WashGOApi.Data;
using WashGOApi.Models;
using WashGOApi.Services;

namespace WashGOApi.Controllers;

public class ReasonRequest
{
    [Required, MinLength(5), MaxLength(500)] public string Reason { get; set; } = "";
}

public record AdminUserDto(
    string Id, string FullName, string Email, string? Role,
    bool IsSuspended, string? SuspendedReason, DateTime? DeletedAt,
    RiderVerificationStatus? RiderStatus);

[ApiController]
[Route("api/admin/users")]
[Authorize(Roles = Roles.Admin)]
public class AdminUsersController(AppDbContext db, StorageService storage) : ControllerBase
{
    string AdminId => User.FindFirstValue("sub")!;

    // escape ตัวอักษรพิเศษของ LIKE กันผู้ใช้ใส่ % _ มาทำให้ค้นหาผิดความหมาย
    static string Like(string s) =>
        "%" + s.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_") + "%";

    void Audit(string action, string targetId, string reason) =>
        db.AuditLogs.Add(new AuditLog
        {
            ActorId = AdminId,
            Action = action,
            TargetType = "User",
            TargetId = targetId,
            Reason = reason,
        });

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? q, [FromQuery] string? role, [FromQuery] string? status)
    {
        var users = db.Users.AsNoTracking().AsQueryable();

        if (Input.Clean(q) is { } term)
        {
            if (term.Length > 100) term = term[..100];
            var pattern = Like(term);
            users = users.Where(u => EF.Functions.ILike(u.FullName, pattern) ||
                                     (u.Email != null && EF.Functions.ILike(u.Email, pattern)));
        }

        if (role is Roles.Customer or Roles.Rider or Roles.Admin)
            users = users.Where(u => db.UserRoles.Any(ur =>
                ur.UserId == u.Id && db.Roles.Any(r => r.Id == ur.RoleId && r.Name == role)));

        users = status switch
        {
            "active" => users.Where(u => !u.IsSuspended),
            "suspended" => users.Where(u => u.IsSuspended && u.DeletedAt == null),
            "deleted" => users.Where(u => u.DeletedAt != null),
            _ => users,
        };

        var rows = await users.OrderBy(u => u.Email).Take(50)
            .Select(u => new AdminUserDto(
                u.Id, u.FullName, u.Email ?? "",
                db.UserRoles.Where(ur => ur.UserId == u.Id)
                    .Join(db.Roles, ur => ur.RoleId, r => r.Id, (ur, r) => r.Name).FirstOrDefault(),
                u.IsSuspended, u.SuspendedReason, u.DeletedAt,
                u.RiderProfile != null ? (RiderVerificationStatus?)u.RiderProfile.VerificationStatus : null))
            .ToListAsync();

        return Ok(rows);
    }

    [HttpPost("{id}/suspend")]
    public async Task<IActionResult> Suspend(string id, ReasonRequest req)
    {
        var (user, error) = await FindTargetAsync(id);
        if (user is null) return error!;
        if (user.DeletedAt != null) return Conflict(new { error = "บัญชีนี้ถูกลบไปแล้ว" });

        var reason = Input.Clean(req.Reason);
        if (reason is null || reason.Length < 5) return BadRequest(new { error = "กรุณาระบุเหตุผลอย่างน้อย 5 ตัวอักษร" });

        user.IsSuspended = true;
        user.SuspendedReason = reason;
        user.SecurityStamp = Guid.NewGuid().ToString();   // token เดิมใช้ไม่ได้ทันที

        // Rider: ปิดรับงานทันที และนับงานค้างให้แอดมินรู้ว่าต้องย้ายงาน
        var affected = 0;
        var profile = await db.RiderProfiles.FirstOrDefaultAsync(r => r.UserId == id);
        if (profile is not null)
        {
            profile.IsAcceptingJobs = false;
            var active = JobFlow.ActiveStatuses;
            affected = await db.Orders.CountAsync(o => o.RiderId == id && active.Contains(o.Status));
        }

        Audit("SuspendUser", id, reason);
        await db.SaveChangesAsync();
        return Ok(new { affectedJobs = affected });
    }

    [HttpPost("{id}/unsuspend")]
    public async Task<IActionResult> Unsuspend(string id, ReasonRequest req)
    {
        var (user, error) = await FindTargetAsync(id);
        if (user is null) return error!;
        if (user.DeletedAt != null) return Conflict(new { error = "บัญชีที่ถูกลบกู้คืนไม่ได้" });
        if (!user.IsSuspended) return Conflict(new { error = "บัญชีนี้ไม่ได้ถูกระงับอยู่" });

        var reason = Input.Clean(req.Reason);
        if (reason is null || reason.Length < 5) return BadRequest(new { error = "กรุณาระบุเหตุผลอย่างน้อย 5 ตัวอักษร" });

        user.IsSuspended = false;
        user.SuspendedReason = null;   // Rider ต้องกดเปิดรับงานเองอีกครั้ง

        Audit("UnsuspendUser", id, reason);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id}/delete")]
    public async Task<IActionResult> Delete(string id, ReasonRequest req)
    {
        var (user, error) = await FindTargetAsync(id);
        if (user is null) return error!;
        if (user.DeletedAt != null) return Conflict(new { error = "บัญชีนี้ถูกลบไปแล้ว" });

        var reason = Input.Clean(req.Reason);
        if (reason is null || reason.Length < 5) return BadRequest(new { error = "กรุณาระบุเหตุผลอย่างน้อย 5 ตัวอักษร" });

        // ห้ามลบถ้ายังมีออเดอร์ที่ไม่จบ (ทั้งฝั่งลูกค้าและ Rider)
        OrderStatus[] final = [OrderStatus.Completed, OrderStatus.Cancelled];
        var busy = await db.Orders.AnyAsync(o =>
            (o.CustomerId == id || o.RiderId == id) && !final.Contains(o.Status));
        if (busy)
            return Conflict(new { error = "บัญชีนี้ยังมีออเดอร์ที่ไม่จบ กรุณายกเลิกหรือย้ายงานก่อน" });

        // ล้างข้อมูลส่วนตัว (เก็บแถวไว้ให้ประวัติออเดอร์/แชท/การชำระเงินอ้างอิงได้)
        var anon = $"deleted-{user.Id}@deleted.invalid";
        user.UserName = anon;
        user.NormalizedUserName = anon.ToUpperInvariant();
        user.Email = anon;
        user.NormalizedEmail = anon.ToUpperInvariant();
        user.EmailConfirmed = false;
        user.PhoneNumber = null;
        user.PhoneNumberConfirmed = false;
        user.PasswordHash = null;
        user.LockoutEnabled = true;
        user.LockoutEnd = DateTimeOffset.MaxValue;
        user.SecurityStamp = Guid.NewGuid().ToString();
        user.FullName = "ผู้ใช้ที่ถูกลบ";
        user.IsSuspended = true;
        user.SuspendedReason = "บัญชีถูกลบโดยผู้ดูแลระบบ";
        user.DeletedAt = DateTime.UtcNow;

        var files = new List<string>();
        var profile = await db.RiderProfiles.FirstOrDefaultAsync(r => r.UserId == id);
        if (profile is not null)
        {
            if (profile.IdCardImagePath is { } a) files.Add(a);
            if (profile.SelfieImagePath is { } b) files.Add(b);
            profile.LegalName = "";
            profile.NationalId = "";
            profile.IdCardImagePath = null;
            profile.SelfieImagePath = null;
            profile.Vehicle = null;
            profile.PromptPayId = null;
            profile.BankName = null;
            profile.BankAccountNo = null;
            profile.IsAcceptingJobs = false;
        }

        Audit("DeleteUser", id, reason);   // ไม่เก็บอีเมลเดิมไว้ใน log
        await db.SaveChangesAsync();

        // ลบไฟล์เอกสารหลังบันทึกฐานข้อมูลสำเร็จ (ถ้าลบไม่ได้ก็ไม่กระทบ ไฟล์จะกลายเป็นไฟล์กำพร้า)
        foreach (var path in files)
        {
            try { await storage.DeleteAsync(path); } catch { /* best-effort */ }
        }

        return NoContent();
    }

    // กันแอดมินทำรายการกับตัวเองหรือ Admin คนอื่น
    async Task<(ApplicationUser? User, IActionResult? Error)> FindTargetAsync(string id)
    {
        if (id == AdminId)
            return (null, BadRequest(new { error = "ไม่สามารถทำรายการกับบัญชีของตัวเองได้" }));

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user is null) return (null, NotFound());

        var isAdmin = await db.UserRoles.AnyAsync(ur =>
            ur.UserId == id && db.Roles.Any(r => r.Id == ur.RoleId && r.Name == Roles.Admin));
        if (isAdmin)
            return (null, StatusCode(StatusCodes.Status403Forbidden, new { error = "ไม่สามารถทำรายการกับบัญชี Admin ได้" }));

        return (user, null);
    }
}