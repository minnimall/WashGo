import { useCallback, useEffect, useState } from 'react'
import api from '../api'
import { VERIFY_LABELS, dateTime, errorText } from '../utils'
import { btn, ui, verifyBadge } from '../ui'

const FILTERS = ['PendingReview', 'Approved', 'Rejected', 'Registered']

export default function AdminRidersPage() {
    const [status, setStatus] = useState('PendingReview')
    const [items, setItems] = useState(null)
    const [selected, setSelected] = useState(null)
    const [reason, setReason] = useState('')
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)

    const loadList = useCallback(async () => {
        setItems(null)
        try {
        const res = await api.get('/admin/riders', { params: { status } })
        setItems(res.data)
        } catch (err) {
        setError(errorText(err))
        }
    }, [status])

    useEffect(() => { loadList() }, [loadList])

    const open = async (userId) => {
        setError('')
        setReason('')
        try {
        const res = await api.get(`/admin/riders/${userId}`)   // ระบบบันทึก AuditLog ทุกครั้งที่เปิด
        setSelected(res.data)
        } catch (err) {
        setError(errorText(err))
        }
    }

    const review = async (action) => {
        if (action === 'reject' && !reason.trim()) {
        setError('กรุณาระบุเหตุผลที่ปฏิเสธ')
        return
        }
        setError('')
        setBusy(true)
        try {
        await api.post(
            `/admin/riders/${selected.userId}/${action}`,
            action === 'reject' ? { reason: reason.trim() } : undefined,
        )
        setSelected(null)
        await loadList()
        } catch (err) {
        setError(errorText(err))
        } finally {
        setBusy(false)
        }
    }

    const doc = (kind) => `/api/admin/riders/${selected.userId}/documents/${kind}`

    const docLink = (kind, label) => (
        <a href={doc(kind)} target="_blank" rel="noopener noreferrer" className="block text-sm text-gray-700">
        <img
            src={doc(kind)}
            alt={label}
            className="aspect-[4/3] w-full rounded-lg border border-gray-200 bg-gray-100 object-contain"
        />
        <span className="mt-1 block font-medium">{label}</span>
        </a>
    )

    return (
        <>
        <h1 className={ui.h1}>ตรวจสอบ Rider</h1>
        <div className={ui.tabs}>
            {FILTERS.map((s) => (
            <button
                key={s}
                className={btn(status === s ? 'primary' : 'default')}
                onClick={() => { setSelected(null); setStatus(s) }}
            >
                {VERIFY_LABELS[s].split(' (')[0]}
            </button>
            ))}
        </div>

        {error && <div className={ui.error}>{error}</div>}
        {!items && <p className={ui.muted}>กำลังโหลด...</p>}
        {items?.length === 0 && <p className={ui.muted}>ไม่มีรายการ</p>}

        {items?.map((r) => (
            <div className={`${ui.card} ${ui.row}`} key={r.userId}>
            <div>
                <strong className="text-gray-900">{r.fullName}</strong>{' '}
                <span className={ui.muted}>{r.email}</span>
                <div className={ui.muted}>
                {r.vehicle || '-'}{r.submittedAt && ` · ส่งเมื่อ ${dateTime(r.submittedAt)}`}
                </div>
            </div>
            <button className={btn('default', 'sm')} onClick={() => open(r.userId)}>ตรวจสอบ</button>
            </div>
        ))}

        {selected && (
            <div className={ui.card}>
            <div className={ui.row}>
                <h2 className="text-lg font-semibold text-gray-900">{selected.legalName}</h2>
                <span className={verifyBadge(selected.status)}>{VERIFY_LABELS[selected.status]}</span>
            </div>
            <p className={`${ui.muted} mt-1`}>
                {selected.email}{selected.phone && ` · ${selected.phone}`} · พาหนะ: {selected.vehicle || '-'}
            </p>
            <p className="mt-3">
                เลขบัตรประชาชน: <strong>{selected.nationalId || '-'}</strong>
            </p>
            <p>PromptPay: {selected.promptPayId || '-'}</p>
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                ข้อมูลนี้เป็นข้อมูลส่วนบุคคล ระบบบันทึกการเปิดดูทุกครั้ง ใช้เพื่อตรวจสอบตัวตนเท่านั้น
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {selected.hasIdCard && docLink('idcard', 'รูปบัตรประชาชน')}
                {selected.hasSelfie && docLink('selfie', 'รูปคู่บัตร')}
            </div>

            {selected.status === 'PendingReview' ? (
                <div className="mt-5">
                <label className={ui.label}>เหตุผล (จำเป็นเมื่อปฏิเสธ)</label>
                <input
                    className={ui.input}
                    type="text"
                    maxLength={300}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                />
                <div className="mt-3 flex gap-2">
                    <button className={btn('primary')} onClick={() => review('approve')} disabled={busy}>อนุมัติ</button>
                    <button className={btn('danger')} onClick={() => review('reject')} disabled={busy}>ปฏิเสธ</button>
                </div>
                </div>
            ) : (
                <p className={`${ui.muted} mt-4`}>
                {selected.reviewedAt && `ตรวจเมื่อ ${dateTime(selected.reviewedAt)}`}
                {selected.rejectReason && ` · เหตุผล: ${selected.rejectReason}`}
                </p>
            )}
            </div>
        )}
        </>
    )
}