
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'
import StatusBadge from '../components/StatusBadge'
import {
    DETERGENT_LABELS,
    SIZE_DESC,
    dateTime,
    errorText,
    money,
} from '../utils'
import { btn, ui } from '../ui'
import useAutoRefresh from '../useAutoRefresh'

const TABS = [
    ['available', 'งานที่รอรับ'],
    ['active', 'งานที่กำลังทำ'],
    ['history', 'ประวัติ'],
]

export default function RiderJobsPage() {
    const navigate = useNavigate()

    const [tab, setTab] = useState('available')
    const [pos, setPos] = useState(null)
    const [geoMsg, setGeoMsg] = useState('')
    const [data, setData] = useState(null)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [busyId, setBusyId] = useState(null)

    // =========================================================
    // Load data
    // =========================================================

    const load = useCallback(async () => {
        setError('')
        setLoading(true)

        try {
        if (tab === 'available') {
            const res = await api.get('/rider/jobs/available', {
            params: pos ?? {},
            })

            setData(res.data)
        } else {
            const res = await api.get('/rider/jobs', {
            params: {
                active: tab === 'active',
            },
            })

            setData(Array.isArray(res.data) ? res.data : [])
        }
        } catch (err) {
        setError(errorText(err))

        if (tab === 'available') {
            setData({
            accepting: false,
            items: [],
            })
        } else {
            setData([])
        }
        } finally {
        setLoading(false)
        }
    }, [tab, pos])

    // =========================================================
    // Load when tab / position changes
    // =========================================================

    useEffect(() => {
        let cancelled = false

        const fetchData = async () => {
        setError('')
        setLoading(true)

        try {
            let result

            if (tab === 'available') {
            const res = await api.get('/rider/jobs/available', {
                params: pos ?? {},
            })

            result = res.data
            } else {
            const res = await api.get('/rider/jobs', {
                params: {
                active: tab === 'active',
                },
            })

            result = Array.isArray(res.data) ? res.data : []
            }

            if (!cancelled) {
            setData(result)
            }
        } catch (err) {
            if (!cancelled) {
            setError(errorText(err))

            if (tab === 'available') {
                setData({
                accepting: false,
                items: [],
                })
            } else {
                setData([])
            }
            }
        } finally {
            if (!cancelled) {
            setLoading(false)
            }
        }
        }

        fetchData()

        return () => {
        cancelled = true
        }
    }, [tab, pos])

    // งานใหม่เข้า/ถูกรับไปแล้วจะอัปเดตเอง (ref กันผลของแท็บเก่าไปทับแท็บที่เพิ่งสลับ)
    const tabNow = useRef(tab)
    useEffect(() => { tabNow.current = tab })

    useAutoRefresh(async () => {
        const t = tab
        try {
        const res = t === 'available'
            ? await api.get('/rider/jobs/available', { params: pos ?? {} })
            : await api.get('/rider/jobs', { params: { active: t === 'active' } })
        if (tabNow.current === t) setData(res.data)
        } catch { /* ข้ามรอบนี้ */ }
    }, { interval: 8000, enabled: busyId === null })

    // =========================================================
    // Location
    // =========================================================

    const locateMe = () => {
        if (!navigator.geolocation) {
        setGeoMsg('เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง')
        return
        }

        setGeoMsg('กำลังหาตำแหน่ง...')

        navigator.geolocation.getCurrentPosition(
        (p) => {
            setPos({
            lat: p.coords.latitude,
            lng: p.coords.longitude,
            })

            setGeoMsg('เรียงตามระยะใกล้ที่สุดแล้ว')
        },
        () => {
            setGeoMsg(
            'อ่านตำแหน่งไม่ได้ กรุณาอนุญาตการเข้าถึงตำแหน่ง'
            )
        },
        {
            timeout: 10000,
            enableHighAccuracy: false,
        }
        )
    }

    // =========================================================
    // Accept job
    // =========================================================

    const accept = async (id) => {
        setError('')
        setBusyId(id)

        try {
        await api.post(`/rider/jobs/${id}/accept`)
        navigate(`/rider/jobs/${id}`)
        } catch (err) {
        setError(errorText(err))
        await load()
        } finally {
        setBusyId(null)
        }
    }

    // =========================================================
    // Change tab
    // =========================================================

    const changeTab = (nextTab) => {
        if (nextTab === tab) return

        setTab(nextTab)
        setError('')
        setGeoMsg('')
        setData(null)
    }

    // =========================================================
    // Render
    // =========================================================

    return (
        <div className="pb-10">
        {/* =====================================================
            Header
        ====================================================== */}

        <div className="mb-7 flex items-end justify-between gap-4">
            <div>
            <h1 className={ui.h1}>งาน</h1>

            <p className="mt-1 text-sm text-gray-500">
                จัดการงานรับ-ส่งและติดตามสถานะงานของคุณ
            </p>
            </div>

            <Link
            to="/rider"
            className="hidden rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:border-gray-300 hover:text-gray-900 sm:inline-flex"
            >
            บัญชี Rider
            </Link>
        </div>

        {/* =====================================================
            Tabs
        ====================================================== */}

        <div className="mb-7 border-b border-gray-200">
            <div className="flex gap-7 overflow-x-auto">
            {TABS.map(([key, label]) => {
                const active = tab === key

                return (
                <button
                    key={key}
                    type="button"
                    onClick={() => changeTab(key)}
                    className={[
                    'relative whitespace-nowrap pb-3 text-sm font-semibold transition',
                    active
                        ? 'text-blue-600'
                        : 'text-gray-500 hover:text-gray-800',
                    ].join(' ')}
                >
                    {label}

                    {active && (
                    <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 rounded-full bg-blue-600" />
                    )}
                </button>
                )
            })}
            </div>
        </div>

        {/* =====================================================
            Error
        ====================================================== */}

        {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <div className="flex items-start gap-3">
                <AlertIcon />

                <div className="min-w-0">
                <p className="text-sm font-semibold text-red-800">
                    ไม่สามารถโหลดข้อมูลได้
                </p>

                <p className="mt-1 text-sm text-red-700">
                    {error}
                </p>

                <Link
                    to="/rider"
                    className="mt-1 inline-block text-sm font-medium text-red-700 underline"
                >
                    ดูสถานะบัญชี
                </Link>
                </div>
            </div>
            </div>
        )}

        {/* =====================================================
            Loading
        ====================================================== */}

        {loading && !data && (
            <div className="space-y-4">
            <JobSkeleton />
            <JobSkeleton />
            </div>
        )}

        {/* =====================================================
            Available
        ====================================================== */}

        {tab === 'available' && data && (
            <AvailableJobs
            data={data}
            geoMsg={geoMsg}
            locateMe={locateMe}
            busyId={busyId}
            accept={accept}
            />
        )}

        {/* =====================================================
            Active
        ====================================================== */}

        {tab === 'active' && Array.isArray(data) && (
            <ActiveJobs data={data} />
        )}

        {/* =====================================================
            History
        ====================================================== */}

        {tab === 'history' && Array.isArray(data) && (
            <HistoryJobs data={data} />
        )}
        </div>
    )
}

/* ============================================================
   AVAILABLE
============================================================ */

function AvailableJobs({
    data,
    geoMsg,
    locateMe,
    busyId,
    accept,
}) {
    const items = Array.isArray(data.items) ? data.items : []

    if (!data.accepting) {
        return (
        <EmptyPanel
            icon={<PauseIcon />}
            title="คุณปิดรับงานอยู่"
            description="เปิดรับงานจากหน้าบัญชี Rider เพื่อดูงานที่รอรับ"
            action={
            <Link
                to="/rider"
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
                เปิดรับงาน
            </Link>
            }
        />
        )
    }

    return (
        <div>
        {/* Toolbar */}

        <div className="mb-5 flex flex-col gap-3 border-b border-gray-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
            <p className="text-sm font-semibold text-gray-900">
                งานที่พร้อมรับ
            </p>

            <p className="mt-0.5 text-xs text-gray-500">
                {items.length} รายการ
            </p>
            </div>

            <div className="flex items-center gap-3">
            <button
                type="button"
                onClick={locateMe}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
            >
                <LocationIcon />
                เรียงตามระยะใกล้ฉัน
            </button>

            {geoMsg && (
                <span className="hidden text-xs text-gray-500 sm:inline">
                {geoMsg}
                </span>
            )}
            </div>
        </div>

        {/* Empty */}

        {items.length === 0 && (
            <EmptyPanel
            icon={<InboxIcon />}
            title="ยังไม่มีงานรอรับ"
            description="ขณะนี้ยังไม่มีงานใหม่เข้ามา งานใหม่จะแสดงที่หน้านี้เมื่อมีรายการ"
            />
        )}

        {/* Jobs */}

        {items.length > 0 && (
            <div className="space-y-4">
            {items.map((job) => (
                <AvailableJobCard
                key={job.id}
                job={job}
                busy={busyId === job.id}
                onAccept={() => accept(job.id)}
                />
            ))}
            </div>
        )}

        {items.length > 0 && (
            <div className="mt-5 flex items-center gap-2 text-xs text-gray-400">
            <LockIcon />
            ที่อยู่ลูกค้าจะแสดงหลังจากรับงานเท่านั้น
            </div>
        )}
        </div>
    )
}

/* ============================================================
   AVAILABLE CARD
============================================================ */

function AvailableJobCard({
    job,
    busy,
    onAccept,
}) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white transition hover:border-gray-300 hover:shadow-sm">
        {/* Header */}

        <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
            <div className="flex items-center gap-2">
                <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-600">
                งานใหม่
                </span>

                <span className="text-xs text-gray-400">
                {dateTime(job.createdAt)}
                </span>
            </div>

            <h3 className="mt-2 text-base font-bold text-gray-900">
                {job.orderNo}
            </h3>
            </div>

            {job.distanceKm != null && (
            <div className="flex items-center gap-2 text-sm">
                <LocationIcon />

                <span className="font-semibold text-gray-700">
                {job.distanceKm} กม.
                </span>
            </div>
            )}
        </div>

        {/* Details */}

        <div className="grid gap-x-8 gap-y-5 px-5 py-5 sm:grid-cols-2">
            <DetailItem
            icon={<ServiceIcon />}
            label="บริการ"
            value={job.serviceName}
            />

            <DetailItem
            icon={<BoxIcon />}
            label="ขนาด"
            value={`ไซส์ ${job.size}`}
            subValue={SIZE_DESC[job.size]}
            />

            <DetailItem
            icon={<BottleIcon />}
            label="น้ำยา"
            value={
                DETERGENT_LABELS[job.detergentSource] ??
                job.detergentSource
            }
            />

            <DetailItem
            icon={<PlusIcon />}
            label="รายการเสริม"
            value={
                job.extraItems > 0
                ? `${job.extraItems} ชิ้น`
                : 'ไม่มี'
            }
            />
        </div>

        {/* Footer */}

        <div className="flex flex-col gap-4 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
            <p className="text-xs text-gray-400">
                ยอดที่ลูกค้าจ่าย
            </p>

            <p className="mt-0.5 text-lg font-bold text-blue-600">
                {money(job.totalPrice)}
            </p>
            </div>

            <button
            type="button"
            disabled={busy}
            onClick={onAccept}
            className={`${btn('primary')} w-full sm:w-auto`}
            >
            {busy ? 'กำลังรับงาน...' : 'รับงาน'}
            </button>
        </div>
        </div>
    )
}

/* ============================================================
   ACTIVE
============================================================ */

function ActiveJobs({ data }) {
    if (data.length === 0) {
        return (
        <EmptyPanel
            icon={<ClipboardIcon />}
            title="ยังไม่มีงานที่กำลังทำ"
            description="เมื่อคุณรับงานแล้ว รายการงานที่กำลังดำเนินการจะแสดงที่นี่"
            action={
            <button
                type="button"
                onClick={() => {
                window.history.replaceState(
                    null,
                    '',
                    '/rider/jobs'
                )
                window.location.reload()
                }}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
                รีเฟรชรายการ
            </button>
            }
        />
        )
    }

    return (
        <div className="space-y-4">
        {data.map((job) => (
            <ActiveJobCard key={job.id} job={job} />
        ))}
        </div>
    )
}

function ActiveJobCard({ job }) {
    return (
        <Link
        to={`/rider/jobs/${job.id}`}
        className="group block rounded-xl border border-gray-200 bg-white transition hover:border-blue-200 hover:shadow-sm"
        >
        <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-gray-900">
                {job.orderNo}
                </h3>

                <StatusBadge status={job.status} />
            </div>

            <p className="mt-1 text-sm text-gray-500">
                {job.serviceName} · ไซส์ {job.size}
            </p>
            </div>

            <div className="flex items-center gap-5">
            <div className="text-right">
                <p className="text-xs text-gray-400">
                ยอดงาน
                </p>

                <p className="font-bold text-gray-900">
                {money(job.totalPrice)}
                </p>
            </div>

            <ChevronIcon />
            </div>
        </div>

        <div className="border-t border-gray-100 px-5 py-3">
            <div className="flex items-start gap-2 text-sm text-gray-500">
            <LocationIcon />

            <span className="line-clamp-1">
                {job.pickupAddress || 'ไม่ระบุสถานที่รับ'}
            </span>
            </div>
        </div>
        </Link>
    )
}

/* ============================================================
   HISTORY
============================================================ */

function HistoryJobs({ data }) {
    if (data.length === 0) {
        return (
        <EmptyPanel
            icon={<HistoryIcon />}
            title="ยังไม่มีประวัติ"
            description="งานที่คุณดำเนินการเสร็จแล้วจะแสดงอยู่ในหน้านี้"
        />
        )
    }

    return (
        <div className="space-y-3">
        {data.map((job) => (
            <HistoryJobCard key={job.id} job={job} />
        ))}
        </div>
    )
}

function HistoryJobCard({ job }) {
    return (
        <Link
        to={`/rider/jobs/${job.id}`}
        className="group block rounded-xl border border-gray-200 bg-white transition hover:border-gray-300 hover:shadow-sm"
        >
        <div className="px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-gray-900">
                    {job.orderNo}
                </h3>

                <StatusBadge status={job.status} />
                </div>

                <p className="mt-1 text-xs text-gray-400">
                {dateTime(job.createdAt)}
                </p>
            </div>

            <div className="flex items-center justify-between gap-5 sm:justify-end">
                <div className="text-left sm:text-right">
                <p className="text-xs text-gray-400">
                    ยอดงาน
                </p>

                <p className="font-semibold text-gray-800">
                    {money(job.totalPrice)}
                </p>
                </div>

                <ChevronIcon />
            </div>
            </div>

            <div className="mt-4 grid gap-4 border-t border-gray-100 pt-4 sm:grid-cols-2">
            <DetailItem
                icon={<ServiceIcon />}
                label="บริการ"
                value={job.serviceName}
            />

            <DetailItem
                icon={<BoxIcon />}
                label="ขนาด"
                value={`ไซส์ ${job.size}`}
                subValue={SIZE_DESC[job.size]}
            />
            </div>

            {job.pickupAddress && (
            <div className="mt-4 flex items-start gap-2 text-sm text-gray-500">
                <LocationIcon />

                <span className="line-clamp-1">
                {job.pickupAddress}
                </span>
            </div>
            )}
        </div>
        </Link>
    )
}

/* ============================================================
   EMPTY PANEL
============================================================ */

function EmptyPanel({
    icon,
    title,
    description,
    action,
}) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-14 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-50 text-gray-500">
            {icon}
        </div>

        <h3 className="mt-4 text-base font-bold text-gray-900">
            {title}
        </h3>

        <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-gray-500">
            {description}
        </p>

        {action && (
            <div className="mt-5">
            {action}
            </div>
        )}
        </div>
    )
}

/* ============================================================
   DETAIL ITEM
============================================================ */

function DetailItem({
    icon,
    label,
    value,
    subValue,
}) {
    return (
        <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
            {icon}
        </div>

        <div className="min-w-0">
            <p className="text-xs text-gray-400">
            {label}
            </p>

            <p className="mt-0.5 truncate text-sm font-semibold text-gray-800">
            {value}
            </p>

            {subValue && (
            <p className="mt-0.5 text-xs text-gray-400">
                {subValue}
            </p>
            )}
        </div>
        </div>
    )
}

/* ============================================================
   SKELETON
============================================================ */

function JobSkeleton() {
    return (
        <div className="animate-pulse rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
            <div className="h-3 w-16 rounded bg-gray-200" />
            <div className="mt-3 h-5 w-32 rounded bg-gray-200" />
        </div>

        <div className="grid gap-5 px-5 py-5 sm:grid-cols-2">
            <SkeletonItem />
            <SkeletonItem />
            <SkeletonItem />
            <SkeletonItem />
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4">
            <div>
            <div className="h-3 w-20 rounded bg-gray-200" />
            <div className="mt-2 h-5 w-24 rounded bg-gray-200" />
            </div>

            <div className="h-9 w-24 rounded-lg bg-gray-200" />
        </div>
        </div>
    )
}

function SkeletonItem() {
    return (
        <div className="flex gap-3">
        <div className="h-9 w-9 rounded-lg bg-gray-200" />

        <div className="flex-1">
            <div className="h-3 w-14 rounded bg-gray-200" />
            <div className="mt-2 h-4 w-28 rounded bg-gray-200" />
        </div>
        </div>
    )
}

/* ============================================================
   SVG ICONS
============================================================ */

function Icon({
    children,
    size = 18,
    strokeWidth = 1.8,
}) {
    return (
        <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        >
        {children}
        </svg>
    )
}

function AlertIcon() {
    return (
        <Icon size={19}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
        </Icon>
    )
}

function PauseIcon() {
    return (
        <Icon size={25}>
        <rect x="7" y="5" width="3" height="14" rx="1" />
        <rect x="14" y="5" width="3" height="14" rx="1" />
        </Icon>
    )
}

function InboxIcon() {
    return (
        <Icon size={25}>
        <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-13Z" />
        <path d="M4 14h4l1.5 2h5L16 14h4" />
        </Icon>
    )
}

function ClipboardIcon() {
    return (
        <Icon size={25}>
        <rect x="5" y="4" width="14" height="17" rx="2" />
        <path d="M9 4.5V3h6v1.5" />
        <path d="M9 9h6" />
        <path d="M9 13h6" />
        <path d="M9 17h3" />
        </Icon>
    )
}

function HistoryIcon() {
    return (
        <Icon size={25}>
        <path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" />
        <path d="M3.5 5v4h4" />
        <path d="M12 7v5l3 2" />
        </Icon>
    )
}

function LocationIcon() {
    return (
        <Icon size={17}>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
        </Icon>
    )
}

function LockIcon() {
    return (
        <Icon size={14}>
        <rect x="5" y="10" width="14" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </Icon>
    )
}

function ServiceIcon() {
    return (
        <Icon size={17}>
        <path d="M6 4h12" />
        <path d="M5 7h14" />
        <path d="M6 7v11a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7" />
        <path d="M9 11h6" />
        <path d="M9 15h4" />
        </Icon>
    )
}

function BoxIcon() {
    return (
        <Icon size={17}>
        <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
        <path d="m4 7.5 8 4.5 8-4.5" />
        <path d="M12 12v9" />
        </Icon>
    )
}

function BottleIcon() {
    return (
        <Icon size={17}>
        <path d="M10 3h4" />
        <path d="M10 3v3l-2 2v11h8V8l-2-2V3" />
        <path d="M8 11h8" />
        </Icon>
    )
}

function PlusIcon() {
    return (
        <Icon size={17}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 8v8" />
        <path d="M8 12h8" />
        </Icon>
    )
}

function ChevronIcon() {
    return (
        <Icon size={18}>
        <path d="m9 6 6 6-6 6" />
        </Icon>
    )
}

