import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../api'
import StatusBadge from '../components/StatusBadge'
import { DETERGENT_LABELS, STATUS_LABELS, dateTime, errorText, money } from '../utils'

const cardCls = 'rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100'
const h2Cls = 'mb-3 text-lg font-semibold text-slate-900'

function PriceRow({ label, value, total }) {
    return (
        <tr className={total ? '' : 'border-b border-slate-100'}>
            <td className={`py-2 ${total ? 'pt-3 text-base font-semibold text-slate-900' : 'text-slate-600'}`}>{label}</td>
            <td className={`py-2 text-right ${total ? 'pt-3 text-base font-semibold text-blue-600' : 'text-slate-800'}`}>{value}</td>
        </tr>
    )
}

function Place({ title, loc }) {
    const detail = [loc.building, loc.floor && `ชั้น ${loc.floor}`, loc.room && `ห้อง ${loc.room}`, loc.landmark]
        .filter(Boolean).join(' · ')
    return (
        <div className="rounded-xl bg-slate-50 p-4">
        <strong className="font-semibold text-slate-900">{title}</strong>
        <div className="text-slate-700">{loc.address}</div>
        {detail && <div className="text-sm text-slate-500">{detail}</div>}
        <a
            href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm font-medium text-blue-600 hover:underline"
        >
            📍 ดูบนแผนที่
        </a>
        </div>
    )
}

export default function OrderDetailPage() {
    const { id } = useParams()
    const [order, setOrder] = useState(null)
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        api.get(`/orders/${id}`)
        .then((res) => setOrder(res.data))
        .catch((err) => setError(errorText(err)))
    }, [id])

    const cancel = async () => {
        if (!window.confirm('ยืนยันยกเลิกออเดอร์นี้?')) return
        setError('')
        setBusy(true)
        try {
        const res = await api.post(`/orders/${id}/cancel`)
        setOrder(res.data)
        } catch (err) {
        setError(errorText(err))
        } finally {
        setBusy(false)
        }
    }

    if (!order) {
        return error
        ? (
            <>
            <div className="mb-3 rounded-md border-l-4 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
            <Link to="/orders" className="text-sm font-medium text-blue-600 hover:underline">← กลับไปรายการออเดอร์</Link>
            </>
        )
        : <p className="text-slate-500">กำลังโหลด...</p>
    }

    const sizeText = order.finalSize && order.finalSize !== order.estimatedSize
        ? `${order.estimatedSize} → ${order.finalSize}`
        : order.estimatedSize

    return (
        <div className="space-y-4">
        <Link to="/orders" className="inline-block text-sm font-medium text-blue-600 hover:underline">← ออเดอร์ของฉัน</Link>

        <div className={cardCls}>
            <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-2xl font-semibold text-slate-900">{order.orderNo}</h1>
            <StatusBadge status={order.status} />
            </div>
            <p className="mt-1 text-sm text-slate-500">
                สั่งเมื่อ {dateTime(order.createdAt)}{order.riderName && ` · Rider: ${order.riderName}`}
            </p>
            {error && (
                <div className="mt-3 rounded-md border-l-4 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
            )}
            {order.status === 'Pending' && (
            <button
                onClick={cancel}
                disabled={busy}
                className="mt-4 cursor-pointer rounded-full border border-red-200 bg-white px-5 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {busy ? 'กำลังยกเลิก...' : 'ยกเลิกออเดอร์'}
            </button>
            )}
        </div>

        <div className={cardCls}>
            <h2 className={h2Cls}>สถานะ</h2>
            <ul className="space-y-3 border-l-2 border-slate-200 pl-5">
            {order.timeline.map((t, i) => {
                const isLast = i === order.timeline.length - 1
                return (
                <li
                    key={i}
                    className={`relative before:absolute before:-left-[26px] before:top-2 before:size-2.5 before:rounded-full ${
                        isLast ? 'before:bg-blue-600 before:ring-4 before:ring-blue-100' : 'before:bg-slate-300'
                    }`}
                >
                    <span className={isLast ? 'font-semibold text-slate-900' : 'text-slate-700'}>
                        {STATUS_LABELS[t.to] ?? t.to}
                    </span>{' '}
                    <span className="text-sm text-slate-500">· {dateTime(t.at)}</span>
                </li>
                )
            })}
            </ul>
        </div>

        <div className={cardCls}>
            <h2 className={h2Cls}>รายละเอียด</h2>
            <div className="space-y-1 text-slate-700">
            <p>บริการ: {order.serviceName} · ไซส์ {sizeText}</p>
            <p>น้ำยา: {DETERGENT_LABELS[order.detergentSource] ?? order.detergentSource}{order.detergentNote && ` (${order.detergentNote})`}</p>
            {order.careNote && <p>หมายเหตุ: {order.careNote}</p>}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Place title="จุดรับผ้า" loc={order.pickupLocation} />
            <Place title="จุดส่งผ้า" loc={order.deliveryLocation} />
            </div>
        </div>

        <div className={cardCls}>
            <h2 className={h2Cls}>ราคา</h2>
            <table className="w-full">
            <tbody>
                <PriceRow label="ค่าซัก" value={money(order.servicePrice)} />
                {order.lines.map((l, i) => (
                <PriceRow key={i} label={`${l.name} × ${l.quantity}`} value={money(l.lineTotal)} />
                ))}
                <PriceRow label="ค่าส่ง" value={money(order.deliveryFee)} />
                {order.platformFee > 0 && <PriceRow label="ค่าแพลตฟอร์ม" value={money(order.platformFee)} />}
                <PriceRow label="รวม" value={money(order.totalPrice)} total />
            </tbody>
            </table>
        </div>
        </div>
    )
}