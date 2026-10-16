
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import RiderReviewsCard from '../components/RiderReviewsCard'
import { Stars } from '../components/ReviewCard'
import { VERIFY_LABELS, dateTime, errorText } from '../utils'
import { btn, ui, verifyBadge } from '../ui'

const card = 'rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5'

function ProfileSkeleton() {
    return (
        <div className="space-y-5">
            <div className="h-44 animate-pulse rounded-2xl bg-slate-200/70" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200/70" />
                ))}
            </div>
            <div className="h-48 animate-pulse rounded-2xl bg-slate-200/70" />
        </div>
    )
}

function QuickLink({ to, icon, title, description }) {
    return (
        <Link to={to} className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-indigo-200 hover:bg-indigo-50/40 active:scale-[0.99]">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-100">
                {icon}
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900">{title}</p>
                <p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p>
            </div>
            <span className="text-lg text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-500">→</span>
        </Link>
    )
}

export default function RiderDashboardPage() {
    const [me, setMe] = useState(null)
    const [reviews, setReviews] = useState(null)
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        api.get('/rider/me')
            .then((res) => setMe(res.data))
            .catch((err) => setError(errorText(err)))

        api.get('/rider/reviews')
            .then((res) => setReviews(res.data))
            .catch(() => setReviews({ count: 0, average: null, recent: [] }))
    }, [])

    const toggle = async () => {
        if (!me || busy) return

        setError('')
        setBusy(true)

        try {
            const res = await api.put('/rider/availability', {
                isAccepting: !me.isAcceptingJobs,
            })
            setMe(res.data)
        } catch (err) {
            setError(errorText(err))
        } finally {
            setBusy(false)
        }
    }

    if (!me) {
        return error ? <div className={ui.error}>{error}</div> : <ProfileSkeleton />
    }

    const canSubmit = me.status === 'Registered' || me.status === 'Rejected'
    const approved = me.status === 'Approved'
    const name = me.fullName ?? me.legalName ?? 'Rider'
    const initial = name.trim().charAt(0).toUpperCase()
    const accepting = me.isAcceptingJobs

    const verification = {
        Registered: {
            title: 'ยืนยันตัวตนเพื่อเริ่มรับงาน',
            description: 'ส่งเอกสารเพื่อให้ทีมงานตรวจสอบและเปิดใช้งานบัญชีไรเดอร์',
            tone: 'border-amber-200 bg-amber-50',
            iconTone: 'bg-amber-100 text-amber-700',
            icon: '!',
        },
        PendingReview: {
            title: 'เอกสารอยู่ระหว่างตรวจสอบ',
            description: 'ทีมงานกำลังตรวจสอบข้อมูลของคุณ โปรดรอผลการอนุมัติ',
            tone: 'border-blue-200 bg-blue-50/70',
            iconTone: 'bg-blue-100 text-blue-700',
            icon: '…',
        },
        Approved: {
            title: 'ยืนยันตัวตนเรียบร้อยแล้ว',
            description: 'บัญชีของคุณพร้อมใช้งาน สามารถจัดการงานและตรวจสอบรายได้ได้',
            tone: 'border-emerald-200 bg-emerald-50/70',
            iconTone: 'bg-emerald-100 text-emerald-700',
            icon: '✓',
        },
        Rejected: {
            title: 'ต้องแก้ไขเอกสาร',
            description: 'โปรดตรวจสอบเหตุผลที่ถูกปฏิเสธและส่งเอกสารอีกครั้ง',
            tone: 'border-rose-200 bg-rose-50/70',
            iconTone: 'bg-rose-100 text-rose-700',
            icon: '!',
        },
    }[me.status] ?? {
        title: 'สถานะบัญชีไรเดอร์',
        description: 'ตรวจสอบสถานะบัญชีและข้อมูลการยืนยันตัวตนของคุณ',
        tone: 'border-slate-200 bg-slate-50',
        iconTone: 'bg-slate-100 text-slate-600',
        icon: 'i',
    }

    return (
        <div className="mx-auto max-w-6xl space-y-5 pb-8">
            {error && (
                <div className={ui.error}>
                    <div className="flex items-start justify-between gap-3">
                        <span>{error}</span>
                        <button type="button" onClick={() => setError('')} className="shrink-0 font-bold" aria-label="ปิดข้อความแจ้งเตือน">✕</button>
                    </div>
                </div>
            )}

            {/* Profile Header */}
            <section className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/70 to-blue-100/70 p-5 shadow-sm sm:p-6">
                <div className="pointer-events-none absolute -right-12 -top-20 size-56 rounded-full bg-indigo-200/20" />
                <div className="pointer-events-none absolute -bottom-24 right-36 size-48 rounded-full bg-blue-200/20" />

                <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                        <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl border border-white bg-indigo-600 text-2xl font-black text-white shadow-md shadow-indigo-200/60 sm:size-20 sm:text-3xl">
                            {initial}
                        </div>

                        <div className="min-w-0">
                            <p className="text-[11px] font-bold tracking-[0.18em] text-indigo-600">WASHGO RIDER</p>
                            <h1 className="mt-1 truncate text-xl font-black tracking-tight text-slate-900 sm:text-2xl">{name}</h1>
                            <p className="mt-1 text-sm text-slate-500">จัดการบัญชีและการทำงานของคุณ</p>

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span className={verifyBadge(me.status)}>
                                    {VERIFY_LABELS[me.status] ?? me.status}
                                </span>
                                {reviews && reviews.count > 0 && (
                                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-100 bg-white/80 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                        <Stars value={reviews.average} />
                                        <span>{Number(reviews.average).toFixed(1)}</span>
                                        <span className="font-normal text-slate-400">({reviews.count} รีวิว)</span>
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {approved && (
                        <div className="flex w-full flex-col gap-3 rounded-xl border border-white bg-white/80 p-4 shadow-sm sm:w-56">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-bold text-slate-700">สถานะรับงาน</span>
                                <span className={`size-2.5 rounded-full ${accepting ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                            </div>
                            <div>
                                <p className={`text-lg font-black ${accepting ? 'text-emerald-700' : 'text-slate-600'}`}>
                                    {accepting ? 'กำลังเปิดรับงาน' : 'ปิดรับงานอยู่'}
                                </p>
                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                    {accepting ? 'ลูกค้าสามารถมอบหมายงานให้คุณได้' : 'คุณจะไม่รับงานใหม่ในขณะนี้'}
                                </p>
                            </div>
                            <button type="button" className={`${btn('primary')} w-full justify-center disabled:cursor-not-allowed disabled:opacity-60`} onClick={toggle} disabled={busy}>
                                {busy ? 'กำลังบันทึก...' : accepting ? 'ปิดรับงาน' : 'เปิดรับงาน'}
                            </button>
                        </div>
                    )}
                </div>
            </section>

            {/* Overview */}
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M12 3l7 3v5c0 4.5-3 7.5-7 10-4-2.5-7-5.5-7-10V6l7-3Z" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-500">สถานะบัญชี</p>
                            <p className="mt-1 truncate text-base font-bold text-slate-900">{VERIFY_LABELS[me.status] ?? me.status}</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-500">คะแนนรีวิว</p>
                            <p className="mt-1 text-base font-bold text-slate-900">
                                {reviews?.count > 0 ? `${Number(reviews.average).toFixed(1)} / 5` : 'ยังไม่มีคะแนน'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${approved ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12.5 9.5 17 19 7.5" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-500">การรับงาน</p>
                            <p className="mt-1 truncate text-base font-bold text-slate-900">
                                {approved ? (accepting ? 'พร้อมรับงาน' : 'ไม่ได้เปิดรับงาน') : 'รออนุมัติบัญชี'}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Verification */}
            <section className={`${card} space-y-4`}>
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">การยืนยันตัวตน</h2>
                        <p className="mt-1 text-xs text-slate-500">ข้อมูลเอกสารและสถานะการตรวจสอบบัญชีของคุณ</p>
                    </div>
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
                            <rect x="4" y="3" width="16" height="18" rx="2" />
                            <path strokeLinecap="round" d="M8 8h8M8 12h8M8 16h4" />
                        </svg>
                    </div>
                </div>

                <div className={`flex items-start gap-3 rounded-xl border p-4 ${verification.tone}`}>
                    <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg text-lg font-black ${verification.iconTone}`}>
                        {verification.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-900">{verification.title}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{verification.description}</p>
                        {me.status === 'Rejected' && me.rejectReason && (
                            <div className="mt-3 rounded-lg border border-rose-200 bg-white/80 p-3">
                                <p className="text-xs font-bold text-rose-700">เหตุผลที่ถูกปฏิเสธ</p>
                                <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-rose-800">{me.rejectReason}</p>
                            </div>
                        )}
                    </div>
                </div>

                {(me.submittedAt || me.nationalIdMasked) && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {me.submittedAt && (
                            <div className="rounded-xl bg-slate-50 px-4 py-3">
                                <p className="text-xs font-medium text-slate-500">วันที่ส่งเอกสาร</p>
                                <p className="mt-1 text-sm font-semibold text-slate-800">{dateTime(me.submittedAt)}</p>
                            </div>
                        )}
                        {me.nationalIdMasked && (
                            <div className="rounded-xl bg-slate-50 px-4 py-3">
                                <p className="text-xs font-medium text-slate-500">เลขบัตรประชาชน</p>
                                <p className="mt-1 text-sm font-semibold tracking-wide text-slate-800">{me.nationalIdMasked}</p>
                            </div>
                        )}
                    </div>
                )}

                {canSubmit && (
                    <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm leading-5 text-slate-500">
                            {me.status === 'Rejected' ? 'ตรวจสอบข้อมูลให้ครบถ้วนก่อนส่งเอกสารอีกครั้ง' : 'ยืนยันตัวตนเพื่อเปิดใช้งานการรับงาน'}
                        </p>
                        <Link to="/rider/verify" className={`${btn('primary')} inline-flex shrink-0 items-center justify-center`}>
                            {me.status === 'Rejected' ? 'แก้ไขและส่งเอกสารใหม่' : 'ส่งเอกสารยืนยันตัวตน'}
                            <span className="ml-2">→</span>
                        </Link>
                    </div>
                )}
            </section>

            {/* Quick Actions */}
            {approved && (
                <section className="space-y-3">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">เมนูสำหรับไรเดอร์</h2>
                        <p className="mt-1 text-xs text-slate-500">เข้าถึงงานและข้อมูลรายได้ของคุณได้อย่างรวดเร็ว</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <QuickLink
                            to="/rider/jobs"
                            title="งานของฉัน"
                            description="ตรวจสอบงานและอัปเดตสถานะการให้บริการ"
                            icon={
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
                                    <rect x="3" y="5" width="18" height="16" rx="2" />
                                    <path strokeLinecap="round" d="M16 3v4M8 3v4M3 10h18M8 14h3M8 17h6" />
                                </svg>
                            }
                        />
                        <QuickLink
                            to="/rider/earnings"
                            title="รายได้ของฉัน"
                            description="ดูยอดรายได้และประวัติการรับเงิน"
                            icon={
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20m5-15H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                                </svg>
                            }
                        />
                    </div>
                </section>
            )}

            {/* Reviews */}
            <section className="space-y-3">
                <div>
                    <h2 className="text-base font-bold text-slate-900">รีวิวจากลูกค้า</h2>
                    <p className="mt-1 text-xs text-slate-500">ความคิดเห็นและคะแนนที่ลูกค้าให้หลังใช้บริการ</p>
                </div>
                <RiderReviewsCard data={reviews} />
            </section>
        </div>
    )
}
