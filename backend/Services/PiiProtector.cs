using System.Security.Cryptography;
using System.Text;

namespace WashGOApi.Services;

public class PiiProtector
{
    const string Prefix = "v1:";
    readonly byte[] key;

    public PiiProtector(IConfiguration config)
    {
        var text = config["Pii:Key"]
            ?? throw new InvalidOperationException("Missing Pii:Key in configuration");
        key = Convert.FromBase64String(text);
        if (key.Length != 32)
            throw new InvalidOperationException("Pii:Key must be 32 bytes (base64)");
    }

    public string Protect(string plain)
    {
        var nonce = RandomNumberGenerator.GetBytes(12);
        var data = Encoding.UTF8.GetBytes(plain);
        var cipher = new byte[data.Length];
        var tag = new byte[16];

        using var aes = new AesGcm(key, 16);
        aes.Encrypt(nonce, data, cipher, tag);

        var packed = nonce.Concat(tag).Concat(cipher).ToArray();
        return Prefix + Convert.ToBase64String(packed);
    }

    public string Unprotect(string stored)
    {
        if (!stored.StartsWith(Prefix))
            throw new CryptographicException("Unknown format");

        var raw = Convert.FromBase64String(stored[Prefix.Length..]);
        var nonce = raw[..12];
        var tag = raw[12..28];
        var cipher = raw[28..];
        var data = new byte[cipher.Length];

        using var aes = new AesGcm(key, 16);
        aes.Decrypt(nonce, cipher, tag, data);
        return Encoding.UTF8.GetString(data);
    }
}