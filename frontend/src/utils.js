export function errorText(err) {
    if (!err.response) return 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้'
    const { status, data: d } = err.response
    if (d?.error) return d.error
    if (Array.isArray(d?.errors)) return d.errors.join(', ')
    if (d?.errors) return Object.values(d.errors).flat().join(', ')
    if (status === 404) return 'ไม่พบข้อมูลที่ต้องการ'
    if (status === 403) return 'ไม่มีสิทธิ์ทำรายการนี้'
    if (status === 429) return 'ทำรายการถี่เกินไป กรุณารอสักครู่แล้วลองใหม่'
    return 'เกิดข้อผิดพลาด กรุณาลองใหม่'
}

export const STATUS_LABELS = {
    Pending: 'รอ Rider รับงาน',
    Accepted: 'Rider รับงานแล้ว',
    GoingToPickup: 'Rider กำลังไปรับผ้า',
    PickedUp: 'รับผ้าแล้ว',
    AwaitingPriceConfirmation: 'รอยืนยันราคาใหม่',
    Washing: 'กำลังซัก',
    WashingCompleted: 'ซักเสร็จแล้ว',
    Delivering: 'กำลังนำส่ง',
    Delivered: 'ส่งแล้ว (รอชำระเงิน)',
    Completed: 'เสร็จสิ้น',
    Cancelled: 'ยกเลิก',
}

export const SIZE_DESC = { S: 'ถุงเล็ก 3–5 ชุด', M: 'ถุงกลาง', L: 'ถุงใหญ่/ตะกร้า' }

export const DETERGENT_LABELS = {
    Standard: 'น้ำยามาตรฐาน (รวมในราคาแล้ว)',
    CustomerOwn: 'ลูกค้านำน้ำยามาเอง',
    Special: 'น้ำยาพิเศษ',
}

export const money = (n) =>
    Number(n).toLocaleString('th-TH', { maximumFractionDigits: 2 }) + ' บาท'

export const dateTime = (iso) =>
    new Date(iso).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })

export const VERIFY_LABELS = {
    Registered: 'ยังไม่ได้ส่งเอกสาร',
    PendingReview: 'รอ Admin ตรวจสอบ',
    Approved: 'อนุมัติแล้ว',
    Rejected: 'ถูกปฏิเสธ (แก้ไขแล้วส่งใหม่ได้)',
    Suspended: 'ถูกระงับ',
}

export const IMAGE_LABELS = {
    PickupLaundry: 'รูปผ้าตอนรับ',
    Detergent: 'รูปน้ำยา',
    SizeAdjust: 'รูปปรับไซส์',
    WashReceipt: 'รูปใบรับซัก',
    Delivery: 'รูปผ้าที่ส่งมอบ',
    PaymentSlip: 'สลิปโอนเงิน',
    CustomerLaundry: 'รูปผ้าจากลูกค้า',
}

// รูปแต่ละชนิดอัปโหลดได้ตอนสถานะไหน (ต้องตรงกับ JobFlow.ImageAllowedAt ฝั่ง backend)
// SizeAdjust ยังไม่เปิดใช้ จะทำพร้อมฟีเจอร์ปรับไซส์
export const IMAGE_AT = {
    PickupLaundry: ['GoingToPickup', 'PickedUp'],
    Detergent: ['GoingToPickup', 'PickedUp'],
    WashReceipt: ['PickedUp', 'Washing'],
    Delivery: ['Delivering', 'Delivered'],
}

export const NEXT_ACTION_LABELS = {
    GoingToPickup: 'ออกเดินทางไปรับผ้า',
    PickedUp: 'รับผ้าแล้ว',
    Washing: 'นำผ้าเข้าซัก',
    WashingCompleted: 'ซักเสร็จแล้ว',
    Delivering: 'ออกเดินทางส่งผ้า',
    Delivered: 'ส่งผ้าถึงลูกค้าแล้ว',
}

// ย่อรูปและแปลงเป็น JPEG ในเบราว์เซอร์ ช่วยให้ไฟล์เล็กลง
// และการวาดใหม่บน canvas ตัดข้อมูล EXIF (รวมพิกัด GPS ของรูป) ออกไปด้วย
export async function resizeImage(file, maxSide = 1600, quality = 0.85) {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h)
    bitmap.close?.()

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob) throw new Error('resize failed')
    return blob
}

export const METHOD_LABELS = { Cash: 'เงินสด', Transfer: 'โอนเงิน' }