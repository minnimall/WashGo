using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using WashGOApi.Data;
using WashGOApi.Models;

namespace WashGOApi.Controllers;

[ApiController]
[Authorize]
[Route("api/profile")]
public class ProfileController(AppDbContext db) : ControllerBase
{
    const int MaxAvatarBytes = 100 * 1024;

    string UserId => User.FindFirstValue("sub")!;

    public record UpdateProfileRequest([Required, MinLength(2), MaxLength(100)] string FullName);

    // ใช้เป็นตัวต่อท้าย URL (?v=) เพื่อให้เบราว์เซอร์โหลดรูปใหม่เมื่ออัปโหลดแล้วเท่านั้น
    static long? Version(DateTime? d) =>
        d is null ? null : new DateTimeOffset(DateTime.SpecifyKind(d.Value, DateTimeKind.Utc)).ToUnixTimeMilliseconds();

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var userId = UserId;

        var u = await db.Users.AsNoTracking()
            .Where(x => x.Id == userId)
            .Select(x => new
            {
                x.FullName,
                x.Email,
                x.PhoneNumber,
                Orders = db.Orders.Count(o => o.CustomerId == userId),
                Completed = db.Orders.Count(o => o.CustomerId == userId && o.Status == OrderStatus.Completed),
                Locations = db.Locations.Count(l => l.UserId == userId && l.IsSaved),
                AvatarAt = db.UserAvatars.Where(a => a.UserId == userId)
                    .Select(a => (DateTime?)a.UpdatedAt).FirstOrDefault(),
            })
            .FirstOrDefaultAsync();

        if (u is null) return NotFound();

        return Ok(new
        {
            fullName = u.FullName,
            email = u.Email,
            phone = u.PhoneNumber,
            isCustomer = User.IsInRole(Roles.Customer),
            orders = u.Orders,
            completed = u.Completed,
            locations = u.Locations,
            avatarVersion = Version(u.AvatarAt),
        });
    }

    [HttpPut]
    public async Task<IActionResult> Update(UpdateProfileRequest req)
    {
        var name = Input.Clean(req.FullName);
        if (string.IsNullOrWhiteSpace(name) || name.Length < 2)
            return BadRequest(new { error = "กรุณากรอกชื่ออย่างน้อย 2 ตัวอักษร" });

        var userId = UserId;
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return NotFound();

        user.FullName = name;
        await db.SaveChangesAsync();
        return await Get();
    }

    [HttpGet("avatar")]
    public async Task<IActionResult> GetAvatar()
    {
        var userId = UserId;
        var a = await db.UserAvatars.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == userId);
        if (a is null) return NotFound();

        Response.Headers.CacheControl = "private, max-age=86400";   // URL มี ?v= เปลี่ยนเมื่ออัปโหลดใหม่
        Response.Headers.XContentTypeOptions = "nosniff";
        return File(a.Data, a.ContentType);
    }

    [HttpPost("avatar")]
    [EnableRateLimiting("upload")]
    [RequestSizeLimit(200_000)]
    public async Task<IActionResult> UploadAvatar(IFormFile file)
    {
        if (file is null || file.Length == 0 || file.Length > MaxAvatarBytes)
            return BadRequest(new { error = "ไฟล์รูปต้องมีขนาดไม่เกิน 100 KB" });

        var data = new byte[file.Length];
        await using (var s = file.OpenReadStream())
            await s.ReadExactlyAsync(data);

        var type = DetectImage(data);
        if (type is null)
            return BadRequest(new { error = "รองรับเฉพาะไฟล์ JPG, PNG หรือ WebP" });

        var userId = UserId;
        var now = DateTime.UtcNow;
        var row = await db.UserAvatars.FirstOrDefaultAsync(a => a.UserId == userId);
        if (row is null)
            db.UserAvatars.Add(new UserAvatar { UserId = userId, Data = data, ContentType = type, UpdatedAt = now });
        else
        {
            row.Data = data;
            row.ContentType = type;
            row.UpdatedAt = now;
        }

        await db.SaveChangesAsync();
        return Ok(new { avatarVersion = Version(now) });
    }

    [HttpDelete("avatar")]
    public async Task<IActionResult> DeleteAvatar()
    {
        var userId = UserId;
        await db.UserAvatars.Where(a => a.UserId == userId).ExecuteDeleteAsync();
        return NoContent();
    }

    // ตรวจชนิดไฟล์จากไบต์แรกๆ ไม่เชื่อค่าที่ client ส่งมา
    static string? DetectImage(byte[] b)
    {
        if (b.Length < 12) return null;
        if (b[0] == 0xFF && b[1] == 0xD8 && b[2] == 0xFF) return "image/jpeg";
        if (b[0] == 0x89 && b[1] == 0x50 && b[2] == 0x4E && b[3] == 0x47) return "image/png";
        if (b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F' &&
            b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') return "image/webp";
        return null;
    }
}