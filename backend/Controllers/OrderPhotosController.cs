using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using WashGOApi.Data;
using WashGOApi.Models;
using WashGOApi.Services;

namespace WashGOApi.Controllers;

public class PhotoForm
{
    public IFormFile? File { get; set; }
}

// รูปผ้า/ตะกร้าที่ลูกค้าถ่ายเอง ให้ Rider ใช้ยืนยันว่าถุงไหนเป็นของลูกค้า
[ApiController]
[Route("api/orders/{orderId:int}/photos")]
[Authorize(Roles = Roles.Customer)]
public class OrderPhotosController(AppDbContext db, StorageService storage) : ControllerBase
{
    const int MaxPhotos = 3;
    static readonly OrderStatus[] EditableAt =
        [OrderStatus.Pending, OrderStatus.Accepted, OrderStatus.GoingToPickup];

    string UserId => User.FindFirstValue("sub")!;

    [HttpPost]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(8_000_000)]
    [EnableRateLimiting("upload")]
    public async Task<IActionResult> Upload(int orderId, [FromForm] PhotoForm form)
    {
        var userId = UserId;
        var order = await db.Orders.AsNoTracking()
            .Where(o => o.Id == orderId && o.CustomerId == userId)
            .Select(o => new { o.Status })
            .FirstOrDefaultAsync();
        if (order is null) return NotFound();

        if (!EditableAt.Contains(order.Status))
            return Conflict(new { error = "เพิ่มรูปได้ก่อน Rider รับผ้าเท่านั้น" });

        var count = await db.OrderImages.CountAsync(i =>
            i.OrderId == orderId && i.Type == OrderImageType.CustomerLaundry);
        if (count >= MaxPhotos)
            return Conflict(new { error = $"แนบรูปได้ไม่เกิน {MaxPhotos} รูป" });

        var (img, err) = await ImageValidator.ReadAsync(form.File);
        if (img is null) return BadRequest(new { error = err });

        var path = $"orders/{orderId}/{Guid.NewGuid():N}.{img.Ext}";
        await storage.UploadAsync(path, img.Data, img.ContentType);

        var row = new OrderImage
        {
            OrderId = orderId,
            Type = OrderImageType.CustomerLaundry,
            ImagePath = path,
            UploadedByUserId = userId,
        };
        db.OrderImages.Add(row);
        try
        {
            await db.SaveChangesAsync();
        }
        catch
        {
            await storage.DeleteAsync(path);
            throw;
        }

        return StatusCode(StatusCodes.Status201Created, new OrderImageDto(row.Id, row.Type, row.CreatedAt));
    }

    // ลูกค้าลบได้เฉพาะรูปของตัวเองและก่อน Rider รับผ้า (รูปของ Rider ลบไม่ได้ เป็นหลักฐาน)
    [HttpDelete("{imageId:int}")]
    public async Task<IActionResult> Delete(int orderId, int imageId)
    {
        var userId = UserId;
        var img = await db.OrderImages.Include(i => i.Order)
            .FirstOrDefaultAsync(i => i.Id == imageId && i.OrderId == orderId
                && i.Type == OrderImageType.CustomerLaundry
                && i.UploadedByUserId == userId && i.Order.CustomerId == userId);
        if (img is null) return NotFound();

        if (!EditableAt.Contains(img.Order.Status))
            return Conflict(new { error = "ลบรูปได้ก่อน Rider รับผ้าเท่านั้น" });

        var path = img.ImagePath;
        db.OrderImages.Remove(img);
        await db.SaveChangesAsync();
        await storage.DeleteAsync(path);
        return NoContent();
    }
}