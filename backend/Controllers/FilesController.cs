using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WashGOApi.Data;
using WashGOApi.Models;
using WashGOApi.Services;

namespace WashGOApi.Controllers;

[ApiController]
[Route("api/files")]
[Authorize]
public class FilesController(AppDbContext db, StorageService storage) : ControllerBase
{
    [HttpGet("order-images/{id:int}")]
    public async Task<IActionResult> OrderImage(int id)
    {
        var userId = User.FindFirstValue("sub");
        var isAdmin = User.IsInRole(Roles.Admin);

        var img = await db.OrderImages.AsNoTracking()
            .Where(i => i.Id == id)
            .Select(i => new { i.ImagePath, i.Order.CustomerId, i.Order.RiderId })
            .FirstOrDefaultAsync();

        // ไม่มีสิทธิ์ก็ตอบ 404 เหมือนไม่มีรูปนี้อยู่
        if (img is null || !(isAdmin || img.CustomerId == userId || img.RiderId == userId))
            return NotFound();

        var data = await storage.DownloadAsync(img.ImagePath);
        return data is null ? NotFound() : File(data, ImageValidator.ContentTypeOf(img.ImagePath));
    }
}