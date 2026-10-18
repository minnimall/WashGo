import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import useAutoRefresh from '../useAutoRefresh'
import { money } from '../utils'
import { useAuth } from '../AuthContext'

/* ============================================================
   ใส่รูปที่นี่
   - ADMIN_HERO_IMAGE : รูปประกอบแบนเนอร์ (PNG พื้นหลังโปร่งใส)
   - STAT_IMAGES      : รูปประกอบการ์ดตัวเลขด้านบน 5 ใบ
   วางไฟล์ไว้ในโฟลเดอร์ public/ ตาม path ด้านล่าง
   ถ้ายังไม่มีไฟล์ จะแสดงไอคอนเดิมแทนอัตโนมัติ
   ============================================================ */
const ADMIN_HERO_IMAGE = '/images/account.png'

const STAT_IMAGES = {
    customers: '/images/admin/customers.png',
    riders: '/images/admin/riders.png',
    ordersToday: '/images/admin/orders-today.png',
    active: '/images/admin/active.png',
    paidToday: '/images/admin/paid-today.png',
}

// เก็บผลล่าสุดไว้ข้ามหน้า ผูกกับผู้ใช้ (ไม่มีตัวระบุผู้ใช้ = ไม่ใช้แคช)
let cache = { uid: null, data: null }

/* ---------- style helpers ---------- */

/*
  พาเลตสี
  teal   = #3E8C91   (rgb 62,140,145)
  aqua   = #6DAFB3   (rgb 109,175,179)
  purple = #5A45B0   (rgb 90,69,176)
  เปลี่ยนสีได้โดยแทนที่รหัสสีและค่า rgb ในไฟล์นี้
*/

/* เงาแบบหลายชั้น ให้การ์ดดูลอยและมีมิติ */
const CARD_DEPTH =
    'bg-gradient-to-b from-white to-slate-50/70 ring-1 ring-slate-200/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_14px_32px_-14px_rgba(109,175,179,0.30),0_2px_8px_rgba(15,23,42,0.05)]'

/* กล่องไอคอน + สีข้อความ + สีการ์ดมูลค่า ของแต่ละโทน */
const TONE = {
    teal: {
        tile: 'bg-[#3E8C91]/10 text-[#3E8C91] ring-1 ring-[#3E8C91]/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_6px_14px_-6px_rgba(62,140,145,0.5)]',
        text: 'text-[#3E8C91]',
        card: 'from-[#3E8C91]/10 via-[#3E8C91]/5 to-white ring-[#3E8C91]/20 shadow-[0_14px_26px_-14px_rgba(62,140,145,0.55),inset_0_1px_0_rgba(255,255,255,0.95)]',
        blob: 'bg-[#3E8C91]/10',
    },
    aqua: {
        tile: 'bg-[#6DAFB3]/15 text-[#5AA3A8] ring-1 ring-[#6DAFB3]/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_6px_14px_-6px_rgba(109,175,179,0.55)]',
        text: 'text-[#4F9CA1]',
        card: 'from-[#6DAFB3]/15 via-[#6DAFB3]/5 to-white ring-[#6DAFB3]/25 shadow-[0_14px_26px_-14px_rgba(109,175,179,0.6),inset_0_1px_0_rgba(255,255,255,0.95)]',
        blob: 'bg-[#6DAFB3]/15',
    },
    purple: {
        tile: 'bg-[#5A45B0]/10 text-[#5A45B0] ring-1 ring-[#5A45B0]/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_6px_14px_-6px_rgba(90,69,176,0.5)]',
        text: 'text-[#5A45B0]',
        card: 'from-[#5A45B0]/10 via-[#5A45B0]/5 to-white ring-[#5A45B0]/20 shadow-[0_14px_26px_-14px_rgba(90,69,176,0.5),inset_0_1px_0_rgba(255,255,255,0.95)]',
        blob: 'bg-[#5A45B0]/10',
    },
    /* โทนเตือน (ใช้เมื่อมีรายการค้าง) */
    amber: {
        tile: 'bg-amber-50 text-amber-600 ring-1 ring-amber-200/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_6px_14px_-6px_rgba(245,158,11,0.45)]',
        text: 'text-amber-600',
    },
}

/* แยกตัวเลขกับหน่วยของ money() เช่น "1,430 บาท" → { num: "1,430", unit: "บาท" } */
function splitMoney(v) {
    const s = String(money(v))
    const m = s.match(/^(.*?[\d.,]+)\s*(.*)$/)
    return m ? { num: m[1], unit: m[2] } : { num: s, unit: '' }
}

function Icon({ name, className = 'h-6 w-6' }) {
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
        case 'users':
            return (
                <svg {...p}>
                    <circle cx="9" cy="8" r="3.5" />
                    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
                    <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 20a6.5 6.5 0 0 0-3-5.5" />
                </svg>
            )
        case 'rider':
            return (
                <svg {...p}>
                    <circle cx="6" cy="17" r="3" />
                    <circle cx="18" cy="17" r="3" />
                    <path d="M6 17l4-8h5l3 8M10 9H8M14 9l-2 8" />
                </svg>
            )
        case 'clipboard':
            return (
                <svg {...p}>
                    <rect x="5" y="4" width="14" height="17" rx="2" />
                    <path d="M9 4h6v3H9zM9 12h6M9 16h4" />
                </svg>
            )
        case 'spin':
            return (
                <svg {...p}>
                    <path d="M20 12a8 8 0 1 1-2.3-5.7" />
                    <path d="M20 4v5h-5" />
                </svg>
            )
        case 'wallet':
            return (
                <svg {...p}>
                    <rect x="3" y="6" width="18" height="14" rx="3" />
                    <path d="M3 10h18M16 15h2" />
                </svg>
            )
        case 'calendar':
            return (
                <svg {...p}>
                    <rect x="3" y="5" width="18" height="16" rx="3" />
                    <path d="M3 10h18M8 3v4M16 3v4" />
                </svg>
            )
        case 'clock':
            return (
                <svg {...p}>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                </svg>
            )
        case 'ban':
            return (
                <svg {...p}>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M5.6 5.6l12.8 12.8" />
                </svg>
            )
        case 'chevron':
            return (
                <svg {...p}>
                    <path d="M9 6l6 6-6 6" />
                </svg>
            )
        default:
            return null
    }
}

function Sk({ className }) {
    return <div className={`animate-pulse bg-slate-200/80 ${className}`} />
}

/* รูปประกอบของการ์ดตัวเลข — ไม่มีรูป/โหลดไม่ได้ จะใช้กล่องไอคอนแทน */
function StatVisual({ image, icon, tile }) {
    const [failed, setFailed] = useState(false)

    if (image && !failed) {
        return (
            <img
                src={image}
                alt=""
                onError={() => setFailed(true)}
                className="h-14 w-14 shrink-0 object-contain drop-shadow-md sm:h-16 sm:w-16"
            />
        )
    }

    return (
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl sm:h-14 sm:w-14 ${tile}`}>
            <Icon name={icon} className="h-6 w-6 sm:h-7 sm:w-7" />
        </div>
    )
}

/* การ์ดตัวเลขด้านบน: รูป/ไอคอนซ้าย / ข้อมูลขวา */
function Stat({ icon, image, tone = 'teal', label, value, sub, warn, className = '' }) {
    const t = TONE[warn ? 'amber' : tone]

    return (
        <div
            className={`flex items-center gap-3.5 rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_20px_36px_-14px_rgba(109,175,179,0.45),0_4px_10px_rgba(15,23,42,0.06)] motion-reduce:transition-none ${CARD_DEPTH} ${className}`}
        >
            <StatVisual image={image} icon={icon} tile={t.tile} />

            <div className="min-w-0">
                <p className="truncate text-xs font-medium text-slate-500">{label}</p>
                <p className="mt-0.5 break-words text-xl font-bold tabular-nums leading-tight text-slate-900 sm:text-2xl">
                    {value}
                </p>
                {sub && <p className={`mt-0.5 truncate text-[11px] font-semibold ${t.text}`}>{sub}</p>}
            </div>
        </div>
    )
}

function Panel({ title, subtitle, action, className = '', children }) {
    return (
        <section className={`rounded-3xl p-5 sm:p-6 ${CARD_DEPTH} ${className}`}>
            <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-base font-bold text-slate-900">{title}</h2>
                    {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
                </div>
                {action}
            </div>
            {children}
        </section>
    )
}

/* ---------- กราฟโดนัท 3 มิติ (นูนเด่น) ---------- */

/* วงแหวนมองจากด้านบน — gloss = true เฉพาะหน้าบน ให้มีแสงเงาตกกระทบ */
function RingSvg({ segments, total, gloss }) {
    let acc = 0

    return (
        <svg viewBox="0 0 120 120" className="h-full w-full">
            {gloss && (
                <defs>
                    <linearGradient id="ringGloss" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor="#fff" stopOpacity="0.6" />
                        <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
                        <stop offset="1" stopColor="#000" stopOpacity="0.22" />
                    </linearGradient>
                </defs>
            )}

            <g transform="rotate(-90 60 60)">
                <circle cx="60" cy="60" r="42" fill="none" stroke="#e2e8f0" strokeWidth="20" />

                {total > 0 &&
                    segments.map((s) => {
                        const pct = (s.value / total) * 100
                        const el = (
                            <circle
                                key={s.label}
                                cx="60"
                                cy="60"
                                r="42"
                                fill="none"
                                stroke={s.color}
                                strokeWidth="20"
                                pathLength="100"
                                strokeDasharray={`${pct} ${100 - pct}`}
                                strokeDashoffset={-acc}
                            />
                        )
                        acc += pct
                        return el
                    })}
            </g>

            {/* แสงเงาไล่จากซ้ายบนไปขวาล่าง ทำให้วงนูน */}
            {gloss && (
                <circle cx="60" cy="60" r="42" fill="none" stroke="url(#ringGloss)" strokeWidth="20" />
            )}

            {/* ขอบสว่างด้านนอก / เงาขอบด้านใน */}
            <circle cx="60" cy="60" r="52" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="1.5" />
            <circle cx="60" cy="60" r="32" fill="none" stroke="#000" strokeOpacity="0.1" strokeWidth="2" />
            <circle cx="60" cy="60" r="31" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="1" />
        </svg>
    )
}

const DONUT_DEPTH = 22 // ความหนาของโดนัท (px) — เพิ่มเพื่อให้นูนมากขึ้น

function Donut({ segments, total, centerValue, centerLabel }) {
    const tilt = 'translateY(-50%) perspective(700px) rotateX(52deg)'

    return (
        <div className="relative h-52 w-52 shrink-0">
            {/* เงาบนพื้น */}
            <div className="absolute bottom-0 left-1/2 h-8 w-44 -translate-x-1/2 rounded-full bg-slate-900/30 blur-lg" />

            {/* ชั้นความหนา: ล่างสุดเข้มสุด ไล่ขึ้นมาสว่างขึ้น */}
            {Array.from({ length: DONUT_DEPTH }).map((_, idx) => {
                const i = DONUT_DEPTH - idx
                const b = 0.5 + (idx / DONUT_DEPTH) * 0.3
                return (
                    <div
                        key={i}
                        aria-hidden="true"
                        className="absolute inset-0"
                        style={{
                            transform: `translateY(${i}px)`,
                            filter: `brightness(${b.toFixed(2)}) saturate(1.15)`,
                        }}
                    >
                        <div className="absolute left-0 top-1/2 h-52 w-52" style={{ transform: tilt }}>
                            <RingSvg segments={segments} total={total} />
                        </div>
                    </div>
                )
            })}

            {/* หน้าบน */}
            <div className="absolute inset-0" style={{ filter: 'drop-shadow(0 3px 3px rgba(15,23,42,0.28))' }}>
                <div className="absolute left-0 top-1/2 h-52 w-52" style={{ transform: tilt }}>
                    <RingSvg segments={segments} total={total} gloss />
                </div>
            </div>

            {/* ตัวเลขกลางวง */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black tabular-nums leading-none text-slate-900">{centerValue}</span>
                <span className="mt-1 text-[11px] font-medium leading-none text-slate-500">{centerLabel}</span>
            </div>
        </div>
    )
}

/* ---------- การ์ดมูลค่าที่ชำระแล้ว ---------- */

function PayCard({ icon, tone, label, value, sub, className = '' }) {
    const t = TONE[tone]
    const { num, unit } = splitMoney(value)

    return (
        <div
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br p-3 ring-1 transition-all duration-300 hover:-translate-y-1 sm:p-4 motion-reduce:transition-none ${t.card} ${className}`}
        >
            {/* วงกลมตกแต่ง */}
            <div className={`pointer-events-none absolute -right-5 -top-5 h-20 w-20 rounded-full ${t.blob}`} />

            <div className="relative flex items-center gap-3 sm:block">
                <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${t.tile}`}
                >
                    <Icon name={icon} className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
                </div>

                <div className="min-w-0 sm:mt-3">
                    <p className={`text-[11px] font-semibold sm:text-xs ${t.text}`}>{label}</p>

                    <p className="mt-0.5 flex flex-wrap items-baseline gap-x-1 break-all font-bold tabular-nums leading-tight text-slate-900">
                        <span className="text-lg sm:text-xl">{num}</span>
                        {unit && <span className="text-[11px] font-semibold text-slate-500 sm:text-xs">{unit}</span>}
                    </p>

                    {sub && <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">{sub}</p>}
                </div>
            </div>
        </div>
    )
}

/* ภาพประกอบแบนเนอร์ */
function HeroArt() {
    const [failed, setFailed] = useState(false)

    if (!failed) {
        return (
            <img
                src={ADMIN_HERO_IMAGE}
                alt=""
                onError={() => setFailed(true)}
                className="h-full object-contain object-bottom"
            />
        )
    }

    return (
        <svg viewBox="0 0 180 120" className="h-full" aria-hidden="true">
            <ellipse cx="90" cy="112" rx="78" ry="6" fill="#6DAFB3" opacity="0.35" />
            <rect x="22" y="62" width="30" height="48" rx="7" fill="#6DAFB3" />
            <rect x="64" y="40" width="30" height="70" rx="7" fill="#3E8C91" />
            <rect x="106" y="18" width="30" height="92" rx="7" fill="#5A45B0" />
            <circle cx="151" cy="40" r="9" fill="#a5b4fc" />
            <path d="M151 49v22" stroke="#8b7fd6" strokeWidth="3" strokeLinecap="round" />
            <circle cx="28" cy="30" r="4" fill="#fff" opacity="0.9" />
            <circle cx="46" cy="18" r="2.5" fill="#fff" opacity="0.8" />
        </svg>
    )
}

/* ---------- page ---------- */

export default function AdminDashboardPage() {
    const { user } = useAuth()
    const uid = user?.id ?? user?.userId ?? user?.email ?? null
    const [d, setD] = useState(() => (uid && cache.uid === uid ? cache.data : null))
    const [error, setError] = useState('')

    const load = useCallback(async () => {
        try {
            const res = await api.get('/admin/dashboard')
            if (uid) cache = { uid, data: res.data }
            setD(res.data)
            setError('')
        } catch {
            setError('โหลดข้อมูลภาพรวมไม่สำเร็จ')
        }
    }, [uid])

    useAutoRefresh(load, { interval: 30000, immediate: true })

    if (!d) {
        return error ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-center text-sm text-red-600">{error}</div>
        ) : (
            <div className="space-y-5" aria-busy="true">
                <Sk className="h-36 rounded-2xl" />
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Sk key={i} className="h-24 rounded-2xl" />
                    ))}
                </div>
                <div className="grid gap-5 lg:grid-cols-3">
                    <Sk className="h-64 rounded-2xl lg:col-span-2" />
                    <Sk className="h-64 rounded-2xl" />
                </div>
            </div>
        )
    }

    /* ข้อมูลโดนัท */
    const segments = [
        { label: 'เสร็จสิ้น', value: d.ordersCompleted, color: '#3E8C91' },
        { label: 'กำลังดำเนินการ', value: d.ordersActive, color: '#5A45B0' },
        { label: 'รอ Rider รับงาน', value: d.ordersWaiting, color: '#6DAFB3' },
        { label: 'ยกเลิก', value: d.ordersCancelled, color: '#F59E0B' },
    ]
    const segTotal = segments.reduce((s, x) => s + x.value, 0)
    const completeRate = segTotal > 0 ? Math.round((d.ordersCompleted / segTotal) * 100) : null

    /* รายการที่ต้องดำเนินการ */
    const notices = [
        {
            key: 'pending',
            to: '/admin/riders',
            icon: 'rider',
            tone: 'purple',
            title: 'Rider รอตรวจสอบ',
            count: d.ridersPending,
            warn: d.ridersPending > 0,
            desc: d.ridersPending > 0 ? 'มีบัญชี Rider ที่รออนุมัติ กดเพื่อตรวจสอบ' : 'ไม่มีรายการค้าง',
        },
        {
            key: 'waiting',
            icon: 'clock',
            tone: 'teal',
            title: 'ออเดอร์รอ Rider รับงาน',
            count: d.ordersWaiting,
            warn: d.ordersWaiting > 0,
            desc: d.ordersWaiting > 0 ? 'ออเดอร์ที่ยังไม่มี Rider รับ' : 'ไม่มีออเดอร์ค้างรอ',
        },
        {
            key: 'suspended',
            to: '/admin/users',
            icon: 'ban',
            tone: 'aqua',
            title: 'บัญชีที่ถูกระงับ/ลบ',
            count: d.suspended,
            warn: false,
            desc: 'ดูและจัดการบัญชีผู้ใช้',
        },
    ]

    return (
        <div className="space-y-5 sm:space-y-6">

            {/* ===== Banner ===== */}
            <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#6DAFB3]/25 via-[#6DAFB3]/10 to-[#5A45B0]/10 px-6 py-7 ring-1 ring-[#6DAFB3]/25 sm:px-8 sm:py-8">
                <div className="pointer-events-none absolute -left-10 -top-16 h-48 w-48 rounded-full bg-white/60" />
                <div className="pointer-events-none absolute bottom-0 right-40 hidden h-24 w-24 rounded-full bg-white/50 blur-xl sm:block" />

                <div className="relative z-10 max-w-lg">
                    <p className="text-base font-semibold text-slate-800 sm:text-lg">สวัสดี 👋</p>
                    <h1 className="mt-0.5 text-2xl font-black tracking-tight text-[#5A45B0] sm:text-3xl">
                        {user?.fullName || 'ผู้ดูแลระบบ'}
                    </h1>
                    <p className="mt-2 text-sm text-slate-500">
                        ภาพรวมระบบ WashGo · อัปเดตอัตโนมัติ (ข้อมูลอาจหน่วงได้สูงสุดประมาณ 30 วินาที)
                    </p>
                </div>

                <div className="pointer-events-none absolute bottom-0 right-6 hidden h-[88%] sm:block">
                    <HeroArt />
                </div>
            </section>

            {error && (
                <div className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600 ring-1 ring-red-100">{error}</div>
            )}

            {/* ===== Stats (ใส่รูปแทนไอคอนได้ที่ STAT_IMAGES) ===== */}
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
                <Stat
                    icon="users"
                    image={STAT_IMAGES.customers}
                    tone="teal"
                    label="ลูกค้า"
                    value={d.customers}
                    sub="บัญชีลูกค้า"
                />
                <Stat
                    icon="rider"
                    image={STAT_IMAGES.riders}
                    tone="purple"
                    label="Rider ทั้งหมด"
                    value={d.riders}
                    sub={`อนุมัติแล้ว ${d.ridersApproved}`}
                />
                <Stat
                    icon="clipboard"
                    image={STAT_IMAGES.ordersToday}
                    tone="aqua"
                    label="ออเดอร์วันนี้"
                    value={d.ordersToday}
                    sub={`ทั้งหมด ${d.ordersTotal}`}
                />
                <Stat
                    icon="spin"
                    image={STAT_IMAGES.active}
                    tone="teal"
                    label="กำลังดำเนินการ"
                    value={d.ordersActive}
                    sub={d.ordersWaiting > 0 ? `รอรับงาน ${d.ordersWaiting}` : 'ไม่มีงานค้างรอ'}
                    warn={d.ordersWaiting > 0}
                />
                <Stat
                    icon="wallet"
                    image={STAT_IMAGES.paidToday}
                    tone="purple"
                    label="ชำระแล้ววันนี้"
                    value={money(d.paidToday)}
                    sub={`เดือนนี้ ${money(d.paidMonth)}`}
                    className="col-span-2 sm:col-span-1"
                />
            </section>

            {/* ===== ภาพรวมออเดอร์ + ต้องดำเนินการ ===== */}
            <div className="grid gap-5 sm:gap-6 lg:grid-cols-3">
                <Panel
                    title="ภาพรวมออเดอร์"
                    subtitle={`ทั้งหมด ${d.ordersTotal} · วันนี้ ${d.ordersToday}`}
                    className="lg:col-span-2"
                >
                    <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-10">
                        <Donut
                            segments={segments}
                            total={segTotal}
                            centerValue={completeRate === null ? '–' : `${completeRate}%`}
                            centerLabel="เสร็จสิ้น"
                        />

                        <ul className="w-full flex-1 space-y-3">
                            {segments.map((s) => {
                                const pct = segTotal > 0 ? Math.round((s.value / segTotal) * 100) : 0
                                return (
                                    <li key={s.label} className="flex items-center gap-3 text-sm">
                                        <span
                                            className="h-3 w-3 shrink-0 rounded-full shadow-sm ring-2 ring-white"
                                            style={{ backgroundColor: s.color }}
                                        />
                                        <span className="flex-1 text-slate-600">{s.label}</span>
                                        <span className="font-bold tabular-nums text-slate-900">{s.value}</span>
                                        <span className="w-10 text-right text-xs font-semibold tabular-nums text-slate-400">
                                            {pct}%
                                        </span>
                                    </li>
                                )
                            })}
                        </ul>
                    </div>
                </Panel>

                <Panel title="ต้องดำเนินการ" subtitle="รายการที่ควรตรวจสอบ">
                    <div className="space-y-3">
                        {notices.map((n) => {
                            const body = (
                                <div className="group flex items-center gap-3 rounded-2xl bg-white p-2.5 shadow-[0_6px_16px_-6px_rgba(15,23,42,0.15)] ring-1 ring-slate-100 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_22px_-8px_rgba(109,175,179,0.4)]">
                                    <div
                                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                                            n.warn ? TONE.amber.tile : TONE[n.tone].tile
                                        }`}
                                    >
                                        <Icon name={n.icon} className="h-5 w-5" />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-slate-800">{n.title}</p>
                                        <p className="truncate text-xs text-slate-400">{n.desc}</p>
                                    </div>

                                    {/* ช่องตัวเลขความกว้างคงที่ ทำให้เลขทุกแถวเรียงตรงกัน */}
                                    <span
                                        className={`inline-flex h-7 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
                                            n.warn ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                                        }`}
                                    >
                                        {n.count}
                                    </span>

                                    {/* ช่องลูกศรเว้นไว้เสมอ แม้แถวที่ไม่มีลิงก์ */}
                                    <span className="flex w-4 shrink-0 justify-center">
                                        {n.to && (
                                            <Icon
                                                name="chevron"
                                                className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#3E8C91]"
                                            />
                                        )}
                                    </span>
                                </div>
                            )

                            return n.to ? (
                                <Link key={n.key} to={n.to} className="block">
                                    {body}
                                </Link>
                            ) : (
                                <div key={n.key}>{body}</div>
                            )
                        })}
                    </div>
                </Panel>
            </div>

            {/* ===== มูลค่าที่ชำระแล้ว + ทางลัด ===== */}
            <div className="grid gap-5 sm:gap-6 lg:grid-cols-3">
                <Panel
                    title="มูลค่าออเดอร์ที่ชำระแล้ว"
                    subtitle="ลูกค้าจ่ายให้ Rider โดยตรง"
                    className="lg:col-span-2"
                >
                    {/* มือถือ: แถวบน 2 ใบ + แถวล่าง 1 ใบยาวเต็ม / จอใหญ่: 3 ใบในแถวเดียว */}
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
                        <PayCard icon="clock" tone="teal" label="วันนี้" value={d.paidToday} />
                        <PayCard icon="calendar" tone="aqua" label="เดือนนี้" value={d.paidMonth} />
                        <PayCard
                            icon="wallet"
                            tone="purple"
                            label="ทั้งหมด"
                            value={d.paidAll}
                            sub={`${d.paidJobs} งาน`}
                            className="col-span-2 sm:col-span-1"
                        />
                    </div>

                    <p className="mt-4 text-xs leading-5 text-slate-400">
                        ตัวเลขนี้เป็นมูลค่าออเดอร์ที่ชำระแล้วทั้งหมด ไม่ใช่รายได้ของแพลตฟอร์ม
                        (ค่าธรรมเนียมแพลตฟอร์มตอนนี้ตั้งไว้ที่ 0)
                    </p>
                </Panel>

                <Panel title="ทางลัด" subtitle="เข้าถึงงานที่ใช้บ่อย">
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { to: '/admin/riders', icon: 'rider', label: 'ตรวจสอบ Rider', tone: 'purple' },
                            { to: '/admin/users', icon: 'users', label: 'จัดการผู้ใช้', tone: 'teal' },
                        ].map((q) => (
                            <Link
                                key={q.to}
                                to={q.to}
                                className="flex flex-col items-center gap-2.5 rounded-2xl bg-white p-3 text-center shadow-[0_6px_16px_-6px_rgba(15,23,42,0.15)] ring-1 ring-slate-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_24px_-10px_rgba(109,175,179,0.45)]"
                            >
                                <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${TONE[q.tone].tile}`}>
                                    <Icon name={q.icon} className="h-7 w-7" />
                                </span>
                                <span className="text-xs font-semibold text-slate-700">{q.label}</span>
                            </Link>
                        ))}
                    </div>
                </Panel>
            </div>
        </div>
    )
}