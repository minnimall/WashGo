using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using WashGOApi.Data;
using WashGOApi.Models;
using WashGOApi.Services;

namespace WashGOApi.Controllers;

[ApiController]
[Route("api/rider")]
[Authorize(Roles = Roles.Rider)]
public class RiderController(AppDbContext db, PiiProtector pii, StorageService storage) : ControllerBase
{
    const int MaxImagesPerOrder = 30;

    string UserId => User.FindFirstValue("sub")!;

    // ============ โปรไฟล์ / ยืนยันตัวตน ============

    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var userId = UserId;
        var p = await db.RiderProfiles.AsNoTracking().FirstOrDefaultAsync(r => r.UserId == userId);
        return p is null ? NotFound() : Ok(BuildMe(p));
    }

    [HttpPost("verification")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(15_000_000)]
    [EnableRateLimiting("upload")]
    public async Task<IActionResult> Submit([FromForm] SubmitVerificationForm form)
    {
        var userId = UserId;
        var profile = await db.RiderProfiles.FirstOrDefaultAsync(r => r.UserId == userId);
        if (profile is null) return NotFound();

        if (profile.VerificationStatus is not (RiderVerificationStatus.Registered or RiderVerificationStatus.Rejected))
            return Conflict(new { error = "ส่งเอกสารได้เฉพาะตอนยังไม่เคยส่งหรือถูกปฏิเสธ" });

        var nationalId = new string(form.NationalId.Where(char.IsAsciiDigit).ToArray());
        if (!IsValidThaiId(nationalId))
            return BadRequest(new { error = "เลขบัตรประชาชนไม่ถูกต้อง" });

        string? promptPay = null;
        if (!string.IsNullOrWhiteSpace(form.PromptPayId))
        {
            promptPay = new string(form.PromptPayId.Where(char.IsAsciiDigit).ToArray());
            if (promptPay.Length is not (10 or 13))
                return BadRequest(new { error = "PromptPay ต้องเป็นเบอร์โทร 10 หลัก หรือเลขบัตร 13 หลัก" });
        }

        // ตรวจรูปให้ครบก่อน แล้วค่อยอัปโหลด
        ImageValidator.Result? idCard = null, selfie = null;
        if (form.IdCard is not null)
        {
            var (img, err) = await ImageValidator.ReadAsync(form.IdCard);
            if (img is null) return BadRequest(new { error = $"รูปบัตร: {err}" });
            idCard = img;
        }
        if (form.Selfie is not null)
        {
            var (img, err) = await ImageValidator.ReadAsync(form.Selfie);
            if (img is null) return BadRequest(new { error = $"รูปคู่บัตร: {err}" });
            selfie = img;
        }
        if (idCard is null && profile.IdCardImagePath is null)
            return BadRequest(new { error = "กรุณาแนบรูปบัตรประชาชน" });
        if (selfie is null && profile.SelfieImagePath is null)
            return BadRequest(new { error = "กรุณาแนบรูปถ่ายคู่บัตรประชาชน" });

        var uploaded = new List<string>();
        var toDelete = new List<string>();
        try
        {
            if (idCard is not null)
            {
                var path = $"riders/{userId}/idcard-{Guid.NewGuid():N}.{idCard.Ext}";
                await storage.UploadAsync(path, idCard.Data, idCard.ContentType);
                uploaded.Add(path);
                if (profile.IdCardImagePath is not null) toDelete.Add(profile.IdCardImagePath);
                profile.IdCardImagePath = path;
            }
            if (selfie is not null)
            {
                var path = $"riders/{userId}/selfie-{Guid.NewGuid():N}.{selfie.Ext}";
                await storage.UploadAsync(path, selfie.Data, selfie.ContentType);
                uploaded.Add(path);
                if (profile.SelfieImagePath is not null) toDelete.Add(profile.SelfieImagePath);
                profile.SelfieImagePath = path;
            }

            profile.LegalName = form.LegalName.Trim();
            profile.NationalId = pii.Protect(nationalId);                 // เข้ารหัสก่อนเก็บ
            profile.PromptPayId = promptPay is null ? null : pii.Protect(promptPay);
            profile.Vehicle = Input.Clean(form.Vehicle);
            profile.VerificationStatus = RiderVerificationStatus.PendingReview;
            profile.SubmittedAt = DateTime.UtcNow;
            profile.RejectReason = null;

            await db.SaveChangesAsync();
        }
        catch
        {
            foreach (var p in uploaded) await storage.DeleteAsync(p);   // บันทึกไม่สำเร็จ = เก็บกวาดไฟล์ที่เพิ่งอัปโหลด
            throw;
        }

        foreach (var p in toDelete) await storage.DeleteAsync(p);       // ลบรูปชุดเก่าที่ถูกแทนที่
        return Ok(BuildMe(profile));
    }

    [HttpPut("availability")]
    public async Task<IActionResult> SetAvailability(AvailabilityRequest req)
    {
        var userId = UserId;
        var profile = await db.RiderProfiles.FirstOrDefaultAsync(r => r.UserId == userId);
        if (profile is null) return NotFound();
        if (profile.VerificationStatus != RiderVerificationStatus.Approved) return NotApproved();

        profile.IsAcceptingJobs = req.IsAccepting;
        await db.SaveChangesAsync();
        return Ok(BuildMe(profile));
    }

    // ============ งาน ============

    // งานที่รอรับ: เห็นแค่ระยะห่างจากจุดรับ ไม่เห็นที่อยู่ลูกค้า (ตำแหน่ง Rider ใช้คำนวณชั่วคราว ไม่เก็บ)
    [HttpGet("jobs/available")]
    public async Task<IActionResult> Available([FromQuery] double? lat, [FromQuery] double? lng)
    {
        var profile = await ApprovedProfileAsync();
        if (profile is null) return NotApproved();
        if (!profile.IsAcceptingJobs)
            return Ok(new { accepting = false, items = Array.Empty<AvailableJobDto>() });

        var hasPos = lat is >= -90 and <= 90 && lng is >= -180 and <= 180;

        var rows = await db.Orders.AsNoTracking()
            .Where(o => o.Status == OrderStatus.Pending && o.RiderId == null)
            .OrderBy(o => o.CreatedAt).Take(100)
            .Select(o => new
            {
                o.Id, o.OrderNo, ServiceName = o.ServiceType.Name, o.EstimatedSize, o.TotalPrice,
                o.DetergentSource, o.CreatedAt,
                Extra = o.Lines.Sum(l => l.Quantity),
                o.PickupLocation.Latitude, o.PickupLocation.Longitude,
            })
            .ToListAsync();

        var items = rows.Select(r =>
        {
            double? km = hasPos ? Math.Round(Haversine(lat!.Value, lng!.Value, r.Latitude, r.Longitude), 1) : null;
            return new AvailableJobDto(r.Id, r.OrderNo, r.ServiceName, r.EstimatedSize, r.TotalPrice,
                r.Extra, r.DetergentSource, km, r.CreatedAt);
        });

        return Ok(new { accepting = true, items = hasPos ? items.OrderBy(i => i.DistanceKm) : items });
    }

    [HttpGet("jobs")]
    public async Task<IActionResult> MyJobs([FromQuery] bool active = true)
    {
        var profile = await ApprovedProfileAsync();
        if (profile is null) return NotApproved();

        var userId = UserId;
        var statuses = JobFlow.ActiveStatuses;
        var q = db.Orders.AsNoTracking().Where(o => o.RiderId == userId);
        q = active
            ? q.Where(o => statuses.Contains(o.Status))
            : q.Where(o => !statuses.Contains(o.Status));

        var rows = await q.OrderByDescending(o => o.CreatedAt).Take(50)
            .Select(o => new
            {
                o.Id, o.OrderNo, o.Status, ServiceName = o.ServiceType.Name,
                o.EstimatedSize, o.FinalSize, o.TotalPrice,
                PickupAddress = o.PickupLocation.Address,
                DeliveryAddress = o.DeliveryLocation.Address,
                o.CreatedAt,
            })
            .ToListAsync();

        return Ok(rows.Select(r => new RiderJobSummaryDto(
            r.Id, r.OrderNo, r.Status, r.ServiceName, r.FinalSize ?? r.EstimatedSize,
            r.TotalPrice, r.PickupAddress, r.DeliveryAddress, r.CreatedAt)));
    }

    [HttpGet("jobs/{id:int}")]
    public async Task<IActionResult> JobDetail(int id)
    {
        var detail = await LoadJobDetailAsync(id, UserId);
        return detail is null ? NotFound() : Ok(detail);   // งานของ Rider คนอื่นตอบ 404
    }

    [HttpPost("jobs/{id:int}/accept")]
    public async Task<IActionResult> Accept(int id)
    {
        var userId = UserId;
        var profile = await ApprovedProfileAsync();
        if (profile is null) return NotApproved();
        if (!profile.IsAcceptingJobs)
            return Conflict(new { error = "กรุณาเปิดรับงานก่อน" });

        var statuses = JobFlow.LimitStatuses;
        var active = await db.Orders.CountAsync(o => o.RiderId == userId && statuses.Contains(o.Status));
        if (active >= JobFlow.MaxActiveJobs)
            return Conflict(new { error = $"ถืองานที่ยังไม่จบได้พร้อมกันไม่เกิน {JobFlow.MaxActiveJobs} งาน" });

        const string taken = "งานนี้ถูกรับไปแล้วหรือถูกยกเลิก";
        var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == id);
        if (order is null || order.Status != OrderStatus.Pending || order.RiderId is not null)
            return Conflict(new { error = taken });

        order.RiderId = userId;
        order.Status = OrderStatus.Accepted;
        db.OrderStatusHistories.Add(new OrderStatusHistory
        {
            OrderId = order.Id,
            FromStatus = OrderStatus.Pending,
            ToStatus = OrderStatus.Accepted,
            ChangedByUserId = userId,
            Note = "Rider รับงาน",
        });

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            // Version (xmin) เปลี่ยนระหว่างที่เรากำลังรับ = มี Rider อีกคนรับตัดหน้า หรือลูกค้ายกเลิก
            return Conflict(new { error = taken });
        }

        return Ok(await LoadJobDetailAsync(id, userId));
    }

    [HttpPost("jobs/{id:int}/status")]
    public async Task<IActionResult> ChangeStatus(int id, ChangeStatusRequest req)
    {
        var userId = UserId;
        if (await ApprovedProfileAsync() is null) return NotApproved();

        var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == id && o.RiderId == userId);
        if (order is null) return NotFound();

        if (!JobFlow.Steps.TryGetValue(order.Status, out var step) || step.Next != req.ToStatus)
            return Conflict(new { error = "เปลี่ยนเป็นสถานะนี้ไม่ได้ในขั้นตอนปัจจุบัน" });

        // ต้องมีรูปที่ Rider คนนี้อัปโหลดเองแล้ว (กันรูปค้างจาก Rider คนก่อนหน้าที่ปล่อยงานคืน)
        if (step.RequiredImage is { } need &&
            !await db.OrderImages.AnyAsync(i => i.OrderId == id && i.Type == need && i.UploadedByUserId == userId))
            return BadRequest(new { error = $"ต้องอัปโหลด{JobFlow.ImageLabels[need]}ก่อนเปลี่ยนสถานะ" });

        var from = order.Status;
        order.Status = req.ToStatus;
        db.OrderStatusHistories.Add(new OrderStatusHistory
        {
            OrderId = order.Id,
            FromStatus = from,
            ToStatus = req.ToStatus,
            ChangedByUserId = userId,
        });

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            return Conflict(new { error = "สถานะออเดอร์เพิ่งเปลี่ยน กรุณาโหลดหน้าใหม่" });
        }

        return Ok(await LoadJobDetailAsync(id, userId));
    }

    // ปล่อยงานคืนได้ก่อนรับผ้าเท่านั้น งานกลับไปรอ Rider คนอื่น
    [HttpPost("jobs/{id:int}/release")]
    public async Task<IActionResult> Release(int id, ReasonRequest req)
    {
        var userId = UserId;
        var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == id && o.RiderId == userId);
        if (order is null) return NotFound();

        if (order.Status is not (OrderStatus.Accepted or OrderStatus.GoingToPickup))
            return Conflict(new { error = "ปล่อยงานคืนได้เฉพาะก่อนรับผ้า" });

        var from = order.Status;
        order.RiderId = null;
        order.Status = OrderStatus.Pending;
        db.OrderStatusHistories.Add(new OrderStatusHistory
        {
            OrderId = order.Id,
            FromStatus = from,
            ToStatus = OrderStatus.Pending,
            ChangedByUserId = userId,
            Note = $"Rider ปล่อยงานคืน: {req.Reason.Trim()}",
        });

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            return Conflict(new { error = "สถานะออเดอร์เพิ่งเปลี่ยน กรุณาโหลดหน้าใหม่" });
        }

        return NoContent();
    }

    [HttpPost("jobs/{id:int}/images")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(8_000_000)]
    [EnableRateLimiting("upload")]
    public async Task<IActionResult> UploadImage(int id, [FromForm] OrderImageForm form)
    {
        var userId = UserId;
        if (await ApprovedProfileAsync() is null) return NotApproved();

        if (form.Type is not { } type || !Enum.IsDefined(type))
            return BadRequest(new { error = "ชนิดรูปไม่ถูกต้อง" });

        var order = await db.Orders.AsNoTracking()
            .Where(o => o.Id == id && o.RiderId == userId)
            .Select(o => new { o.Status })
            .FirstOrDefaultAsync();
        if (order is null) return NotFound();

        if (!JobFlow.ImageAllowedAt[type].Contains(order.Status))
            return Conflict(new { error = $"{JobFlow.ImageLabels[type]}อัปโหลดไม่ได้ในสถานะปัจจุบัน" });

        if (await db.OrderImages.CountAsync(i => i.OrderId == id) >= MaxImagesPerOrder)
            return Conflict(new { error = "ออเดอร์นี้มีรูปครบจำนวนสูงสุดแล้ว" });

        var (img, err) = await ImageValidator.ReadAsync(form.File);
        if (img is null) return BadRequest(new { error = err });

        var path = $"orders/{id}/{Guid.NewGuid():N}.{img.Ext}";   // ชื่อไฟล์สุ่มเอง ไม่ใช้ชื่อจากผู้ใช้
        await storage.UploadAsync(path, img.Data, img.ContentType);

        var row = new OrderImage { OrderId = id, Type = type, ImagePath = path, UploadedByUserId = userId };
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

        // ไม่มี endpoint ลบรูป: รูปเป็นหลักฐานตอนเกิดข้อพิพาท
        return StatusCode(StatusCodes.Status201Created, new OrderImageDto(row.Id, row.Type, row.CreatedAt));
    }

    // ============ ตัวช่วย ============

    async Task<RiderProfile?> ApprovedProfileAsync()
    {
        var userId = UserId;
        var p = await db.RiderProfiles.AsNoTracking().FirstOrDefaultAsync(r => r.UserId == userId);
        return p is { VerificationStatus: RiderVerificationStatus.Approved } ? p : null;
    }

    IActionResult NotApproved() =>
        StatusCode(StatusCodes.Status403Forbidden, new { error = "บัญชียังไม่ได้รับอนุมัติเป็น Rider" });

    RiderMeDto BuildMe(RiderProfile p)
    {
        string? masked = null;
        if (!string.IsNullOrEmpty(p.NationalId))
        {
            var plain = pii.Unprotect(p.NationalId);
            masked = "•••••••••" + plain[^4..];   // แสดงแค่ 4 ตัวท้าย
        }

        return new RiderMeDto(
            p.VerificationStatus, p.RejectReason, p.IsAcceptingJobs,
            p.LegalName, p.Vehicle, masked,
            p.IdCardImagePath is not null, p.SelfieImagePath is not null, p.SubmittedAt);
    }

    async Task<RiderJobDetailDto?> LoadJobDetailAsync(int id, string userId)
    {
        var o = await db.Orders.AsNoTracking()
            .Include(x => x.ServiceType)
            .Include(x => x.Customer)
            .Include(x => x.PickupLocation)
            .Include(x => x.DeliveryLocation)
            .Include(x => x.Lines)
            .Include(x => x.Images)
            .Include(x => x.StatusHistories)
            .AsSplitQuery()
            .FirstOrDefaultAsync(x => x.Id == id && x.RiderId == userId);   // ตรวจเจ้าของงานใน query เดียวกัน

        if (o is null) return null;

        NextStepDto? next = null;
        if (JobFlow.Steps.TryGetValue(o.Status, out var step))
        {
            var done = step.RequiredImage is null ||
                       o.Images.Any(i => i.Type == step.RequiredImage && i.UploadedByUserId == userId);
            next = new NextStepDto(step.Next, step.RequiredImage, done);
        }

        // เบอร์ลูกค้าเห็นเฉพาะตอนงานยังไม่จบ
        var phone = JobFlow.ActiveStatuses.Contains(o.Status) ? o.Customer.PhoneNumber : null;

        return new RiderJobDetailDto(
            o.Id, o.OrderNo, o.Status, o.ServiceType.Name,
            o.EstimatedSize, o.FinalSize,
            o.DetergentSource, o.DetergentNote, o.CareNote,
            o.TotalPrice, o.Customer.FullName, phone, o.CreatedAt,
            LocationDto.From(o.PickupLocation), LocationDto.From(o.DeliveryLocation),
            o.Lines.OrderBy(l => l.Id)
                .Select(l => new OrderLineDto(l.Type, l.Name, l.UnitPrice, l.Quantity, l.UnitPrice * l.Quantity))
                .ToList(),
            o.StatusHistories.OrderBy(h => h.CreatedAt).ThenBy(h => h.Id)
                .Select(h => new StatusStepDto(h.FromStatus, h.ToStatus, h.CreatedAt))
                .ToList(),
            o.Images.OrderBy(i => i.Id).Select(i => new OrderImageDto(i.Id, i.Type, i.CreatedAt)).ToList(),
            next,
            o.Status is OrderStatus.Accepted or OrderStatus.GoingToPickup);
    }

    // ตรวจเลขบัตรประชาชนไทย 13 หลัก (checksum)
    static bool IsValidThaiId(string id)
    {
        if (id.Length != 13 || !id.All(char.IsAsciiDigit)) return false;
        var sum = 0;
        for (var i = 0; i < 12; i++) sum += (id[i] - '0') * (13 - i);
        return (11 - sum % 11) % 10 == id[12] - '0';
    }

    static double Haversine(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6371;
        static double Rad(double d) => d * Math.PI / 180;
        var dLat = Rad(lat2 - lat1);
        var dLon = Rad(lon2 - lon1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(Rad(lat1)) * Math.Cos(Rad(lat2)) * Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        return 2 * R * Math.Asin(Math.Sqrt(a));
    }
}