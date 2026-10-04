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