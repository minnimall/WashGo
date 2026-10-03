using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using WashGOApi.Models;

namespace WashGOApi.Services;

public class JwtService(IConfiguration config)
{
    public const string Issuer = "WashGo";
    public const string Audience = "WashGoApp";
    public const string CookieName = "washgo_auth";
    public static readonly TimeSpan Lifetime = TimeSpan.FromHours(8);

    public static SymmetricSecurityKey GetKey(IConfiguration c)
    {
        var secret = c["Jwt:Key"]
            ?? throw new InvalidOperationException("Missing Jwt:Key in configuration");
        var bytes = Encoding.UTF8.GetBytes(secret);
        if (bytes.Length < 32)
            throw new InvalidOperationException("Jwt:Key must be at least 32 bytes");
        return new SymmetricSecurityKey(bytes);
    }

    public (string Token, DateTime ExpiresAt) Create(ApplicationUser user, IList<string> roles)
    {
        var claims = new List<Claim>
        {
            new("sub", user.Id),
            new("email", user.Email ?? ""),
            new("name", user.FullName),
            new("stamp", user.SecurityStamp ?? ""),   // ใช้ตรวจว่า token ยังใช้ได้ไหม
        };
        claims.AddRange(roles.Select(r => new Claim("role", r)));

        var expires = DateTime.UtcNow.Add(Lifetime);
        var descriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Issuer = Issuer,
            Audience = Audience,
            Expires = expires,
            SigningCredentials = new SigningCredentials(GetKey(config), SecurityAlgorithms.HmacSha256),
        };

        return (new JsonWebTokenHandler().CreateToken(descriptor), expires);
    }
}