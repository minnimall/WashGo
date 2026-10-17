using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace WashGOApi.Services;

// ส่งอีเมลผ่าน Resend (HTTPS API) เพราะ Render free tier ปิดพอร์ต SMTP ขาออก
// ถ้าจะเปลี่ยนผู้ให้บริการ แก้แค่เมธอด SendAsync
public class EmailService(
    HttpClient http,
    IConfiguration config,
    IWebHostEnvironment env,
    ILogger<EmailService> log)
{
    public Task SendConfirmationAsync(string to, string name, string link) =>
        SendAsync(to, "ยืนยันอีเมลสำหรับ WashGo", link,
            Template(name, "ยืนยันอีเมลของคุณ",
                "กดปุ่มด้านล่างเพื่อยืนยันอีเมลและเริ่มใช้งาน WashGo (ลิงก์ใช้ได้ 2 ชั่วโมง)",
                "ยืนยันอีเมล", link));

    public Task SendResetAsync(string to, string name, string link) =>
        SendAsync(to, "ตั้งรหัสผ่านใหม่ WashGo", link,
            Template(name, "ตั้งรหัสผ่านใหม่",
                "เราได้รับคำขอตั้งรหัสผ่านใหม่สำหรับบัญชีของคุณ กดปุ่มด้านล่างเพื่อดำเนินการต่อ (ลิงก์ใช้ได้ 2 ชั่วโมง)",
                "ตั้งรหัสผ่านใหม่", link));

    async Task SendAsync(string to, string subject, string link, string html)
    {
        var key = config["Resend:ApiKey"];
        if (string.IsNullOrWhiteSpace(key))
        {
            // เครื่อง dev ไม่ต้องมี key: พิมพ์ลิงก์ลง console ไว้กดทดสอบ (production ห้าม log ลิงก์)
            if (env.IsDevelopment())
            {
                log.LogWarning("[DEV EMAIL] to={To} | {Subject} | {Link}", to, subject, link);
                return;
            }
            throw new InvalidOperationException("Missing configuration: Resend:ApiKey");
        }

        using var req = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", key);
        req.Content = JsonContent.Create(new
        {
            from = config["Resend:From"] ?? "WashGo <onboarding@resend.dev>",
            to = new[] { to },
            subject,
            html,
        });

        using var res = await http.SendAsync(req);
        if (!res.IsSuccessStatusCode)
            throw new HttpRequestException($"Resend {(int)res.StatusCode}: {await res.Content.ReadAsStringAsync()}");
    }

    static string Template(string name, string title, string text, string button, string link)
    {
        var safeLink = WebUtility.HtmlEncode(link);
        return $"""
            <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#1e293b">
              <h2 style="color:#6d28d9">{title}</h2>
              <p>สวัสดีคุณ {WebUtility.HtmlEncode(name)}</p>
              <p>{text}</p>
              <p style="margin:28px 0"><a href="{safeLink}" style="background:#8b5cf6;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:bold">{button}</a></p>
              <p style="font-size:12px;color:#64748b">ถ้าคุณไม่ได้เป็นผู้ขอ ไม่ต้องทำอะไร อีเมลนี้จะไม่มีผลใด ๆ</p>
              <p style="font-size:12px;color:#64748b;word-break:break-all">หรือคัดลอกลิงก์นี้ไปเปิด: {safeLink}</p>
            </div>
            """;
    }
}