import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useEarnings } from '../useEarnings'
import { money, METHOD_LABELS } from '../utils'

const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

const monthLabel = (ym) => {
    const [y, m] = ym.split('-')
    return `${MONTHS[Number(m) - 1]} ${Number(y) + 543}`
}

const dayLabel = (d) => `${d.slice(8, 10)}/${d.slice(5, 7)}`

const TH = 7 * 3600 * 1000
const dayKey = (t) => new Date(t + TH).toISOString().slice(0, 10)

function dateTag(iso) {
    const k = dayKey(new Date(iso).getTime())
    if (k === dayKey(Date.now())) return 'วันนี้'
    if (k === dayKey(Date.now() - 86400000)) return 'เมื่อวาน'
    return `${Number(k.slice(8, 10))} ${MONTHS[Number(k.slice(5, 7)) - 1]}`
}

function niceMax(v) {
    if (v <= 0) return 100
    const pow = 10 ** Math.floor(Math.log10(v))
    return [1, 2, 2.5, 5, 10].map((k) => k * pow).find((x) => x >= v) ?? v
}

/* ---------- Loading ---------- */

function Spinner() {
    return <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
}

function Sk({ className }) {
    return <div className={`animate-pulse bg-slate-200/80 ${className}`} />
}

function EarningsSkeleton() {
    return (
        <div className="space-y-5" aria-busy="true" aria-live="polite">
            <div className="flex items-center gap-2 text-sm text-slate-500">
                <Spinner /> กำลังโหลดรายได้...
            </div>
            <Sk className="h-44 rounded-3xl" />
            <div className="grid grid-cols-4 gap-3">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                        <Sk className="h-14 w-14 rounded-2xl" />
                        <Sk className="h-3 w-10 rounded" />
                    </div>
                ))}
            </div>
            <Sk className="h-72 rounded-3xl" />
            <div className="space-y-4">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                        <Sk className="h-11 w-11 rounded-xl" />
                        <div className="space-y-2">
                            <Sk className="h-3 w-28 rounded" />
                            <Sk className="h-3 w-16 rounded" />
                        </div>
                        <Sk className="ml-auto h-4 w-16 rounded" />
                    </div>
                ))}
            </div>
        </div>
    )
}

/* ---------- SVG Icons ---------- */

function Icon({ name, className = 'h-6 w-6' }) {
    const common = {
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.8,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        className,
        'aria-hidden': true,
    }

    const paths = {
        day: (
            <>
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M16 3v4M8 3v4M3 10h18" />
                <path d="m8 14 2 2 4-4" />
            </>
        ),
        month: (
            <>
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M16 3v4M8 3v4M3 10h18" />
                <path d="M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01M16 17h.01" />
            </>
        ),
        jobs: (
            <>
                <rect x="5" y="4" width="14" height="17" rx="2" />
                <path d="M9 4.5V3h6v1.5M8 10h8M8 14h8M8 18h5" />
            </>
        ),
        account: (
            <>
                <circle cx="12" cy="8" r="4" />
                <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
            </>
        ),
        cash: (
            <>
                <rect x="3" y="6" width="18" height="12" rx="2" />
                <circle cx="12" cy="12" r="3" />
                <path d="M7 9h.01M17 15h.01" />
            </>
        ),
        bank: (
            <>
                <path d="m3 9 9-6 9 6" />
                <path d="M4 10h16M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18M4 18h16" />
            </>
        ),
        arrow: (
            <>
                <path d="M5 12h14M13 6l6 6-6 6" />
            </>
        ),
        eye: (
            <>
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                <circle cx="12" cy="12" r="3" />
            </>
        ),
        eyeOff: (
            <>
                <path d="M3 3l18 18" />
                <path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a16 16 0 0 1-4 4.7" />
                <path d="M6.2 6.2C3.5 8.1 2 12 2 12s3.5 7 10 7c1.4 0 2.7-.3 3.8-.8" />
            </>
        ),
    }

    return <svg {...common}>{paths[name] ?? paths.jobs}</svg>
}

/* ---------- รูปไอคอนแบบกำหนดเอง ----------
   วางไฟล์ในโฟลเดอร์ public/ แล้วใส่ path ตรงนี้ (เช่น '/images/icons/day.png')
   เว้นว่าง '' = ใช้ไอคอน SVG เดิม / ถ้าโหลดรูปไม่ได้ก็จะกลับไปใช้ SVG เอง
   แนะนำ PNG/SVG/WebP พื้นหลังโปร่งใส เป็นสี่เหลี่ยมจัตุรัส ขนาดอย่างน้อย 128×128 */
const ICON_IMAGES = {
    day: '/images/days.png',      // ปุ่ม "รายวัน"
    month: '/images/month.png',    // ปุ่ม "รายเดือน"
    jobs: '/images/jobs.png',     // ปุ่ม "รับงาน"
    account: '/images/account.png',  // ปุ่ม "บัญชี"
    cash: '/images/cash.png',     // งานที่เสร็จล่าสุด: จ่ายเงินสด
    bank: '/images/bank.png',     // งานที่เสร็จล่าสุด: โอนเงิน
}

function AppIcon({ name, frameClass = '', className = 'h-6 w-6', imgClassName = 'h-12 w-12' }) {
    const src = ICON_IMAGES[name]
    const [failed, setFailed] = useState(false)

    if (!src || failed) {
        return (
            <span className={frameClass}>
                <Icon name={name} className={className} />
            </span>
        )
    }

    return (
        <img
            src={src}
            alt=""
            draggable={false}
            onError={() => setFailed(true)}
            className={`${imgClassName} shrink-0 select-none object-contain`}
        />
    )
}

/* ---------- กราฟแท่ง ---------- */

function Bar3D({ pct, depth, tone, onSelect, label }) {
    const tones = {
        base: ['from-indigo-500 to-indigo-400', 'bg-indigo-300', 'bg-indigo-700'],
        active: ['from-indigo-700 to-indigo-500', 'bg-indigo-400', 'bg-indigo-900'],
        empty: ['from-slate-200 to-slate-100', 'bg-slate-200', 'bg-slate-300'],
    }

    const [front, top, side] = tones[tone]

    return (
        <button
            type="button"
            aria-label={label}
            onMouseEnter={onSelect}
            onFocus={onSelect}
            onClick={onSelect}
            className="group relative flex h-full min-w-0 flex-1 cursor-pointer items-end justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
            <span
                className="relative block w-[62%] transition-[height] duration-700 ease-out group-hover:brightness-110"
                style={{ height: `${pct}%`, minHeight: tone === 'empty' ? 3 : 8, marginRight: depth }}
            >
                <span className={`absolute inset-0 bg-gradient-to-t ${front} rounded-t-sm`} />
                <span
                    className={`absolute left-0 w-full ${top}`}
                    style={{ bottom: '100%', height: depth, transformOrigin: 'bottom left', transform: 'skewX(-45deg)' }}
                />
                <span
                    className={`absolute ${side}`}
                    style={{ left: '100%', bottom: 0, width: depth, height: '100%', transformOrigin: 'bottom left', transform: 'skewY(-45deg)' }}
                />
            </span>
        </button>
    )
}

function Chart3D({ items, labelOf, depth, fmt }) {
    const [ready, setReady] = useState(false)
    const [sel, setSel] = useState(Math.max(0, items.length - 1))

    useEffect(() => {
        const t = setTimeout(() => setReady(true), 60)
        return () => clearTimeout(t)
    }, [])

    useEffect(() => {
        setSel(Math.max(0, items.length - 1))
    }, [items])

    const top = niceMax(Math.max(0, ...items.map((i) => i.total)))
    const grid = [1, 0.75, 0.5, 0.25, 0]
    const step = items.length > 10 ? 5 : 1
    const cur = items[sel] ?? items[items.length - 1]

    if (!items.length || !cur) {
        return <div className="flex min-h-56 items-center justify-center text-sm text-slate-400">ไม่มีข้อมูลกราฟ</div>
    }

    return (
        <div>
            <div className="relative pl-12 pr-1 pt-4">
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 top-4">
                    {grid.map((g) => (
                        <div key={g} className="absolute left-0 right-0" style={{ bottom: `${g * 100}%` }}>
                            <span className="absolute -top-2 left-0 w-10 text-right text-[10px] tabular-nums text-slate-400">
                                {Math.round(top * g).toLocaleString('th-TH')}
                            </span>
                            <div className="ml-12 border-t border-dashed border-slate-200" />
                        </div>
                    ))}
                </div>

                <div className="relative flex h-48 items-end sm:h-56">
                    {items.map((it, i) => (
                        <Bar3D
                            key={it.key}
                            pct={ready ? (it.total / top) * 100 : 0}
                            depth={depth}
                            tone={it.total <= 0 ? 'empty' : i === sel ? 'active' : 'base'}
                            onSelect={() => setSel(i)}
                            label={`${labelOf(it)} ${it.total} บาท`}
                        />
                    ))}
                </div>

                <div className="h-2 rounded-full bg-slate-200/70" />

                <div className="flex">
                    {items.map((it, i) => (
                        <div key={it.key} className="min-w-0 flex-1 pt-1 text-center text-[10px] text-slate-400">
                            {i % step === 0 || i === items.length - 1 ? labelOf(it) : ''}
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 text-sm">
                <div>
                    <p className="text-xs text-slate-500">ช่วงเวลา</p>
                    <p className="mt-1 font-semibold text-slate-800">{labelOf(cur)}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-slate-500">{cur.jobs} งาน</p>
                    <p className="mt-1 text-lg font-bold text-indigo-700">{fmt(cur.total)}</p>
                </div>
            </div>
        </div>
    )
}

/* ---------- ปุ่มลัด ---------- */

function Action({ icon, label, to, onClick, active }) {
    // กรอบนี้ใช้เฉพาะตอนต้องแสดงไอคอน SVG สำรอง
    const frame = `flex h-14 w-14 items-center justify-center rounded-2xl border transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md group-active:scale-95 ${active ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'border-slate-200 bg-white text-indigo-600 group-hover:border-indigo-200 group-hover:bg-indigo-50'}`

    const inner = (
        <>
            <AppIcon
                name={icon}
                frameClass={frame}
                className="h-6 w-6"
                imgClassName={`h-14 w-14 transition-all duration-200 group-active:scale-95 sm:h-16 sm:w-16 ${
                    active ? 'scale-110 drop-shadow-lg' : 'group-hover:-translate-y-1 group-hover:scale-105'
                }`}
            />
            <span className={`text-xs ${active ? 'font-semibold text-indigo-700' : 'font-medium text-slate-600'}`}>
                {label}
            </span>
            {/* ขีดบอกว่าปุ่มไหนถูกเลือกอยู่ (ใช้แทนกรอบสีม่วงเวลาเป็นรูป) */}
            <span
                aria-hidden="true"
                className={`-mt-1 h-1 w-5 rounded-full transition-colors ${active ? 'bg-indigo-600' : 'bg-transparent'}`}
            />
        </>
    )

    const cls = 'group flex flex-col items-center gap-2 rounded-2xl py-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400'

    return to ? (
        <Link to={to} className={cls}>{inner}</Link>
    ) : (
        <button type="button" onClick={onClick} className={cls}>{inner}</button>
    )
}

export default function RiderEarningsPage() {
    const { data, loading, error, reload } = useEarnings(30000)
    const [view, setView] = useState('day')
    const [hide, setHide] = useState(false)

    const fmt = (n) => (hide ? '฿ ••••' : money(n))

    if (!data) {
        return (
            <div className="mx-auto w-full max-w-2xl">
                {loading ? (
                    <EarningsSkeleton />
                ) : (
                    <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-center">
                        <p className="text-sm text-red-600">{error || 'โหลดข้อมูลรายได้ไม่สำเร็จ'}</p>
                        <button
                            type="button"
                            onClick={reload}
                            className="mt-3 rounded-xl bg-white px-4 py-2 text-sm font-medium text-red-600 shadow-sm ring-1 ring-red-100 hover:bg-red-50"
                        >
                            ลองใหม่
                        </button>
                    </div>
                )}
            </div>
        )
    }

    const days = data.days.map((d) => ({ ...d, key: d.date }))
    const months = data.months.map((m) => ({ ...m, key: m.month }))

    return (
        <div className="mx-auto w-full max-w-7xl space-y-5">
            {error && (
                <div className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600 ring-1 ring-red-100">
                    {error}
                </div>
            )}

            {/* ยอดรายได้รวม */}
            <section className="relative isolate overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-indigo-500 via-indigo-700 to-violet-950 p-6 text-white shadow-xl shadow-indigo-950/20 sm:p-7">

                {/* Background decoration */}
                <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                    {/* แสงด้านบน */}
                    <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-violet-400/25 blur-3xl" />

                    {/* แสงด้านล่าง */}
                    <div className="absolute -bottom-32 -left-16 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl" />

                    {/* วงกลมเพิ่มมิติ */}
                    <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full border border-white/[0.08]" />
                    <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full border border-white/[0.08]" />

                    {/* แสงสะท้อน */}
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                </div>

                {/* Header */}
                <div className="relative flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <span className="text-sm font-medium tracking-wide text-indigo-100">
                            รายได้สะสมทั้งหมด
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={() => setHide((v) => !v)}
                        aria-label={hide ? 'แสดงยอดเงิน' : 'ซ่อนยอดเงิน'}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.08] text-indigo-100 backdrop-blur-sm transition hover:border-white/25 hover:bg-white/15 active:scale-95"
                    >
                        <Icon name={hide ? 'eyeOff' : 'eye'} className="h-5 w-5" />
                    </button>
                </div>

                {/* Total income */}
                <div className="relative mt-5">
                    <div className="text-xs font-medium text-indigo-200">
                        ยอดรายได้รวม
                    </div>

                    <div className="mt-1.5 break-words text-4xl font-bold tracking-tight drop-shadow-sm sm:text-5xl">
                        {hide ? '••••••••' : fmt(data.allTime)}
                    </div>
                </div>

                {/* Divider */}
                <div className="relative my-6 h-px bg-gradient-to-r from-white/25 via-white/10 to-transparent" />


                {/* Footer action */}
                <div className="relative mt-5 flex items-center justify-between gap-3">
                    <span className="text-xs text-indigo-200/80">
                        สรุปรายได้จากการรับงาน
                    </span>

                    <Link
                        to="/rider/jobs"
                        aria-label="ไปหน้างาน"
                        className="group flex h-10 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3.5 text-sm font-medium text-white shadow-sm backdrop-blur-sm transition hover:border-white/30 hover:bg-white/20 active:scale-95"
                    >
                        ดูงาน
                        <Icon
                            name="arrow"
                            className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                        />
                    </Link>
                </div>
            </section>

            {/* ปุ่มลัดพร้อมไอคอน (รูปหรือ SVG) */}
            <section className="p-1 sm:p-2">
                <div className="grid grid-cols-4 gap-1 sm:gap-3">
                    <Action icon="day" label="รายวัน" active={view === 'day'} onClick={() => setView('day')} />
                    <Action icon="month" label="รายเดือน" active={view === 'month'} onClick={() => setView('month')} />
                    <Action icon="jobs" label="รับงาน" to="/rider/jobs" />
                    <Action icon="account" label="บัญชี" to="/rider" />
                </div>
            </section>

            {/* กราฟรายได้ */}
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">
                            {view === 'day' ? 'รายได้ 30 วันล่าสุด' : 'รายได้ 6 เดือนล่าสุด'}
                        </h2>
                        <p className="mt-1 text-xs text-slate-500">เลือกแท่งกราฟเพื่อดูรายละเอียดรายได้</p>
                    </div>
                    <div className="inline-flex rounded-xl bg-slate-100 p-1">
                        {[['day', 'รายวัน'], ['month', 'รายเดือน']].map(([k, label]) => (
                            <button
                                key={k}
                                type="button"
                                onClick={() => setView(k)}
                                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${view === k ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                <Chart3D
                    key={view}
                    items={view === 'day' ? days : months}
                    labelOf={(i) => view === 'day' ? dayLabel(i.date) : monthLabel(i.month)}
                    depth={view === 'day' ? 7 : 14}
                    fmt={fmt}
                />
            </section>

            {/* งานที่เสร็จล่าสุด */}
            <section>
                <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">งานที่เสร็จล่าสุด</h2>
                        <p className="mt-1 text-xs text-slate-500">รายการงานที่ยืนยันการชำระเงินแล้ว</p>
                    </div>
                    <Link to="/rider/jobs" className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50">
                        ดูทั้งหมด
                    </Link>
                </div>

                {data.recent.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                            <Icon name="jobs" className="h-6 w-6" />
                        </div>
                        <p className="mt-3 text-sm font-medium text-slate-600">ยังไม่มีงานที่ชำระเงินเสร็จสิ้น</p>
                        <p className="mt-1 text-xs text-slate-400">ประวัติงานจะแสดงที่นี่เมื่อมีรายการสำเร็จ</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        {data.recent.map((j) => (
                            <Link
                                key={j.orderId}
                                to={`/rider/jobs/${j.orderId}`}
                                className="flex items-center gap-3 px-4 py-4 transition hover:bg-indigo-50/50 active:bg-slate-50 sm:px-5"
                            >
                                {/* ไอคอนวิธีชำระเงิน (รูปหรือ SVG) */}
                                <AppIcon
                                    name={j.method === 'Cash' ? 'cash' : 'bank'}
                                    frameClass={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${j.method === 'Cash' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}
                                    className="h-6 w-6"
                                    imgClassName="h-14 w-14"
                                />

                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-semibold text-slate-900">{j.orderNo}</div>
                                    <div className="mt-1 text-xs text-slate-500">
                                        {j.method ? (METHOD_LABELS[j.method] ?? j.method) : '-'}
                                    </div>
                                    <div className="mt-1 text-xs text-slate-400">
                                        ค่าส่ง {fmt(j.deliveryFee)}
                                    </div>
                                </div>

                                <div className="flex shrink-0 flex-col items-end justify-center gap-1 text-right">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-base font-semibold tracking-tight text-slate-900">+{fmt(j.amount)}</span>
                                        <span className="text-[10px] font-medium text-slate-500">บาท</span>
                                    </div>

                                    <div className="text-[10px] text-slate-400">{dateTag(j.at)}</div>

                                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-semibold leading-none text-emerald-700">
                                        <Icon name="check" className="h-3 w-3" />
                                        ชำระแล้ว
                                    </span>
                                </div>

                                <span className="hidden text-slate-300 sm:block">
                                    <Icon name="arrow" className="h-4 w-4" />
                                </span>
                            </Link>
                        ))}
                    </div>
                )}
            </section>

            <p className="pb-2 text-xs leading-5 text-slate-400">
                ยอดนี้คือเงินที่รับจากลูกค้า ก่อนหักค่าซักที่คุณจ่ายร้าน โดยนับเฉพาะงานที่ยืนยันการชำระเงินแล้ว
            </p>
        </div>
    )
}