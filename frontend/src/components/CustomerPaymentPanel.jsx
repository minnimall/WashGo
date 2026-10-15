import { useState } from 'react'
import api from '../api'
import usePayment from '../usePayment'
import { METHOD_LABELS, dateTime, errorText, money, resizeImage } from '../utils'
import { btn, ui } from '../ui'

const wrap = 'mt-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4'

function SlipPreview({ src, title = 'สลิปการโอนเงิน' }) {
    const [failed, setFailed] = useState(false)
    if (!src) return null

    if (failed) {
        return (
            <p className="mt-3 rounded-lg bg-white px-3 py-2.5 text-xs text-gray-500">
                โหลดรูปสลิปไม่ได้ ลองรีเฟรชหน้านี้อีกครั้ง
            </p>
        )
    }

    return (
        <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3">
            <p className="mb-2 text-xs font-medium text-gray-500">{title}</p>
            <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block overflow-hidden rounded-lg bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
                <img
                    src={src}
                    alt={title}
                    loading="lazy"
                    onError={() => setFailed(true)}
                    className="mx-auto max-h-64 w-auto object-contain"
                />
                <span className="absolute bottom-2 right-2 rounded-full bg-gray-900/70 px-2.5 py-1 text-[11px] font-medium text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                    แตะเพื่อดูขนาดเต็ม
                </span>
            </a>
        </div>
    )
}

export default function CustomerPaymentPanel({ orderId, orderStatus, onChanged }) {
    const { payment: p, setPayment, error, setError } = usePayment(orderId, orderStatus, onChanged)
    const [busy, setBusy] = useState(false)
    const [copied, setCopied] = useState(false)

    if (!p) {
        return (
        <div className={wrap}>
            {error ? <div className={ui.error}>{error}</div> : <p className={ui.muted}>กำลังโหลดข้อมูลการชำระเงิน...</p>}
        </div>
        )
    }

    const uploadSlip = async (e) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file) return
        setError('')
        setBusy(true)
        try {
        const blob = await resizeImage(file)
        const fd = new FormData()
        fd.append('file', new File([blob], 'slip.jpg', { type: 'image/jpeg' }))
        const res = await api.post(`/orders/${orderId}/payment/slip`, fd)
        setPayment(res.data)
        } catch (err) {
        setError(err.response ? errorText(err) : 'อ่านรูปไม่ได้ กรุณาใช้ไฟล์ JPG หรือ PNG')
        } finally {
        setBusy(false)
        }
    }

    const receive = async () => {
        if (!window.confirm('ยืนยันว่าได้รับผ้าครบถ้วนแล้ว? เมื่อยืนยันแล้วจะแก้ไขไม่ได้')) return
        setError('')
        setBusy(true)
        try {
        await api.post(`/orders/${orderId}/receive`)
        await onChanged?.()
        } catch (err) {
        setError(errorText(err))
        } finally {
        setBusy(false)
        }
    }

    const copy = async (text) => {
        try {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
        } catch { /* คัดลอกไม่ได้ก็ข้าม */ }
    }

    const completed = p.orderStatus === 'Completed'
    const canPay = !completed && (p.status === 'Unpaid' || p.status === 'Rejected')
    const slipSrc = p.slipImageId ? `/api/files/order-images/${p.slipImageId}` : null

    return (
        <div className={wrap}>
        <div className={ui.row}>
            <h2 className="text-lg font-semibold text-gray-900">การชำระเงิน</h2>
            <strong className="text-base text-blue-700">{money(p.amount)}</strong>
        </div>

        {error && <div className={ui.error}>{error}</div>}

        {completed && (
            <div className="mt-2">
            <p className="text-green-700 text-sm">
                ออเดอร์เสร็จสมบูรณ์ ชำระโดย{METHOD_LABELS[p.method] ?? '-'}
                {p.confirmedAt && ` เมื่อ ${dateTime(p.confirmedAt)}`}
            </p>
            <SlipPreview src={slipSrc} />
            </div>
        )}

        {!completed && p.status === 'Paid' && (
            <div className="mt-2">
            <p className="text-green-700">
                ✓ Rider ยืนยันรับเงินแล้ว ({METHOD_LABELS[p.method]}) ตรวจผ้าให้เรียบร้อยแล้วกดยืนยัน
            </p>
            <SlipPreview src={slipSrc} />
            <button className={`${btn('primary')} mt-3`} onClick={receive} disabled={busy}>
                {busy ? 'กำลังบันทึก...' : 'ยืนยันรับผ้า'}
            </button>
            </div>
        )}

        {!completed && p.status === 'SlipUploaded' && (
            <div className="mt-2">
            <p className="text-amber-700">ส่งสลิปแล้ว รอ Rider ตรวจสอบ (หน้านี้อัปเดตเองอัตโนมัติ)</p>
            <SlipPreview src={slipSrc} title="สลิปที่ส่งให้ Rider" />
            </div>
        )}

        {canPay && (
            <div className="mt-2">
            {p.status === 'Rejected' && (
                <div className={ui.error}>
                Rider ปฏิเสธสลิป: {p.rejectReason} (ส่งใหม่ได้อีก {p.attemptsLeft} ครั้ง)
                </div>
            )}

            <p className="mb-2 font-medium text-gray-800">เลือกวิธีชำระเงิน</p>

            <div className="rounded-lg bg-white p-3">
                <p className="font-medium">1) โอนเงิน แล้วแนบสลิป</p>
                {p.payTo?.promptPay ? (
                <p className="mt-1 text-sm">
                    PromptPay: <strong>{p.payTo.promptPay}</strong> ({p.payTo.riderName}){' '}
                    <button type="button" className={ui.link} onClick={() => copy(p.payTo.promptPay)}>
                    {copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
                    </button>
                </p>
                ) : (
                <p className={`${ui.muted} mt-1`}>
                    Rider ยังไม่ได้ตั้งเบอร์ PromptPay ที่แสดงได้ กรุณาจ่ายเงินสด หรือสอบถาม Rider
                </p>
                )}
                {p.attemptsLeft > 0 ? (
                <label className={`${btn('primary', 'sm')} mt-3 ${busy ? 'pointer-events-none opacity-50' : ''}`}>
                    {busy ? 'กำลังอัปโหลด...' : 'แนบสลิปโอนเงิน'}
                    <input type="file" accept="image/*" className="hidden" onChange={uploadSlip} disabled={busy} />
                </label>
                ) : (
                <p className={`${ui.muted} mt-2`}>ส่งสลิปครบจำนวนครั้งแล้ว กรุณาติดต่อ Rider</p>
                )}
            </div>

            <div className="mt-2 rounded-lg bg-white p-3">
                <p className="font-medium">2) จ่ายเงินสด</p>
                <p className={`${ui.muted} mt-1`}>จ่ายให้ Rider ตอนรับผ้า แล้วรอ Rider กดยืนยันรับเงิน</p>
            </div>
            </div>
        )}
        </div>
    )
}