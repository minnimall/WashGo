import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import { VERIFY_LABELS, dateTime, errorText } from '../utils'
import { btn, ui, verifyBadge } from '../ui'

export default function RiderDashboardPage() {
    const [me, setMe] = useState(null)
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        api.get('/rider/me')
        .then((res) => setMe(res.data))
        .catch((err) => setError(errorText(err)))
    }, [])

    const toggle = async () => {
        setError('')
        setBusy(true)
        try {
        const res = await api.put('/rider/availability', { isAccepting: !me.isAcceptingJobs })
        setMe(res.data)
        } catch (err) {
        setError(errorText(err))
        } finally {
        setBusy(false)
        }
    }

    if (!me) {
        return error ? <div className={ui.error}>{error}</div> : <p className={ui.muted}>กำลังโหลด...</p>
    }

    const canSubmit = me.status === 'Registered' || me.status === 'Rejected'

    return (
        <>
        <h1 className={ui.h1}>บัญชี Rider</h1>
        {error && <div className={ui.error}>{error}</div>}

        <div className={ui.card}>
            <h2 className={ui.h2}>สถานะการยืนยันตัวตน</h2>
            <p className="mb-2">
            <span className={verifyBadge(me.status)}>{VERIFY_LABELS[me.status] ?? me.status}</span>
            </p>
            {me.submittedAt && <p className={ui.muted}>ส่งเอกสารเมื่อ {dateTime(me.submittedAt)}</p>}
            {me.nationalIdMasked && <p className={ui.muted}>เลขบัตร: {me.nationalIdMasked}</p>}
            {me.status === 'Rejected' && me.rejectReason && (
            <div className={ui.error}>เหตุผลที่ถูกปฏิเสธ: {me.rejectReason}</div>
            )}
            {me.status === 'PendingReview' && (
            <p className={ui.muted}>Admin กำลังตรวจสอบเอกสาร เมื่ออนุมัติแล้วจะเปิดรับงานได้</p>
            )}
            {canSubmit && (
            <Link to="/rider/verify" className={`${btn('primary')} mt-3`}>
                {me.status === 'Rejected' ? 'แก้ไขและส่งเอกสารใหม่' : 'ส่งเอกสารยืนยันตัวตน'}
            </Link>
            )}
        </div>

        {me.status === 'Approved' && (
            <div className={ui.card}>
            <h2 className={ui.h2}>การรับงาน</h2>
            <div className={ui.row}>
                <span>
                สถานะ:{' '}
                <strong className={me.isAcceptingJobs ? 'text-green-600' : 'text-gray-500'}>
                    {me.isAcceptingJobs ? 'เปิดรับงาน' : 'ปิดรับงาน'}
                </strong>
                </span>
                <button className={btn('primary')} onClick={toggle} disabled={busy}>
                {me.isAcceptingJobs ? 'ปิดรับงาน' : 'เปิดรับงาน'}
                </button>
            </div>
            <p className="mt-3">
                <Link to="/rider/jobs" className={ui.link}>ไปที่หน้างาน →</Link>
            </p>
            </div>
        )}
        </>
    )
}