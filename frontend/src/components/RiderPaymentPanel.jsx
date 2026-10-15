import { useState } from 'react'
import api from '../api'
import usePayment from '../usePayment'
import SlipPreview from './SlipPreview'
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
                <strong className="text-base text-blue-700">{money(p.amount)}</strong>
            </div>

            {error && <div className={ui.error}>{error}</div>}

            {/* งานเสร็จสมบูรณ์ */}
            {completed && (
                <div className="mt-2">
                    <p className="text-sm text-green-700">
                        ✓ งานเสร็จสมบูรณ์ รับเงินทาง{METHOD_LABELS[p.method] ?? '-'}
                        {p.confirmedAt && ` เมื่อ ${dateTime(p.confirmedAt)}`}
                    </p>
                    <SlipPreview src={slipSrc} title="สลิปจากลูกค้า" />
                </div>
            )}

            {/* ยืนยันรับเงินแล้ว รอลูกค้ากดรับผ้า */}
            {!completed && p.status === 'Paid' && (
                <div className="mt-2">
                    <p className="text-green-700">
                        ✓ ยืนยันรับเงินแล้ว ({METHOD_LABELS[p.method]}) รอลูกค้ากดยืนยันรับผ้า
                    </p>
                    <SlipPreview src={slipSrc} title="สลิปจากลูกค้า" />
                </div>
            )}

            {/* ลูกค้าส่งสลิปมาแล้ว รอ Rider ตรวจ */}
            {!completed && p.status === 'SlipUploaded' && (
                <div className="mt-2">
                    <p className="text-amber-700">ลูกค้าส่งสลิปมาแล้ว ตรวจยอดเงินเข้าในแอปธนาคารก่อนกดยืนยัน</p>

                    <SlipPreview src={slipSrc} title="สลิปจากลูกค้า" />

                    <div className="mt-3 flex flex-wrap gap-2">
                        <button className={btn('primary')} onClick={confirmTransfer} disabled={busy}>
                            ยืนยันรับเงิน
                        </button>
                        <button className={btn('danger')} onClick={reject} disabled={busy}>
                            ปฏิเสธสลิป
                        </button>
                    </div>

                    <p className={`${ui.muted} mt-3`}>
                        ถ้าลูกค้าจ่ายเงินสดแทน{' '}
                        <button type="button" className={ui.link} onClick={confirmCash} disabled={busy}>
                            กดรับเงินสด
                        </button>
                    </p>
                </div>
            )}

            {/* ยังไม่จ่าย / สลิปถูกปฏิเสธ */}
            {!completed && (p.status === 'Unpaid' || p.status === 'Rejected') && (
                <div className="mt-2">
                    {p.status === 'Rejected' && (
                        <div className="mb-3 rounded-lg bg-white px-3 py-2.5 text-sm text-gray-600">
                            ปฏิเสธสลิปไปแล้ว ({p.rejectReason}) รอลูกค้าส่งใหม่หรือจ่ายเงินสด
                        </div>
                    )}

                    <p className="mb-2 font-medium text-gray-800">รอลูกค้าชำระเงิน</p>

                    <div className="rounded-lg bg-white p-3">
                        <p className="font-medium">1) ลูกค้าโอนเงิน แล้วแนบสลิป</p>
                        <p className={`${ui.muted} mt-1`}>
                            เมื่อลูกค้าส่งสลิปเข้ามา จะแสดงรูปให้ตรวจสอบและกดยืนยันได้ที่นี่
                        </p>
                    </div>

                    <div className="mt-2 rounded-lg bg-white p-3">
                        <p className="font-medium">2) ลูกค้าจ่ายเงินสด</p>
                        <p className={`${ui.muted} mt-1`}>
                            ถ้าได้รับเงินสดจากลูกค้าแล้ว กดปุ่มด้านล่างเพื่อยืนยัน
                        </p>
                        <button className={`${btn('default', 'sm')} mt-3`} onClick={confirmCash} disabled={busy}>
                            รับเงินสดแล้ว
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}