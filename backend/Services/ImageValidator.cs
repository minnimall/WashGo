namespace WashGOApi.Services;

public static class ImageValidator
{
    public const int MaxBytes = 6 * 1024 * 1024;

    public sealed record Result(byte[] Data, string Ext, string ContentType);

    public static async Task<(Result? Image, string? Error)> ReadAsync(IFormFile? file)
    {
        if (file is null || file.Length == 0) return (null, "กรุณาแนบรูปภาพ");
        if (file.Length > MaxBytes) return (null, "ไฟล์ใหญ่เกิน 6 MB");

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        var b = ms.ToArray();
        if (b.Length < 12) return (null, "ไฟล์ไม่ถูกต้อง");

        if (b[0] == 0xFF && b[1] == 0xD8 && b[2] == 0xFF)
            return (new Result(b, "jpg", "image/jpeg"), null);

        if (b[0] == 0x89 && b[1] == 0x50 && b[2] == 0x4E && b[3] == 0x47)
            return (new Result(b, "png", "image/png"), null);

        // WebP = "RIFF" .... "WEBP"
        if (b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F' &&
            b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P')
            return (new Result(b, "webp", "image/webp"), null);

        return (null, "รองรับเฉพาะรูป JPG, PNG, WebP");
    }

    public static string ContentTypeOf(string path) =>
        Path.GetExtension(path).ToLowerInvariant() switch
        {
            ".png" => "image/png",
            ".webp" => "image/webp",
            _ => "image/jpeg",
        };
}