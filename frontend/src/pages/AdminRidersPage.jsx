import { useCallback, useEffect, useState } from 'react'
import api from '../api'
import { VERIFY_LABELS, dateTime, errorText } from '../utils'
import { btn, ui, verifyBadge } from '../ui'

const FILTERS = ['PendingReview', 'Approved', 'Rejected', 'Registered']

const FILTER_DESCRIPTIONS = {
    PendingReview: 'รายการ Rider ที่รอตรวจสอบเอกสารและอนุมัติ',
    Approved: 'Rider ที่ผ่านการตรวจสอบและอนุมัติแล้ว',
    Rejected: 'Rider ที่ถูกปฏิเสธการสมัคร',
    Registered: 'Rider ที่ลงทะเบียนและพร้อมใช้งานในระบบ',
}

const EMPTY_MESSAGES = {
    PendingReview: {
        title: 'ยังไม่มี Rider ที่รอตรวจสอบ',
        description: 'เมื่อมี Rider สมัครและส่งเอกสารเข้ามา รายการจะปรากฏในหน้านี้',
    },
    Approved: {
        title: 'ยังไม่มี Rider ที่อนุมัติ',
        description: 'Rider ที่ผ่านการตรวจสอบและอนุมัติแล้วจะแสดงในรายการนี้',
    },
    Rejected: {
        title: 'ยังไม่มีรายการที่ถูกปฏิเสธ',
        description: 'รายการ Rider ที่ถูกปฏิเสธจะแสดงในหน้านี้',
    },
    Registered: {
        title: 'ยังไม่มี Rider ที่ลงทะเบียน',
        description: 'Rider ที่ลงทะเบียนและพร้อมให้บริการจะแสดงในรายการนี้',
    },
}

function EmptyState({ status }) {
    const data = EMPTY_MESSAGES[status]

    return (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                {status === 'PendingReview' ? '📋' : status === 'Approved' ? '✓' : status === 'Rejected' ? '!' : '🚴'}
            </div>

            <h3 className="mt-4 text-base font-semibold text-slate-900">
                {data.title}
            </h3>

            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
                {data.description}
            </p>
        </div>
    )
}

function InfoItem({ label, value }) {
    return (
        <div className="min-w-0">
            <p className="text-xs text-slate-400">{label}</p>
            <p className="mt-1 break-words text-sm font-medium text-slate-800">
                {value || <span className="font-normal text-slate-400">ยังไม่มีข้อมูล</span>}
            </p>
        </div>
    )
}

export default function AdminRidersPage() {
    const [status, setStatus] = useState('PendingReview')
    const [items, setItems] = useState(null)
    const [selected, setSelected] = useState(null)
    const [reason, setReason] = useState('')
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)

    const loadList = useCallback(async () => {
        setItems(null)
        setError('')

        try {
            const res = await api.get('/admin/riders', {
                params: { status },
            })

            setItems(res.data)
        } catch (err) {
            setItems([])
            setError(errorText(err))
        }
    }, [status])

    useEffect(() => {
        loadList()
    }, [loadList])

    const open = async (userId) => {
        setError('')
        setReason('')

        try {
            const res = await api.get(`/admin/riders/${userId}`)
            setSelected(res.data)
        } catch (err) {
            setError(errorText(err))
        }
    }

    const review = async (action) => {
        if (!selected) return

        if (action === 'reject' && !reason.trim()) {
            setError('กรุณาระบุเหตุผลที่ปฏิเสธ')
            return
        }

        setError('')
        setBusy(true)

        try {
            await api.post(
                `/admin/riders/${selected.userId}/${action}`,
                action === 'reject'
                    ? { reason: reason.trim() }
                    : undefined,
            )

            setSelected(null)
            setReason('')
            await loadList()
        } catch (err) {
            setError(errorText(err))
        } finally {
            setBusy(false)
        }
    }

    const doc = (kind) =>
        `/api/admin/riders/${selected.userId}/documents/${kind}`

    const docLink = (kind, label) => (
        <a
            href={doc(kind)}
            target="_blank"
            rel="noopener noreferrer"
            className="group block overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition hover:border-blue-300 hover:shadow-sm"
        >
            <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                <img
                    src={doc(kind)}
                    alt={label}
                    className="h-full w-full object-contain transition group-hover:scale-[1.02]"
                />
            </div>

            <div className="border-t border-slate-200 bg-white px-3 py-2.5">
                <p className="text-sm font-medium text-slate-800">
                    {label}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                    คลิกเพื่อเปิดเอกสาร
                </p>
            </div>
        </a>
    )

    return (
        <main className="mx-auto w-full max-w-7xl px-3 py-5 sm:px-6 lg:px-8">
            <div className="mb-5">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                            Rider Management
                        </p>

                        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                            ตรวจสอบ Rider
                        </h1>

                        <p className="mt-1 text-sm text-slate-500">
                            ตรวจสอบข้อมูลส่วนตัวและเอกสารก่อนอนุมัติ Rider เข้าสู่ระบบ
                        </p>
                    </div>

                    {items && (
                        <div className="text-sm text-slate-500">
                            ทั้งหมด{' '}
                            <span className="font-semibold text-slate-900">
                                {items.length}
                            </span>{' '}
                            รายการ
                        </div>
                    )}
                </div>
            </div>

            {error && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            <section className="mb-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
                <div className="flex min-w-max gap-1">
                    {FILTERS.map((s) => {
                        const active = status === s

                        return (
                            <button
                                key={s}
                                onClick={() => {
                                    setSelected(null)
                                    setReason('')
                                    setStatus(s)
                                }}
                                className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                                    active
                                        ? 'bg-slate-900 text-white shadow-sm'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                            >
                                {VERIFY_LABELS[s]?.split(' (')[0] ?? s}
                            </button>
                        )
                    })}
                </div>
            </section>

            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm font-medium text-slate-800">
                    {VERIFY_LABELS[status]}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                    {FILTER_DESCRIPTIONS[status]}
                </p>
            </div>

            {!items && (
                <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
                    <div className="mx-auto size-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-700" />
                    <p className="mt-4 text-sm text-slate-500">
                        กำลังโหลดข้อมูล...
                    </p>
                </div>
            )}

            {items?.length === 0 && (
                <EmptyState status={status} />
            )}

            {items?.length > 0 && (
                <div className="space-y-3">
                    {items.map((r) => (
                        <div
                            key={r.userId}
                            className={`rounded-2xl border bg-white p-4 shadow-sm transition ${
                                selected?.userId === r.userId
                                    ? 'border-blue-300 ring-2 ring-blue-50'
                                    : 'border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="text-base font-semibold text-slate-900">
                                            {r.fullName || 'ไม่ระบุชื่อ'}
                                        </h2>

                                        <span className={verifyBadge(r.status)}>
                                            {VERIFY_LABELS[r.status] ?? r.status}
                                        </span>
                                    </div>

                                    <p className="mt-1 truncate text-sm text-slate-500">
                                        {r.email || 'ไม่มีอีเมล'}
                                    </p>

                                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                                        <span>
                                            พาหนะ: {r.vehicle || 'ยังไม่มีข้อมูล'}
                                        </span>

                                        {r.submittedAt && (
                                            <span>
                                                ส่งเมื่อ {dateTime(r.submittedAt)}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <button
                                    className={btn('default', 'sm')}
                                    onClick={() => open(r.userId)}
                                >
                                    ตรวจสอบข้อมูล
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {selected && (
                <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-200 bg-slate-50/70 px-4 py-4 sm:px-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                    Rider Information
                                </p>

                                <h2 className="mt-1 text-lg font-bold text-slate-900">
                                    {selected.legalName || 'ไม่ระบุชื่อ'}
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    ข้อมูลสำหรับตรวจสอบตัวตนและการสมัคร Rider
                                </p>
                            </div>

                            <span className={verifyBadge(selected.status)}>
                                {VERIFY_LABELS[selected.status] ?? selected.status}
                            </span>
                        </div>
                    </div>

                    <div className="p-4 sm:p-5">
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <InfoItem
                                label="อีเมล"
                                value={selected.email}
                            />

                            <InfoItem
                                label="เบอร์โทรศัพท์"
                                value={selected.phone}
                            />

                            <InfoItem
                                label="เลขบัตรประชาชน"
                                value={selected.nationalId}
                            />

                            <InfoItem
                                label="พาหนะ"
                                value={selected.vehicle}
                            />

                            <InfoItem
                                label="PromptPay"
                                value={selected.promptPayId}
                            />

                            <InfoItem
                                label="วันที่ส่งข้อมูล"
                                value={
                                    selected.submittedAt
                                        ? dateTime(selected.submittedAt)
                                        : null
                                }
                            />

                            <InfoItem
                                label="วันที่ตรวจสอบ"
                                value={
                                    selected.reviewedAt
                                        ? dateTime(selected.reviewedAt)
                                        : null
                                }
                            />

                            <InfoItem
                                label="สถานะ"
                                value={
                                    VERIFY_LABELS[selected.status] ??
                                    selected.status
                                }
                            />
                        </div>

                        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                            <div className="flex gap-3">
                                <div className="mt-0.5 shrink-0 text-lg">
                                    🔒
                                </div>

                                <div>
                                    <p className="text-sm font-semibold text-amber-900">
                                        ข้อมูลส่วนบุคคล
                                    </p>

                                    <p className="mt-1 text-xs leading-5 text-amber-800">
                                        ข้อมูลนี้ใช้สำหรับตรวจสอบตัวตนและเอกสารของ Rider เท่านั้น
                                        ระบบจะบันทึก Audit Log ทุกครั้งที่มีการเปิดดูข้อมูล
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6">
                            <div className="mb-3">
                                <h3 className="text-sm font-semibold text-slate-900">
                                    เอกสารประกอบการสมัคร
                                </h3>

                                <p className="mt-0.5 text-xs text-slate-500">
                                    ตรวจสอบเอกสารที่ Rider ส่งเข้ามาก่อนดำเนินการ
                                </p>
                            </div>

                            {selected.hasIdCard || selected.hasSelfie ? (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {selected.hasIdCard &&
                                        docLink('idcard', 'รูปบัตรประชาชน')}

                                    {selected.hasSelfie &&
                                        docLink('selfie', 'รูปคู่บัตร')}
                                </div>
                            ) : (
                                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                                    <p className="text-sm font-medium text-slate-700">
                                        ยังไม่มีเอกสารประกอบ
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                        Rider ยังไม่ได้ส่งเอกสารสำหรับการตรวจสอบ
                                    </p>
                                </div>
                            )}
                        </div>

                        {selected.status === 'PendingReview' ? (
                            <div className="mt-6 border-t border-slate-200 pt-5">
                                <label className={ui.label}>
                                    เหตุผลในการตรวจสอบ
                                </label>

                                <p className="mb-2 text-xs text-slate-500">
                                    จำเป็นต้องระบุเหตุผลเมื่อเลือกปฏิเสธ
                                </p>

                                <input
                                    className={ui.input}
                                    type="text"
                                    maxLength={300}
                                    placeholder="เช่น เอกสารไม่ชัดเจน หรือข้อมูลไม่ตรงกับเอกสาร"
                                    value={reason}
                                    onChange={(e) =>
                                        setReason(e.target.value)
                                    }
                                />

                                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                                    <button
                                        className={btn('primary')}
                                        onClick={() => review('approve')}
                                        disabled={busy}
                                    >
                                        {busy
                                            ? 'กำลังดำเนินการ...'
                                            : 'อนุมัติ Rider'}
                                    </button>

                                    <button
                                        className={btn('danger')}
                                        onClick={() => review('reject')}
                                        disabled={busy}
                                    >
                                        {busy
                                            ? 'กำลังดำเนินการ...'
                                            : 'ปฏิเสธ Rider'}
                                    </button>

                                    <button
                                        className={btn('default')}
                                        onClick={() => {
                                            setSelected(null)
                                            setReason('')
                                        }}
                                        disabled={busy}
                                    >
                                        ปิดรายละเอียด
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-6 border-t border-slate-200 pt-4">
                                <p className="text-xs text-slate-500">
                                    {selected.reviewedAt
                                        ? `ตรวจสอบเมื่อ ${dateTime(selected.reviewedAt)}`
                                        : 'ยังไม่มีข้อมูลวันที่ตรวจสอบ'}
                                </p>

                                {selected.rejectReason && (
                                    <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                                        <p className="text-xs font-semibold text-red-800">
                                            เหตุผลที่ปฏิเสธ
                                        </p>

                                        <p className="mt-1 text-sm leading-5 text-red-700">
                                            {selected.rejectReason}
                                        </p>
                                    </div>
                                )}

                                <button
                                    className={`${btn('default')} mt-4`}
                                    onClick={() => {
                                        setSelected(null)
                                        setReason('')
                                    }}
                                >
                                    ปิดรายละเอียด
                                </button>
                            </div>
                        )}
                    </div>
                </section>
            )}
        </main>
    )
}