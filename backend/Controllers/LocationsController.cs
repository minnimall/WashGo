using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WashGOApi.Data;
using WashGOApi.Models;

namespace WashGOApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = Roles.Customer)]
public class LocationsController(AppDbContext db) : ControllerBase
{
    const int MaxSavedLocations = 20;

    string UserId => User.FindFirstValue("sub")!;

    // เห็นเฉพาะที่อยู่ของตัวเอง
    [HttpGet]
    public async Task<IActionResult> List()
    {
        var userId = UserId;
        var rows = await db.Locations.AsNoTracking()
            .Where(l => l.UserId == userId && l.IsSaved)
            .OrderByDescending(l => l.Id)
            .ToListAsync();

        return Ok(rows.Select(LocationDto.From));
    }

    [HttpPost]
    public async Task<IActionResult> Create(LocationRequest req)
    {
        var userId = UserId;

        if (req.Latitude == 0 && req.Longitude == 0)
            return BadRequest(new { error = "กรุณาระบุตำแหน่ง (กดปุ่มใช้ตำแหน่งปัจจุบัน)" });

        var count = await db.Locations.CountAsync(l => l.UserId == userId && l.IsSaved);
        if (count >= MaxSavedLocations)
            return BadRequest(new { error = $"บันทึกที่อยู่ได้สูงสุด {MaxSavedLocations} รายการ กรุณาลบที่ไม่ใช้ก่อน" });

        var loc = new Location
        {
            UserId = userId,                      // เอาจาก token เสมอ ไม่รับจาก client
            IsSaved = true,
            Label = Input.Clean(req.Label),
            Address = req.Address.Trim(),
            Building = Input.Clean(req.Building),
            Floor = Input.Clean(req.Floor),
            Room = Input.Clean(req.Room),
            Landmark = Input.Clean(req.Landmark),
            Latitude = req.Latitude,
            Longitude = req.Longitude,
        };

        db.Locations.Add(loc);
        await db.SaveChangesAsync();
        return StatusCode(StatusCodes.Status201Created, LocationDto.From(loc));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = UserId;
        var loc = await db.Locations.FirstOrDefaultAsync(l => l.Id == id && l.UserId == userId && l.IsSaved);
        if (loc is null) return NotFound();

        // แค่ซ่อนจากรายการ ไม่ลบจริง เพราะออเดอร์เก่าอ้างถึงที่อยู่นี้ (เป็นหลักฐานการรับ-ส่ง)
        loc.IsSaved = false;
        await db.SaveChangesAsync();
        return NoContent();
    }
}