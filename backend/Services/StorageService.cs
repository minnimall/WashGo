using System.Net;
using System.Net.Http.Headers;

namespace WashGOApi.Services;

public class StorageService
{
    readonly HttpClient http;
    readonly string bucket;
    readonly string baseUrl;

    public StorageService(HttpClient http, IConfiguration config)
    {
        this.http = http;
        var url = config["Supabase:Url"]
            ?? throw new InvalidOperationException("Missing Supabase:Url");
        var key = config["Supabase:ServiceKey"]
            ?? throw new InvalidOperationException("Missing Supabase:ServiceKey");
        bucket = config["Supabase:Bucket"]
            ?? throw new InvalidOperationException("Missing Supabase:Bucket");

        baseUrl = url.TrimEnd('/') + "/storage/v1/object";
        http.Timeout = TimeSpan.FromSeconds(30);
        http.DefaultRequestHeaders.Add("apikey", key);
        // service_role แบบเก่าเป็น JWT (ขึ้นต้น eyJ) ต้องส่งใน Authorization ด้วย
        if (key.StartsWith("eyJ"))
            http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", key);
    }

    public async Task UploadAsync(string path, byte[] data, string contentType, CancellationToken ct = default)
    {
        using var content = new ByteArrayContent(data);
        content.Headers.ContentType = new MediaTypeHeaderValue(contentType);

        using var req = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/{bucket}/{path}") { Content = content };
        req.Headers.Add("x-upsert", "false");   // ห้ามเขียนทับไฟล์เดิม

        using var res = await http.SendAsync(req, ct);
        if (!res.IsSuccessStatusCode)
            throw new InvalidOperationException($"Storage upload failed ({(int)res.StatusCode})");
    }

    public async Task<byte[]?> DownloadAsync(string path, CancellationToken ct = default)
    {
        using var res = await http.GetAsync($"{baseUrl}/authenticated/{bucket}/{path}", ct);
        if (res.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.BadRequest) return null;
        res.EnsureSuccessStatusCode();
        return await res.Content.ReadAsByteArrayAsync(ct);
    }

    // ลบแบบ best-effort ใช้เก็บกวาดไฟล์ที่อัปโหลดแล้วแต่บันทึกฐานข้อมูลไม่สำเร็จ
    public async Task DeleteAsync(string path)
    {
        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Delete, $"{baseUrl}/{bucket}/{path}");
            using var res = await http.SendAsync(req);
        }
        catch
        {
            // ลบไม่ได้ก็ปล่อย ไฟล์ค้างใน bucket ไม่กระทบความถูกต้องของข้อมูล
        }
    }
}