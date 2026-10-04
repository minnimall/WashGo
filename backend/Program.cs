using Microsoft.AspNetCore.Authentication.JwtBearer;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using WashGOApi.Data;
using WashGOApi.Models;
using WashGOApi.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.Services.AddDbContext<AppDbContext>(o =>
    o.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

builder.Services.AddIdentityCore<ApplicationUser>(o =>
    {
        o.User.RequireUniqueEmail = true;
        o.Password.RequiredLength = 8;
        o.Password.RequireNonAlphanumeric = false;
        o.Lockout.MaxFailedAccessAttempts = 5;
        o.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    })
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<AppDbContext>();

builder.Services.AddSingleton<JwtService>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.MapInboundClaims = false;   // ให้ claim ชื่อ sub / role คงเดิม ไม่ถูกแปลงชื่อ
        o.Events = new JwtBearerEvents
        {
            // ถ้าไม่มี Authorization header ให้อ่าน token จาก cookie
            OnMessageReceived = ctx =>
            {
                if (string.IsNullOrEmpty(ctx.Token) &&
                    ctx.Request.Cookies.TryGetValue(JwtService.CookieName, out var token))
                    ctx.Token = token;
                return Task.CompletedTask;
            },
            // ทุก request: บัญชีต้องยังมีอยู่ ไม่ถูกระงับ และ security stamp ต้องตรง
            OnTokenValidated = async ctx =>
            {
                var userManager = ctx.HttpContext.RequestServices
                    .GetRequiredService<UserManager<ApplicationUser>>();
                var id = ctx.Principal?.FindFirst("sub")?.Value;
                var stamp = ctx.Principal?.FindFirst("stamp")?.Value;

                var user = id is null ? null : await userManager.FindByIdAsync(id);
                if (user is null || user.IsSuspended || user.SecurityStamp != stamp)
                    ctx.Fail("Session is no longer valid");
            },
        };
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = JwtService.Issuer,
            ValidateAudience = true,
            ValidAudience = JwtService.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = JwtService.GetKey(builder.Configuration),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1),
            NameClaimType = "name",
            RoleClaimType = "role",
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    // login/register: 10 ครั้งต่อนาทีต่อ IP
    o.AddPolicy("auth", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 10,
            Window = TimeSpan.FromMinutes(1),
        }));
});

builder.Services.AddCors(o => o.AddPolicy("Frontend", p =>
    p.WithOrigins("http://localhost:5173")
    .AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

var app = builder.Build();

await DbSeeder.SeedAsync(app.Services);

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// Security headers
app.Use(async (ctx, next) =>
{
    ctx.Response.Headers["X-Content-Type-Options"] = "nosniff";
    ctx.Response.Headers["X-Frame-Options"] = "DENY";
    ctx.Response.Headers["Referrer-Policy"] = "no-referrer";
    if (ctx.Request.Path.StartsWithSegments("/api"))
        ctx.Response.Headers["Cache-Control"] = "no-store";   // ไม่ให้ browser/proxy จำข้อมูลส่วนตัว
    await next();
});

app.UseCors("Frontend");

// กัน CSRF ชั้นที่สอง: request ที่แก้ข้อมูลต้องมี header นี้
// (เว็บอื่นแนบ header แบบนี้ข้ามเว็บไม่ได้ เพราะ CORS ของเราอนุญาตเฉพาะ origin ของเรา)
app.Use(async (ctx, next) =>
{
    var m = ctx.Request.Method;
    var isSafe = HttpMethods.IsGet(m) || HttpMethods.IsHead(m) || HttpMethods.IsOptions(m);
    if (!isSafe && ctx.Request.Path.StartsWithSegments("/api")
        && !ctx.Request.Headers.ContainsKey("X-Requested-With"))
    {
        ctx.Response.StatusCode = StatusCodes.Status400BadRequest;
        await ctx.Response.WriteAsJsonAsync(new { error = "Missing X-Requested-With header" });
        return;
    }
    await next();
});

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
    app.UseHttpsRedirection();
}

app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
