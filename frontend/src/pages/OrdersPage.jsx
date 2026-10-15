import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import useAutoRefresh from '../useAutoRefresh'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../AuthContext'
import { dateTime, errorText, money } from '../utils'

const ACTIVE = ['Pending', 'Confirmed', 'Processing', 'Washing', 'Ready']
const DONE = ['Completed', 'Delivered']

/* ความคืบหน้าโดยประมาณของแต่ละสถานะ */
const PROGRESS = {
    Pending: 10,
    Confirmed: 25,
    Processing: 45,
    Washing: 65,
    Ready: 85,
    Completed: 100,
    Delivered: 100,
}

const FILTERS = [
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'active', label: 'กำลังดำเนินการ' },
    { key: 'done', label: 'เสร็จสิ้น' },
]

/* ---------- small pieces ---------- */

function Icon({ name, className = 'h-5 w-5' }) {
    const p = {
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        viewBox: '0 0 24 24',
        className,
    }

    switch (name) {
        case 'list':
            return (
                <svg {...p}>
                    <path d="M8 6h13M8 12h13M8 18h13" />
                    <circle cx="4" cy="6" r="1" />
                    <circle cx="4" cy="12" r="1" />
                    <circle cx="4" cy="18" r="1" />
                </svg>
            )
        case 'chevron':
            return (
                <svg {...p}>
                    <path d="M9 6l6 6-6 6" />
                </svg>
            )
        case 'check':
            return (
                <svg {...p}>
                    <path d="M5 13l4 4L19 7" />
                </svg>
            )
        case 'spin':
            return (
                <svg {...p}>
                    <path d="M20 12a8 8 0 1 1-2.3-5.7" />
                    <path d="M20 4v5h-5" />
                </svg>
            )
        case 'plus':
            return (
                <svg {...p}>
                    <path d="M12 5v14M5 12h14" />
                </svg>
            )
        default:
            return null
    }
}

function ProgressBar({ value, done }) {
    return (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
                className={`h-full rounded-full transition-all duration-700 ${
                    done ? 'bg-emerald-500' : 'bg-blue-600'
                }`}
                style={{ width: `${value}%` }}
            />
        </div>
    )
}

function StatCard({ label, value, tone }) {
    return (
        <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm sm:px-6 sm:py-5">
            <p className="text-xs font-semibold text-slate-400">{label}</p>
            <p className={`mt-1 text-2xl font-black sm:text-3xl ${tone}`}>
                {value}
            </p>
        </div>
    )
}

/* ไอคอนรูปภาพของออเดอร์ — ถ้าโหลดรูปไม่ได้ จะใช้ไอคอน SVG แทน */
function OrderIcon({ done }) {
    const [failed, setFailed] = useState(false)

    return (
        <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl sm:h-14 sm:w-14 ${
                done ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
            }`}
        >
            {failed ? (
                <Icon name={done ? 'check' : 'spin'} className="h-6 w-6" />
            ) : (
                <img
                    src="/images/ตะกร้าผ้า.png"
                    alt=""
                    onError={() => setFailed(true)}
                    className="h-8 w-8 object-contain sm:h-10 sm:w-10"
                />
            )}
        </div>
    )
}


/* แคชระดับโมดูล แยกตามผู้ใช้ */
let cache = { uid: null, data: null }

/* ---------- page ---------- */
export default function OrdersPage() {
    const { user } = useAuth()
    const uid = user?.id ?? user?.userId ?? user?.email ?? null
    const [data, setData] = useState(() =>
        uid && cache.uid === uid ? cache.data : null
    )
    const [error, setError] = useState('')
    const [filter, setFilter] = useState('all')

    const load = useCallback(async () => {
        try {
            const res = await api.get('/orders')
            const d = res.data
            const next = Array.isArray(d)
                ? { items: d, total: d.length }
                : { items: d.items ?? [], total: d.total ?? d.items?.length ?? 0 }
            if (uid) cache = { uid, data: next }
            setData(next)
            setError('')
        } catch (err) {
            setError(errorText(err))
        }
    }, [uid])

    useAutoRefresh(load, { interval: 8000 })

    const orders = data?.items ?? []
    const totalOrders = data?.total ?? 0
    const activeOrders = orders.filter((o) => ACTIVE.includes(o.status))
    const completedOrders = orders.filter((o) => DONE.includes(o.status))
    const latestActive = activeOrders[0]

    const visible = useMemo(() => {
        if (filter === 'active') return activeOrders
        if (filter === 'done') return completedOrders
        return orders
    }, [filter, orders, activeOrders, completedOrders])

    const counts = {
        all: orders.length,
        active: activeOrders.length,
        done: completedOrders.length,
    }

    return (
        <div className="space-y-6 sm:space-y-8">

            {/* PAGE HEADER */}
            <section className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="text-xs font-bold tracking-[0.2em] text-blue-600">
                        MY ORDERS
                    </p>

                    <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:mt-2 sm:text-4xl">
                        ออเดอร์ของฉัน
                    </h1>

                    <p className="mt-2 hidden max-w-2xl text-sm leading-6 text-slate-500 sm:block">
                        ติดตามสถานะการซักผ้าและดูประวัติออเดอร์ทั้งหมดของคุณ
                    </p>
                </div>

                <Link
                    to="/orders/new"
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl active:translate-y-0 active:scale-95"
                >
                    <Icon name="plus" className="h-4 w-4" />
                    สั่งซักผ้า
                </Link>
            </section>

            {/* ERROR */}
            {error && (
                <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 font-bold">
                        !
                    </span>
                    <span>{error}</span>
                </div>
            )}

            {/* LOADING */}
            {!data && !error && (
                <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3 sm:gap-4">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="h-20 animate-pulse rounded-2xl bg-slate-200/70 sm:h-24"
                            />
                        ))}
                    </div>
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="h-28 animate-pulse rounded-2xl bg-slate-200/70"
                        />
                    ))}
                </div>
            )}

            {data && (
                <>
                    {/* STATS */}
                    <section className="grid grid-cols-3 gap-3 sm:gap-4">
                        <StatCard
                            label="ทั้งหมด"
                            value={totalOrders}
                            tone="text-slate-900"
                        />
                        <StatCard
                            label="กำลังดำเนินการ"
                            value={activeOrders.length}
                            tone="text-blue-600"
                        />
                        <StatCard
                            label="เสร็จสิ้น"
                            value={completedOrders.length}
                            tone="text-emerald-600"
                        />
                    </section>

                    {/* LATEST ACTIVE ORDER */}
                    {latestActive && (
                        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 p-5 text-slate-900 shadow-sm ring-1 ring-blue-100 sm:p-7">
                            <div className="pointer-events-none absolute inset-0">
                                <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/70" />
                                <div className="absolute -bottom-24 right-32 h-56 w-56 rounded-full bg-blue-200/40" />
                            </div>

                            <div className="relative z-10 flex flex-wrap items-center justify-between gap-5">
                                <div className="min-w-0 flex-1 basis-64">
                                    <p className="text-sm font-medium text-blue-600">
                                        ออเดอร์ล่าสุดที่กำลังดำเนินการ
                                    </p>

                                    <h2 className="mt-1 text-xl font-semibold sm:text-2xl">
                                        {latestActive.serviceName}
                                    </h2>

                                    <div className="mt-4 max-w-sm">
                                        <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700">
                                            <span>{latestActive.orderNo}</span>
                                            <span>
                                                {PROGRESS[latestActive.status] ?? 0}%
                                            </span>
                                        </div>

                                        <div className="h-2 overflow-hidden rounded-full bg-white/70">
                                            <div
                                                className="h-full rounded-full bg-blue-600 transition-all duration-700"
                                                style={{
                                                    width: `${PROGRESS[latestActive.status] ?? 0}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <Link
                                    to={`/orders/${latestActive.id}`}
                                    className="group relative inline-flex items-center gap-2 overflow-hidden rounded-2xl border border-blue-600/30 bg-white/40 px-6 py-2.5 text-sm font-semibold text-blue-700 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-600 hover:text-white hover:shadow-lg hover:shadow-blue-600/25 active:translate-y-0 active:scale-95"
                                >
                                    <span
                                        aria-hidden="true"
                                        className="absolute inset-0 origin-left scale-x-0 bg-blue-600 transition-transform duration-300 ease-out group-hover:scale-x-100"
                                    />
                                    <span className="relative">ติดตามออเดอร์</span>
                                    <span
                                        aria-hidden="true"
                                        className="relative transition-transform duration-300 group-hover:translate-x-1"
                                    >
                                        →
                                    </span>
                                </Link>
                            </div>
                        </section>
                    )}

                    {/* ORDER LIST */}
                    <section>
                        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                            <div>
                                <p className="text-xs font-bold tracking-[0.2em] text-blue-600">
                                    ORDER HISTORY
                                </p>

                                <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                                    รายการออเดอร์
                                </h2>
                            </div>

                            {/* FILTER */}
                            <div
                                role="tablist"
                                className="flex gap-1 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm"
                            >
                                {FILTERS.map((f) => (
                                    <button
                                        key={f.key}
                                        type="button"
                                        role="tab"
                                        aria-selected={filter === f.key}
                                        onClick={() => setFilter(f.key)}
                                        className={`rounded-xl px-3 py-2 text-xs font-bold transition sm:px-4 sm:text-sm ${
                                            filter === f.key
                                                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                                                : 'text-slate-500 hover:bg-blue-50 hover:text-blue-600'
                                        }`}
                                    >
                                        {f.label}
                                        <span
                                            className={`ml-1.5 ${
                                                filter === f.key
                                                    ? 'text-blue-100'
                                                    : 'text-slate-400'
                                            }`}
                                        >
                                            {counts[f.key]}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* EMPTY */}
                        {visible.length === 0 && (
                            <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 px-6 py-14 text-center">
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                                    <Icon name="list" className="h-8 w-8" />
                                </div>

                                <h3 className="mt-5 text-lg font-bold text-slate-800">
                                    {orders.length === 0
                                        ? 'ยังไม่มีออเดอร์'
                                        : 'ไม่พบออเดอร์ในหมวดนี้'}
                                </h3>

                                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                                    {orders.length === 0
                                        ? 'เริ่มต้นด้วยการสร้างออเดอร์ซักผ้ารายการแรกของคุณ'
                                        : 'ลองเลือกดูหมวดอื่น หรือสร้างออเดอร์ใหม่'}
                                </p>

                                {orders.length === 0 && (
                                    <Link
                                        to="/orders/new"
                                        className="mt-6 inline-flex rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-700"
                                    >
                                        สั่งซักผ้า
                                    </Link>
                                )}
                            </div>
                        )}

                        {/* LIST */}
                        {visible.length > 0 && (
                            <div className="divide-y divide-slate-100 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
                                {visible.map((o) => {
                                    const done = DONE.includes(o.status)
                                    const pct = PROGRESS[o.status] ?? 0

                                    return (
                                        <Link
                                            key={o.id}
                                            to={`/orders/${o.id}`}
                                            className="group flex items-center gap-3 px-4 py-4 transition-colors hover:bg-blue-50/40 sm:gap-4 sm:px-6 sm:py-5"
                                        >
                                            <OrderIcon done={done} />

                                            {/* ซ้าย: เลขออเดอร์ + รายละเอียด */}
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-bold text-slate-900 sm:text-base">
                                                    {o.orderNo}
                                                </p>

                                                <p className="mt-0.5 truncate text-sm text-slate-600">
                                                    {o.serviceName}
                                                </p>

                                                <p className="mt-0.5 text-xs text-slate-400">
                                                    ไซส์ {o.size}
                                                </p>

                                                {!done && (
                                                    <div className="mt-2 flex max-w-[180px] items-center gap-2">
                                                        <ProgressBar value={pct} />
                                                        <span className="shrink-0 text-[11px] font-semibold text-slate-400">
                                                            {pct}%
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* ขวา: ราคา + วันที่ + สถานะ */}
                                            <div className="flex shrink-0 flex-col items-end gap-1">
                                                <p className="text-base font-bold text-slate-900 sm:text-lg">
                                                    {money(o.totalPrice)}
                                                </p>

                                                <p className="text-[11px] text-slate-400">
                                                    {dateTime(o.createdAt)}
                                                </p>

                                                <StatusBadge status={o.status} />
                                            </div>

                                            <Icon
                                                name="chevron"
                                                className="h-5 w-5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500"
                                            />
                                        </Link>
                                    )
                                })}
                            </div>
                        )}
                    </section>
                </>
            )}
        </div>
    )
}