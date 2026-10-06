import { useState } from 'react'
import api from '../api'
import usePayment from '../usePayment'
import { METHOD_LABELS, dateTime, errorText, money } from '../utils'
import { btn, ui } from '../ui'

const wrap = 'mt-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4'

export default function RiderPaymentPanel({ orderId, orderStatus, onChanged }) {
    const { payment: p, setPayment, error, setError } = usePayment(orderId, orderStatus, onChanged)
    const [busy, setBusy] = useState(false)

    if (!p) {
        return (
        <div className={wrap}>
            {error ? <div className={ui.error}>{error}</div> : <p className={ui.muted}>กำลังโหลดข้อมูลการชำระเงิน...</p>}
        </div>
        )
    }

    const act = async (fn) => {
        setError('')
        setBusy(true)
        try {
        const res = await fn()
        setPayment(res.data)
        } catch (err) {
        setError(errorText(err))
        } finally {
        setBusy(false)
        }
    }

    const confirmTransfer = () => {
        if (!window.confirm(`ตรวจแล้วว่าเงิน ${money(p.amount)} เข้าบัญชีแล้ว?`)) return
        act(() => api.post(`/orders/${orderId}/payment/confirm`, { method: 'Transfer' }))
    }

    const confirmCash = () => {
        if (!window.confirm(`ยืนยันว่าได้รับเงินสด ${money(p.amount)} จากลูกค้าแล้ว?`)) return
        act(() => api.post(`/orders/${orderId}/payment/confirm`, { method: 'Cash' }))
    }

    const reject = () => {
        const reason = window.prompt('เหตุผลที่ปฏิเสธสลิป (เช่น ยอดไม่ตรง, ไม่พบเงินเข้า)')
        if (!reason?.trim()) return
        act(() => api.post(`/orders/${orderId}/payment/reject`, { reason: reason.trim() }))
    }

    const completed = p.orderStatus === 'Completed'
    const slipSrc = p.slipImageId ? `/api/files/order-images/${p.slipImageId}` : null

    return (
        <div className={wrap}>
        <div className={ui.row}>
            <h2 className="text-lg font-semibold text-gray-900">รับเงินจากลูกค้า</h2>
            <strong className="text-xl text-blue-700">{money(p.amount)}</strong>
        </div>

        {error && <div className={ui.error}>{error}</div>}

        {completed && (
            <p className="mt-2 text-green-700">
            ✓ งานเสร็จสมบูรณ์ รับเงินทาง{METHOD_LABELS[p.method] ?? '-'}
            {p.confirmedAt && ` เมื่อ ${dateTime(p.confirmedAt)}`}
            </p>
        )}

        {!completed && p.status === 'Paid' && (
            <p className="mt-2 text-green-700">
            ✓ ยืนยันรับเงินแล้ว ({METHOD_LABELS[p.method]}) รอลูกค้ากดยืนยันรับผ้า
            </p>
        )}

        {!completed && p.status === 'SlipUploaded' && (
            <div className="mt-2">
            <p className="text-amber-700">ลูกค้าส่งสลิปมาแล้ว ตรวจยอดเงินเข้าในแอปธนาคารก่อนกดยืนยัน</p>
            {slipSrc && (
                <a href={slipSrc} target="_blank" rel="noopener noreferrer">
                <img src={slipSrc} alt="สลิปลูกค้า" className="mt-2 max-h-80 rounded-lg border border-gray-200 object-contain" />
                </a>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
                <button className={btn('primary')} onClick={confirmTransfer} disabled={busy}>ยืนยันรับเงิน</button>
                <button className={btn('danger')} onClick={reject} disabled={busy}>ปฏิเสธสลิป</button>
            </div>
            <p className={`${ui.muted} mt-3`}>
                ถ้าลูกค้าจ่ายเงินสดแทน{' '}
                <button type="button" className={ui.link} onClick={confirmCash} disabled={busy}>กดรับเงินสด</button>
            </p>
            </div>
        )}

        {!completed && (p.status === 'Unpaid' || p.status === 'Rejected') && (
            <div className="mt-2">
            {p.status === 'Rejected' && (
                <p className={ui.muted}>ปฏิเสธสลิปไปแล้ว ({p.rejectReason}) รอลูกค้าส่งใหม่หรือจ่ายเงินสด</p>
            )}
            {p.status === 'Unpaid' && <p className={ui.muted}>รอลูกค้าโอนเงินพร้อมแนบสลิป หรือจ่ายเงินสด</p>}
            <button className={`${btn('default')} mt-3`} onClick={confirmCash} disabled={busy}>
                รับเงินสดแล้ว
            </button>
            </div>
        )}
        </div>
    )
}