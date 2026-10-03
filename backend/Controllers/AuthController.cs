using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using WashGOApi.Data;
using WashGOApi.Models;
using WashGOApi.Services;

namespace WashGOApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(
    UserManager<ApplicationUser> users,
    AppDbContext db,
    JwtService jwt,
    IWebHostEnvironment env) : ControllerBase
{
    // สมัครเองได้แค่ Customer กับ Rider (Admin สร้างจาก seed เท่านั้น)
    static readonly string[] SelfRegisterRoles = [Roles.Customer, Roles.Rider];

    [HttpPost("register")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Register(RegisterRequest req)
    {
        if (!SelfRegisterRoles.Contains(req.Role))
            return BadRequest(new { error = "Role ต้องเป็น Customer หรือ Rider" });

        var user = new ApplicationUser
        {
            UserName = req.Email,
            Email = req.Email,
            FullName = req.FullName.Trim(),
            PhoneNumber = req.Phone,
        };

        var result = await users.CreateAsync(user, req.Password);
        if (!result.Succeeded)
            return BadRequest(new { errors = result.Errors.Select(e => e.Description) });

        await users.AddToRoleAsync(user, req.Role);

        if (req.Role == Roles.Rider)
        {
            // เริ่มที่สถานะ Registered ต้องส่งเอกสารและรอ Admin อนุมัติภายหลัง
            db.RiderProfiles.Add(new RiderProfile { UserId = user.Id, LegalName = user.FullName });
            await db.SaveChangesAsync();
        }

        return Ok(await SignInAsync(user));
    }

    [HttpPost("login")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Login(LoginRequest req)
    {
        // ข้อความเดียวกันทุกกรณี (ไม่มีอีเมล / รหัสผิด / ถูกล็อก) กันการเดาว่าอีเมลไหนมีในระบบ
        const string bad = "อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือบัญชีถูกล็อกชั่วคราว";

        var user = await users.FindByEmailAsync(req.Email);
        if (user is null)
        {
            // hash หลอก ให้ใช้เวลาใกล้เคียงกรณีที่มี user กันการเดาจากเวลาตอบกลับ
            users.PasswordHasher.HashPassword(new ApplicationUser(), req.Password);
            return Unauthorized(new { error = bad });
        }

        if (await users.IsLockedOutAsync(user))
            return Unauthorized(new { error = bad });

        if (!await users.CheckPasswordAsync(user, req.Password))
        {
            await users.AccessFailedAsync(user);
            return Unauthorized(new { error = bad });
        }

        if (user.IsSuspended)
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "บัญชีนี้ถูกระงับ" });

        await users.ResetAccessFailedCountAsync(user);
        return Ok(await SignInAsync(user));
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        Response.Cookies.Delete(JwtService.CookieName, CookieOpts());
        return NoContent();
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var id = User.FindFirstValue("sub");
        var user = id is null ? null : await users.FindByIdAsync(id);
        if (user is null || user.IsSuspended) return Unauthorized();

        var roles = await users.GetRolesAsync(user);
        return Ok(new UserInfo(user.Id, user.FullName, user.Email ?? "", roles.ToArray()));
    }

    // สร้าง token แล้วใส่ใน HttpOnly cookie (ไม่ส่ง token กลับใน JSON)
    async Task<AuthResponse> SignInAsync(ApplicationUser user)
    {
        var roles = await users.GetRolesAsync(user);
        var (token, expires) = jwt.Create(user, roles);
        Response.Cookies.Append(JwtService.CookieName, token, CookieOpts(expires));

        return new AuthResponse(expires,
            new UserInfo(user.Id, user.FullName, user.Email ?? "", roles.ToArray()));
    }

    CookieOptions CookieOpts(DateTime? expires = null) => new()
    {
        HttpOnly = true,                        // JavaScript อ่านไม่ได้
        Secure = !env.IsDevelopment(),          // production ส่งเฉพาะผ่าน HTTPS
        SameSite = SameSiteMode.Strict,         // ไม่ส่ง cookie เมื่อ request มาจากเว็บอื่น
        Path = "/",
        Expires = expires,
        IsEssential = true,
    };
}