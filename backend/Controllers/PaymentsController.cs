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
[Route("api/orders/{orderId:int}")]
[Authorize]
public class PaymentsController(AppDbContext db, PiiProtector pii, StorageService storage) : ControllerBase
{
    const int MaxSlipAttempts = 5;

    string UserId => User.FindFirstValue("sub")!;

    // ดูสถานะการชำระเงิน (ลูกค้าเจ้าของออเดอร์ หรือ Rider ที่ถืองานนั้นเท่านั้น)
    [HttpGet("payment")]
    public async Task<IActionResult> Get(int orderId)
    {
        var userId = UserId;
        var order = await db.Orders.AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == orderId && (o.CustomerId == userId || o.RiderId == userId));
        if (order is null) return NotFound();

        if (order.Status is not (OrderStatus.Delivered or OrderStatus.Completed))
            return Conflict(new { error = "ออเดอร์ยังไม่ถึงขั้นตอนชำระเงิน" });

        var payment = order.Status == OrderStatus.Delivered
            ? await GetOrCreatePaymentAsync(order)
            : await db.Payments.FirstOrDefaultAsync(p => p.OrderId == orderId);
        if (payment is null) return NotFound();

        return Ok(await BuildViewAsync(order, payment, isCustomer: order.CustomerId == userId));
    }

    // ลูกค้าแนบสลิปโอนเงิน
    [HttpPost("payment/slip")]
    [Authorize(Roles = Roles.Customer)]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(8_000_000)]
    [EnableRateLimiting("upload")]
    public async Task<IActionResult> UploadSlip(int orderId, [FromForm] SlipForm form)
    {
        var userId = UserId;
        var order = await db.Orders.AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == orderId && o.CustomerId == userId);
        if (order is null) return NotFound();

        if (order.Status != OrderStatus.Delivered)
            return Conflict(new { error = "แนบสลิปได้หลัง Rider ส่งผ้าแล้วเท่านั้น" });

        var payment = await GetOrCreatePaymentAsync(order);
        if (payment.Status == PaymentStatus.Paid)
            return Conflict(new { error = "ชำระเงินเรียบร้อยแล้ว" });
        if (payment.Status != PaymentStatus.Unpaid && payment.Status != PaymentStatus.Rejected)
            return Conflict(new { error = "สลิปก่อนหน้ากำลังรอ Rider ตรวจสอบ" });
        if (payment.SlipAttempts >= MaxSlipAttempts)
            return Conflict(new { error = "ส่งสลิปครบจำนวนครั้งสูงสุดแล้ว กรุณาติดต่อ Rider" });

        var (img, err) = await ImageValidator.ReadAsync(form.File);   // ตรวจชนิดไฟล์จากไบต์จริง
        if (img is null) return BadRequest(new { error = err });

        var path = $"orders/{orderId}/{Guid.NewGuid():N}.{img.Ext}";
        await storage.UploadAsync(path, img.Data, img.ContentType);

        payment.SlipImage = new OrderImage
        {
            OrderId = orderId,
            Type = OrderImageType.PaymentSlip,
            ImagePath = path,
            UploadedByUserId = userId,
        };
        payment.Method = PaymentMethod.Transfer;
        payment.Status = PaymentStatus.SlipUploaded;
        payment.SlipAttempts++;
        payment.RejectReason = null;

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            await storage.DeleteAsync(path);
            return Conflict(new { error = "สถานะการชำระเงินเพิ่งเปลี่ยน กรุณาโหลดหน้าใหม่" });
        }
        catch
        {
            await storage.DeleteAsync(path);
            throw;
        }

        return Ok(await BuildViewAsync(order, payment, isCustomer: true));
    }

    // Rider ยืนยันรับเงิน: Transfer (ต้องมีสลิป) หรือ Cash
    [HttpPost("payment/confirm")]
    [Authorize(Roles = Roles.Rider)]
    public async Task<IActionResult> Confirm(int orderId, ConfirmPaymentRequest req)
    {
        var userId = UserId;
        if (req.Method is not { } method || !Enum.IsDefined(method))
            return BadRequest(new { error = "วิธีชำระเงินไม่ถูกต้อง" });
        if (!await IsApprovedRiderAsync(userId)) return Forbidden();

        var order = await db.Orders.AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == orderId && o.RiderId == userId);
        if (order is null) return NotFound();
        if (order.Status != OrderStatus.Delivered)
            return Conflict(new { error = "ยืนยันรับเงินได้หลังส่งผ้าแล้วและก่อนออเดอร์เสร็จสิ้น" });

        var payment = await GetOrCreatePaymentAsync(order);
        if (payment.Status == PaymentStatus.Paid)
            return Conflict(new { error = "ยืนยันรับเงินไปแล้ว" });
        if (method == PaymentMethod.Transfer && payment.Status != PaymentStatus.SlipUploaded)
            return Conflict(new { error = "ยังไม่มีสลิปให้ยืนยัน" });

        payment.Method = method;
        payment.Status = PaymentStatus.Paid;
        payment.ConfirmedByRiderId = userId;
        payment.ConfirmedAt = DateTime.UtcNow;
        payment.RejectReason = null;

        if (!await TrySaveAsync()) return Stale();
        return Ok(await BuildViewAsync(order, payment, isCustomer: false));
    }

    // Rider ปฏิเสธสลิป (ต้องระบุเหตุผล)
    [HttpPost("payment/reject")]
    [Authorize(Roles = Roles.Rider)]
    public async Task<IActionResult> Reject(int orderId, ReasonRequest req)
    {
        var userId = UserId;
        if (!await IsApprovedRiderAsync(userId)) return Forbidden();

        var order = await db.Orders.AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == orderId && o.RiderId == userId);
        if (order is null) return NotFound();

        var payment = await db.Payments.FirstOrDefaultAsync(p => p.OrderId == orderId);
        if (payment is null || order.Status != OrderStatus.Delivered || payment.Status != PaymentStatus.SlipUploaded)
            return Conflict(new { error = "ไม่มีสลิปที่รอตรวจสอบ" });

        payment.Status = PaymentStatus.Rejected;
        payment.RejectReason = req.Reason.Trim();

        if (!await TrySaveAsync()) return Stale();
        return Ok(await BuildViewAsync(order, payment, isCustomer: false));
    }

    // ลูกค้ายืนยันรับผ้า → Completed (ต้องชำระเงินแล้วเท่านั้น)
    [HttpPost("receive")]
    [Authorize(Roles = Roles.Customer)]
    public async Task<IActionResult> Receive(int orderId)
    {
        var userId = UserId;
        var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == orderId && o.CustomerId == userId);
        if (order is null) return NotFound();

        if (order.Status != OrderStatus.Delivered)
            return Conflict(new { error = "ยืนยันรับผ้าได้หลัง Rider ส่งผ้าแล้วเท่านั้น" });
        if (!await db.Payments.AnyAsync(p => p.OrderId == orderId && p.Status == PaymentStatus.Paid))
            return Conflict(new { error = "Rider ยังไม่ได้ยืนยันรับเงิน" });

        order.Status = OrderStatus.Completed;
        db.OrderStatusHistories.Add(new OrderStatusHistory
        {
            OrderId = order.Id,
            FromStatus = OrderStatus.Delivered,
            ToStatus = OrderStatus.Completed,
            ChangedByUserId = userId,
            Note = "ลูกค้ายืนยันรับผ้า",
        });

        if (!await TrySaveAsync()) return Stale();
        return NoContent();
    }

    // ============ ตัวช่วย ============

    // สร้างแถว Payment ตอนมีคนเปิดครั้งแรก ถ้าสองฝั่งสร้างพร้อมกันให้ใช้แถวที่ชนะ
    async Task<Payment> GetOrCreatePaymentAsync(Order order)
    {
        var existing = await db.Payments.FirstOrDefaultAsync(p => p.OrderId == order.Id);
        if (existing is not null) return existing;

        var created = new Payment { OrderId = order.Id, Amount = order.TotalPrice };
        db.Payments.Add(created);
        try
        {
            await db.SaveChangesAsync();
            return created;
        }
        catch (DbUpdateException)
        {
            db.Entry(created).State = EntityState.Detached;
            return await db.Payments.FirstAsync(p => p.OrderId == order.Id);
        }
    }

    async Task<PaymentViewDto> BuildViewAsync(Order order, Payment p, bool isCustomer)
    {
        PayToDto? payTo = null;

        // ปลายทางโอน: เห็นเฉพาะลูกค้าเจ้าของออเดอร์ และเฉพาะตอนยังไม่จ่าย
        if (isCustomer && p.Status != PaymentStatus.Paid && order.RiderId is not null)
        {
            var rider = await db.RiderProfiles.AsNoTracking()
                .Where(r => r.UserId == order.RiderId)
                .Select(r => new { r.User.FullName, r.PromptPayId })
                .FirstOrDefaultAsync();

            if (rider is not null)
            {
                string? promptPay = null;
                if (!string.IsNullOrEmpty(rider.PromptPayId))
                {
                    var plain = pii.Unprotect(rider.PromptPayId);
                    // เปิดเผยเฉพาะเบอร์โทร 10 หลัก เลข 13 หลักอาจเป็นเลขบัตรประชาชน ห้ามให้ลูกค้าเห็น
                    if (plain.Length == 10) promptPay = plain;
                }
                payTo = new PayToDto(rider.FullName, promptPay);
            }
        }

        return new PaymentViewDto(
            order.Status, p.Status, p.Method, p.Amount, p.SlipImageId,
            Math.Max(0, MaxSlipAttempts - p.SlipAttempts), p.RejectReason, p.ConfirmedAt, payTo);
    }

    async Task<bool> IsApprovedRiderAsync(string userId) =>
        await db.RiderProfiles.AsNoTracking()
            .AnyAsync(r => r.UserId == userId && r.VerificationStatus == RiderVerificationStatus.Approved);

    async Task<bool> TrySaveAsync()
    {
        try
        {
            await db.SaveChangesAsync();
            return true;
        }
        catch (DbUpdateConcurrencyException)
        {
            return false;
        }
    }

    IActionResult Stale() =>
        Conflict(new { error = "สถานะเพิ่งเปลี่ยน กรุณาโหลดหน้าใหม่" });

    IActionResult Forbidden() =>
        StatusCode(StatusCodes.Status403Forbidden, new { error = "บัญชียังไม่ได้รับอนุมัติเป็น Rider" });
}