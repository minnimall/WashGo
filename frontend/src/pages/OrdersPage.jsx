import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import StatusBadge from '../components/StatusBadge'
import { dateTime, errorText, money } from '../utils'
import useAutoRefresh from '../useAutoRefresh'

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
        case 'home':
            return (
                <svg {...p}>
                    <path d="M3 11l9-8 9 8" />
                    <path d="M5 10v10h14V10" />
                </svg>
            )
        case 'plus':
            return (
                <svg {...p}>
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <path d="M12 8v8M8 12h8" />
                </svg>
            )
        case 'pin':
            return (
                <svg {...p}>
                    <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" />
                    <circle cx="12" cy="9.5" r="2.5" />
                </svg>
            )
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
        case 'gift':
            return (
                <svg {...p}>
                    <rect x="3" y="8" width="18" height="4" rx="1" />
                    <path d="M12 8v13M5 12v9h14v-9" />
                    <path d="M12 8c-2-4-6-3-5 0M12 8c2-4 6-3 5 0" />
                </svg>
            )
        case 'drop':
            return (
                <svg {...p}>
                    <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />
                </svg>
            )
        default:
            return null
    }
}

function ProgressBar({ value, tone = 'violet' }) {
    const color = tone === 'green' ? 'bg-emerald-500' : 'bg-violet-500'
    return (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
                className={`h-full rounded-full ${color} transition-all duration-700`}
                style={{ width: `${value}%` }}
            />
        </div>
    )
}

/* ภาพประกอบเครื่องซักผ้า (CSS ล้วน) */
function WasherIllustration() {
    return (
        <div className="relative h-32 w-32 shrink-0 sm:h-40 sm:w-40">
            <div className="absolute inset-0 rounded-full bg-white/40 blur-2xl" />
            <div className="absolute left-3 top-2 h-28 w-24 rotate-3 rounded-3xl bg-white shadow-xl shadow-violet-400/30 sm:h-36 sm:w-28">
                <div className="flex items-center gap-1.5 px-3 pt-3">
                    <span className="h-2 w-2 rounded-full bg-violet-400" />
                    <span className="h-2 w-2 rounded-full bg-violet-200" />
                    <span className="ml-auto h-3 w-5 rounded bg-violet-100" />
                </div>
                <div className="mx-auto mt-3 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 sm:h-[72px] sm:w-[72px]">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-sky-300 to-violet-500 sm:h-14 sm:w-14">
                        <div className="h-5 w-5 rounded-full border-[3px] border-white/60" />
                    </div>
                </div>
            </div>
            <span className="absolute right-0 top-0 h-7 w-7 animate-bounce rounded-full border border-white/70 bg-white/50" />
            <span className="absolute bottom-3 right-2 h-4 w-4 animate-pulse rounded-full bg-white/70" />
            <span className="absolute left-0 top-16 h-3 w-3 animate-pulse rounded-full bg-white/60" />
        </div>
    )
}

function Card({ className = '', children }) {
    return (
        <div className={`rounded-3xl bg-white p-5 shadow-[0_8px_30px_rgba(124,92,240,0.07)] ring-1 ring-slate-100 ${className}`}>
            {children}
        </div>
    )
}

function SectionHead({ title, action }) {
    return (
        <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900 sm:text-lg">{title}</h2>
            {action}
        </div>
    )
}

/* แถบเมนูล่าง — แสดงเฉพาะบนมือถือ */
function MobileTabBar() {
    const tabs = [
        { to: '/orders', icon: 'home', label: 'หน้าแรก', active: true },
        { to: '/orders/new', icon: 'plus', label: 'สั่งซัก' },
        { to: '/locations', icon: 'pin', label: 'ที่อยู่' },
        { to: '/orders', icon: 'list', label: 'ออเดอร์' },
    ]
    return (
        <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-100 bg-white/95 backdrop-blur lg:hidden">
            <div className="mx-auto flex max-w-md items-center justify-around px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
                {tabs.map((t) => (
                    <Link
                        key={t.label}
                        to={t.to}
                        className={`flex w-16 flex-col items-center gap-0.5 text-[11px] font-semibold ${
                            t.active ? 'text-violet-600' : 'text-slate-400'
                        }`}
                    >
                        <Icon name={t.icon} className="h-6 w-6" />
                        {t.label}
                    </Link>
                ))}
            </div>
        </nav>
    )
}

/* ---------- page ---------- */

export default function OrdersPage() {
    const [data, setData] = useState(null)
    const [error, setError] = useState('')

    useEffect(() => {
        api.get('/orders')
            .then((res) => setData(res.data))
            .catch((err) => setError(errorText(err)))
    }, [])

    useAutoRefresh(async () => {
        try {
            const res = await api.get('/orders')
            setData(res.data)
        } catch { /* ข้ามรอบนี้ */ }
    }, { interval: 8000 })

    const orders = data?.items || []
    const totalOrders = data?.total || 0
    const activeOrders = orders.filter((o) => ACTIVE.includes(o.status)).length
    const completedOrders = orders.filter((o) => DONE.includes(o.status)).length

    const latestActive = orders.find((o) => ACTIVE.includes(o.status))
    const goalPercent = totalOrders ? Math.round((completedOrders / totalOrders) * 100) : 0

    return (
        <div className="min-h-screen bg-[#f6f4ff]">
            <div className="mx-auto max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:pb-12 lg:pt-8">

                {/* Header */}
                <header className="mb-5 flex items-center justify-between gap-3 lg:mb-7">
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl lg:text-3xl">
                            สวัสดี 👋
                        </h1>
                        <p className="mt-0.5 text-sm text-slate-500">วันนี้อยากซักอะไรดี?</p>
                    </div>

                    <div className="flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-bold text-violet-600 shadow-sm ring-1 ring-slate-100">
                        <Icon name="drop" className="h-4 w-4" />
                        {activeOrders} กำลังดำเนินการ
                    </div>
                </header>

                {/* Error */}
                {error && (
                    <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">
                        <span className="font-bold">!</span>
                        <span>{error}</span>
                    </div>
                )}

                {/* Loading */}
                {!data && !error && (
                    <div className="grid gap-5 lg:grid-cols-3">
                        <div className="h-52 animate-pulse rounded-3xl bg-white lg:col-span-2" />
                        <div className="h-52 animate-pulse rounded-3xl bg-white" />
                        <div className="h-64 animate-pulse rounded-3xl bg-white lg:col-span-2" />
                        <div className="h-64 animate-pulse rounded-3xl bg-white" />
                    </div>
                )}

                {data && (
                    <div className="grid gap-5 lg:grid-cols-3 lg:gap-6">

                        {/* ===== คอลัมน์หลัก ===== */}
                        <div className="space-y-5 lg:col-span-2 lg:space-y-6">

                            {/* Hero */}
                            <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-violet-200 via-violet-300 to-indigo-300 p-5 sm:p-7">
                                <div className="relative z-10 flex items-center justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-semibold text-violet-900/70 sm:text-sm">
                                            {latestActive ? 'ติดตามต่อจากครั้งที่แล้ว' : 'เริ่มต้นใช้บริการ'}
                                        </p>

                                        <h2 className="mt-1 text-xl font-black leading-tight text-slate-900 sm:text-3xl">
                                            {latestActive ? latestActive.serviceName : 'ซักผ้าให้เป็นเรื่องง่าย'}
                                        </h2>

                                        {latestActive ? (
                                            <div className="mt-4 max-w-xs">
                                                <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-800">
                                                    <span>{latestActive.orderNo}</span>
                                                    <span>{PROGRESS[latestActive.status] ?? 0}%</span>
                                                </div>
                                                <div className="h-2 overflow-hidden rounded-full bg-white/60">
                                                    <div
                                                        className="h-full rounded-full bg-violet-600 transition-all duration-700"
                                                        style={{ width: `${PROGRESS[latestActive.status] ?? 0}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="mt-2 max-w-xs text-sm leading-6 text-violet-900/70">
                                                สั่งซัก ติดตามสถานะ และรับผ้ากลับคืนได้ในที่เดียว
                                            </p>
                                        )}

                                        <Link
                                            to={latestActive ? `/orders/${latestActive.id}` : '/orders/new'}
                                            className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-violet-700 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
                                        >
                                            {latestActive ? 'ติดตามออเดอร์' : 'สั่งซักผ้า'}
                                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-white">
                                                <Icon name="chevron" className="h-3 w-3" />
                                            </span>
                                        </Link>
                                    </div>

                                    <WasherIllustration />
                                </div>
                            </section>

                            {/* Orders */}
                            <section>
                                <SectionHead
                                    title="ออเดอร์ของฉัน"
                                    action={
                                        totalOrders > 0 && (
                                            <Link to="/orders" className="text-sm font-bold text-violet-600 hover:text-violet-700">
                                                ดูทั้งหมด
                                            </Link>
                                        )
                                    }
                                />

                                {orders.length === 0 && (
                                    <Card className="py-10 text-center">
                                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-violet-500">
                                            <Icon name="plus" className="h-7 w-7" />
                                        </div>
                                        <h3 className="mt-4 text-lg font-bold text-slate-800">ยังไม่มีออเดอร์</h3>
                                        <p className="mx-auto mt-1 max-w-xs text-sm text-slate-500">
                                            เริ่มต้นด้วยการสร้างออเดอร์ซักผ้ารายการแรกของคุณ
                                        </p>
                                        <Link
                                            to="/orders/new"
                                            className="mt-5 inline-flex rounded-full bg-violet-600 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-violet-700"
                                        >
                                            สั่งซักผ้า
                                        </Link>
                                    </Card>
                                )}

                                {orders.length > 0 && (
                                    <div className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-[0_8px_30px_rgba(124,92,240,0.07)] ring-1 ring-slate-100">
                                        {orders.slice(0, 5).map((o) => {
                                            const done = DONE.includes(o.status)
                                            const pct = PROGRESS[o.status] ?? 0
                                            return (
                                                <Link
                                                    key={o.id}
                                                    to={`/orders/${o.id}`}
                                                    className="group flex items-center gap-3 p-4 transition hover:bg-violet-50/50 sm:gap-4 sm:p-5"
                                                >
                                                    <div
                                                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                                                            done ? 'bg-emerald-50 text-emerald-500' : 'bg-violet-50 text-violet-500'
                                                        }`}
                                                    >
                                                        <Icon name={done ? 'check' : 'spin'} className="h-6 w-6" />
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                                                            <strong className="text-sm font-bold text-slate-900">{o.orderNo}</strong>
                                                            <StatusBadge status={o.status} />
                                                        </div>
                                                        <p className="mt-0.5 truncate text-xs text-slate-500">
                                                            {o.serviceName} · ไซส์ {o.size}
                                                        </p>
                                                        <div className="mt-2.5 flex items-center gap-2.5">
                                                            <ProgressBar value={pct} tone={done ? 'green' : 'violet'} />
                                                            <span className="w-9 shrink-0 text-right text-[11px] font-semibold text-slate-400">
                                                                {pct}%
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="hidden text-right sm:block">
                                                        <p className="text-sm font-bold text-slate-900">{money(o.totalPrice)}</p>
                                                        <p className="mt-0.5 text-[11px] text-slate-400">{dateTime(o.createdAt)}</p>
                                                    </div>

                                                    <Icon
                                                        name="chevron"
                                                        className="h-5 w-5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-violet-500"
                                                    />
                                                </Link>
                                            )
                                        })}
                                    </div>
                                )}

                                {data.total > 5 && (
                                    <div className="mt-4 text-center">
                                        <Link
                                            to="/orders"
                                            className="inline-flex rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-600"
                                        >
                                            ดูออเดอร์ทั้งหมด
                                        </Link>
                                    </div>
                                )}
                            </section>
                        </div>

                        {/* ===== คอลัมน์ข้าง (เรียงต่อท้ายบนมือถือ) ===== */}
                        <aside className="space-y-5 lg:space-y-6">

                            {/* Goal / สรุป */}
                            <section>
                                <SectionHead title="ภาพรวมของคุณ" />
                                <Card>
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                                            <Icon name="check" className="h-6 w-6" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold text-slate-900">ซักเสร็จแล้ว</p>
                                            <p className="text-xs text-slate-500">
                                                {completedOrders} / {totalOrders} ออเดอร์
                                            </p>
                                        </div>
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-50 text-pink-500">
                                            <Icon name="gift" className="h-5 w-5" />
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <ProgressBar value={goalPercent} />
                                    </div>

                                    <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                                        <div className="rounded-2xl bg-slate-50 py-3">
                                            <p className="text-xl font-black text-slate-900">{totalOrders}</p>
                                            <p className="text-[11px] text-slate-500">ทั้งหมด</p>
                                        </div>
                                        <div className="rounded-2xl bg-amber-50 py-3">
                                            <p className="text-xl font-black text-amber-600">{activeOrders}</p>
                                            <p className="text-[11px] text-amber-700/70">กำลังทำ</p>
                                        </div>
                                        <div className="rounded-2xl bg-emerald-50 py-3">
                                            <p className="text-xl font-black text-emerald-600">{completedOrders}</p>
                                            <p className="text-[11px] text-emerald-700/70">เสร็จแล้ว</p>
                                        </div>
                                    </div>
                                </Card>
                            </section>

                            {/* Quick actions */}
                            <section>
                                <SectionHead title="ทางลัด" />
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { to: '/orders/new', icon: 'plus', label: 'สั่งซักผ้า', tone: 'bg-violet-50 text-violet-600' },
                                        { to: '/locations', icon: 'pin', label: 'ที่อยู่', tone: 'bg-sky-50 text-sky-600' },
                                        { to: '/orders', icon: 'list', label: 'ออเดอร์', tone: 'bg-amber-50 text-amber-600' },
                                    ].map((a) => (
                                        <Link
                                            key={a.label}
                                            to={a.to}
                                            className="flex flex-col items-center gap-2 rounded-3xl bg-white p-4 shadow-[0_8px_30px_rgba(124,92,240,0.07)] ring-1 ring-slate-100 transition hover:-translate-y-1"
                                        >
                                            <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${a.tone}`}>
                                                <Icon name={a.icon} className="h-5 w-5" />
                                            </span>
                                            <span className="text-xs font-bold text-slate-700">{a.label}</span>
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        </aside>
                    </div>
                )}
            </div>
        </div>
    )
}