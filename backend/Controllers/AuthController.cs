using System.Security.Claims;
using System.Text;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Caching.Memory;
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
    IWebHostEnvironment env,
    IConfiguration config,
    IMemoryCache cache,
    EmailService mailer,
    ILogger<AuthController> log) : ControllerBase
{
    // สมัครเองได้แค่ Customer กับ Rider (Admin สร้างจาก seed เท่านั้น)
    static readonly string[] SelfRegisterRoles = [Roles.Customer, Roles.Rider];
    const string InvalidLink = "ลิงก์ไม่ถูกต้องหรือหมดอายุ กรุณาขอลิงก์ใหม่";

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

        // ยังไม่ล็อกอินให้: ต้องยืนยันอีเมลก่อน
        await SendConfirmationAsync(user);
        return Ok(new { needsVerification = true, email = user.Email });
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

        // เช็คหลังรหัสผ่านถูกเท่านั้น คนเดาอีเมลจะไม่รู้ว่าอีเมลนี้มีในระบบ
        if (!user.EmailConfirmed)
            return StatusCode(StatusCodes.Status403Forbidden,
                new { error = "กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ", code = "EMAIL_NOT_CONFIRMED" });

        return Ok(await SignInAsync(user));
    }

    // เข้าสู่ระบบด้วย Google: หน้าเว็บส่ง ID token (credential) มา backend ตรวจลายเซ็น/aud/อายุเอง
    [HttpPost("google")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Google(GoogleLoginRequest req)
    {
        GoogleJsonWebSignature.Payload g;
        try
        {
            g = await GoogleJsonWebSignature.ValidateAsync(req.Credential,
                new GoogleJsonWebSignature.ValidationSettings
                {
                    Audience = [config["Google:ClientId"]!],
                });
        }
        catch (InvalidJwtException)
        {
            return Unauthorized(new { error = "เข้าสู่ระบบด้วย Google ไม่สำเร็จ" });
        }

        if (!g.EmailVerified || string.IsNullOrWhiteSpace(g.Email))
            return Unauthorized(new { error = "อีเมล Google นี้ยังไม่ได้รับการยืนยัน" });

        var user = await users.FindByLoginAsync("Google", g.Subject);
        if (user is null)
        {
            user = await users.FindByEmailAsync(g.Email);

            if (user is null)
            {
                // บัญชีใหม่จาก Google เป็น Customer เสมอ (Rider ต้องสมัครด้วยอีเมลเพื่อผ่านการตรวจสอบ)
                var name = (g.Name ?? g.Email.Split('@')[0]).Trim();
                if (name.Length > 100) name = name[..100];

                user = new ApplicationUser
                {
                    UserName = g.Email,
                    Email = g.Email,
                    EmailConfirmed = true,
                    FullName = name,
                };
                var created = await users.CreateAsync(user);
                if (!created.Succeeded)
                    return BadRequest(new { errors = created.Errors.Select(e => e.Description) });
                await users.AddToRoleAsync(user, Roles.Customer);
            }
            else if (!user.EmailConfirmed)
            {
                // กัน pre-hijack: ถ้ามีคนสมัครด้วยอีเมลของเหยื่อไว้ก่อนโดยยังไม่ยืนยัน
                // ต้องลบรหัสผ่านที่คนนั้นตั้งไว้ทิ้ง (RemovePassword เปลี่ยน security stamp ให้ด้วย)
                await users.RemovePasswordAsync(user);
                user.EmailConfirmed = true;
                await users.UpdateAsync(user);
            }

            var linked = await users.AddLoginAsync(user, new UserLoginInfo("Google", g.Subject, "Google"));
            if (!linked.Succeeded)
                return BadRequest(new { errors = linked.Errors.Select(e => e.Description) });
        }

        if (user.IsSuspended)
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "บัญชีนี้ถูกระงับ" });

        return Ok(await SignInAsync(user));
    }

    [HttpPost("resend-confirmation")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ResendConfirmation(EmailRequest req)
    {
        var user = await users.FindByEmailAsync(req.Email);
        if (user is { EmailConfirmed: false, IsSuspended: false } && Throttle("confirm:" + req.Email))
            await SendConfirmationAsync(user);

        return NoContent();   // ตอบเหมือนกันทุกกรณี
    }

    [HttpPost("confirm-email")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ConfirmEmail(ConfirmEmailRequest req)
    {
        var user = await users.FindByIdAsync(req.UserId);
        if (user is null) return BadRequest(new { error = InvalidLink });
        if (user.EmailConfirmed) return NoContent();

        var r = await users.ConfirmEmailAsync(user, Decode(req.Token));
        return r.Succeeded ? NoContent() : BadRequest(new { error = InvalidLink });
    }

    [HttpPost("forgot-password")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ForgotPassword(EmailRequest req)
    {
        var user = await users.FindByEmailAsync(req.Email);
        if (user is { IsSuspended: false } && Throttle("reset:" + req.Email))
        {
            var token = await users.GeneratePasswordResetTokenAsync(user);
            var link = Link("/reset-password", user, token);
            Fire(() => mailer.SendResetAsync(user.Email!, user.FullName, link));
        }

        return NoContent();   // ตอบเหมือนกันไม่ว่าอีเมลจะมีในระบบหรือไม่
    }

    [HttpPost("reset-password")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest req)
    {
        var user = await users.FindByIdAsync(req.UserId);
        if (user is null || user.IsSuspended)
            return BadRequest(new { error = InvalidLink });

        var r = await users.ResetPasswordAsync(user, Decode(req.Token), req.NewPassword);
        if (!r.Succeeded)
        {
            if (r.Errors.Any(e => e.Code == "InvalidToken"))
                return BadRequest(new { error = InvalidLink });
            return BadRequest(new { errors = r.Errors.Select(e => e.Description) });
        }

        // ลิงก์ในอีเมลพิสูจน์ว่าเป็นเจ้าของกล่องจดหมาย + ปลดล็อกบัญชีที่โดนล็อกจากกรอกรหัสผิด
        // (ResetPassword เปลี่ยน security stamp แล้ว session เก่าทุกเครื่องจะหมดอายุเอง)
        if (!user.EmailConfirmed)
        {
            user.EmailConfirmed = true;
            await users.UpdateAsync(user);
        }
        await users.SetLockoutEndDateAsync(user, null);
        await users.ResetAccessFailedCountAsync(user);

        return NoContent();
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

    // ---------- helpers ----------

    async Task SendConfirmationAsync(ApplicationUser user)
    {
        var token = await users.GenerateEmailConfirmationTokenAsync(user);
        var link = Link("/verify-email", user, token);
        Fire(() => mailer.SendConfirmationAsync(user.Email!, user.FullName, link));
    }

    // token ของ Identity มีตัวอักษร + / = จึงแปลงเป็น base64url ก่อนใส่ในลิงก์
    string Link(string path, ApplicationUser user, string token)
    {
        var baseUrl = (config["App:BaseUrl"] ?? "http://localhost:5173").TrimEnd('/');
        var t = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token));
        return $"{baseUrl}{path}?uid={Uri.EscapeDataString(user.Id)}&token={t}";
    }

    static string Decode(string token)
    {
        try { return Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(token)); }
        catch (FormatException) { return ""; }
    }

    // กันยิงอีเมลรัว ๆ ไปที่กล่องเดียว: 1 ฉบับ/นาที/อีเมล/ประเภท
    bool Throttle(string key)
    {
        key = "mail:" + key.ToLowerInvariant();
        if (cache.TryGetValue(key, out _)) return false;
        cache.Set(key, true, TimeSpan.FromSeconds(60));
        return true;
    }

    // ส่งเมลแบบไม่รอ: ตอบกลับเร็ว และเวลาตอบไม่ต่างกันระหว่างอีเมลที่มี/ไม่มีในระบบ
    void Fire(Func<Task> send) => _ = Task.Run(async () =>
    {
        try { await send(); }
        catch (Exception ex) { log.LogError(ex, "ส่งอีเมลไม่สำเร็จ"); }
    });

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