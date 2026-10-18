import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../api'
import { errorText } from '../utils'

const ROLE_LABELS = { Customer: 'ลูกค้า', Rider: 'Rider', Admin: 'Admin' }

const ICON = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    viewBox: '0 0 24 24',
    className: 'h-[18px] w-[18px]',
}

const ACTIONS = {
    suspend: {
        title: 'ระงับบัญชี',
        hint: 'ผู้ใช้จะถูกออกจากระบบทันทีและเข้าใช้งานไม่ได้จนกว่าจะยกเลิกการระงับ ถ้าเป็น Rider จะถูกปิดรับงานด้วย',
        button: 'ระงับบัญชี',
        tone: 'bg-amber-600 hover:bg-amber-700',
    },
    unsuspend: {
        title: 'ยกเลิกการระงับ',
        hint: 'ผู้ใช้จะเข้าสู่ระบบได้อีกครั้ง (Rider ต้องกดเปิดรับงานเอง)',
        button: 'ยกเลิกการระงับ',
        tone: 'bg-indigo-600 hover:bg-indigo-700',
    },
    delete: {
        title: 'ลบบัญชี',
        hint: 'ลบข้อมูลส่วนตัวถาวร (ชื่อ อีเมล เอกสารและบัญชีของ Rider) กู้คืนไม่ได้ ประวัติออเดอร์ยังเก็บไว้ ลบไม่ได้ถ้ายังมีออเดอร์ที่ไม่จบ',
        button: 'ลบบัญชีถาวร',
        tone: 'bg-red-600 hover:bg-red-700',
        confirm: true,
    },
}

function Badge({ u }) {
    if (u.deletedAt) return <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600">ถูกลบ</span>
    if (u.isSuspended) return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">ถูกระงับ</span>
    return <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">ใช้งานปกติ</span>
}

function ActionModal({ target, action, onClose, onDone }) {
    const cfg = ACTIONS[action]
    const [reason, setReason] = useState('')
    const [confirmText, setConfirmText] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose() }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [busy, onClose])

    const reasonOk = reason.trim().length >= 5
    const confirmOk = !cfg.confirm || confirmText.trim().toLowerCase() === target.email.toLowerCase()

    const submit = async (e) => {
        e.preventDefault()
        if (!reasonOk || !confirmOk || busy) return
        setBusy(true)
        setError('')
        try {
            const res = await api.post(`/admin/users/${target.id}/${action}`, { reason: reason.trim() })
            onDone(action, res.data)
        } catch (err) {
            setError(errorText(err))
            setBusy(false)
        }
    }

    return (
        <div
            className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/50 p-4 sm:items-center"
            onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose() }}
        >
            <form
                role="dialog"
                aria-modal="true"
                aria-label={cfg.title}
                onSubmit={submit}
                className="w-full max-w-md space-y-4 rounded-3xl bg-white p-6 shadow-xl"
            >
                <div>
                    <h2 className="text-lg font-bold text-slate-900">{cfg.title}</h2>
                    <p className="mt-1 text-sm text-slate-500">{target.fullName} · {target.email}</p>
                </div>

                <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{cfg.hint}</p>

                <label className="block text-sm font-medium text-slate-700">
                    เหตุผล (บันทึกใน AuditLog)
                    <textarea
                        autoFocus
                        rows={3}
                        maxLength={500}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                        placeholder="อย่างน้อย 5 ตัวอักษร"
                    />
                </label>

                {cfg.confirm && (
                    <label className="block text-sm font-medium text-slate-700">
                        พิมพ์อีเมลของบัญชีนี้เพื่อยืนยัน
                        <input
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
                            placeholder={target.email}
                            autoComplete="off"
                        />
                    </label>
                )}

                {error && <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={busy}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="submit"
                        disabled={!reasonOk || !confirmOk || busy}
                        className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40 ${cfg.tone}`}
                    >
                        {busy ? 'กำลังดำเนินการ...' : cfg.button}
                    </button>
                </div>
            </form>
        </div>
    )
}

function EditModal({ target, onClose, onDone }) {
    const [form, setForm] = useState({
        fullName: target.fullName,
        email: target.email,
        phoneNumber: target.phoneNumber ?? '',
        reason: '',
    })
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose() }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [busy, onClose])

    const emailChanged = form.email.trim().toLowerCase() !== target.email.toLowerCase()
    const changed =
        form.fullName.trim() !== target.fullName ||
        emailChanged ||
        form.phoneNumber.trim() !== (target.phoneNumber ?? '')
    const ok = changed && form.fullName.trim().length >= 2 && form.email.trim() && form.reason.trim().length >= 5

    const submit = async (e) => {
        e.preventDefault()
        if (!ok || busy) return
        setBusy(true)
        setError('')
        try {
            const res = await api.put(`/admin/users/${target.id}`, {
                fullName: form.fullName.trim(),
                email: form.email.trim(),
                phoneNumber: form.phoneNumber.trim() || null,
                reason: form.reason.trim(),
            })
            onDone('edit', res.data)
        } catch (err) {
            setError(errorText(err))
            setBusy(false)
        }
    }

    const field = 'mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100'

    return (
        <div
            className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/50 p-4 sm:items-center"
            onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose() }}
        >
            <form onSubmit={submit} role="dialog" aria-modal="true" aria-label="แก้ไขข้อมูลผู้ใช้"
                className="w-full max-w-md space-y-4 rounded-3xl bg-white p-6 shadow-xl">
                <h2 className="text-lg font-bold text-slate-900">แก้ไขข้อมูลผู้ใช้</h2>

                <label className="block text-sm font-medium text-slate-700">
                    ชื่อ-นามสกุล
                    <input autoFocus maxLength={100} value={form.fullName} onChange={set('fullName')} className={field} />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                    อีเมล
                    <input type="email" maxLength={256} value={form.email} onChange={set('email')} className={field} />
                </label>
                {emailChanged && (
                    <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-700">
                        เปลี่ยนอีเมลแล้วผู้ใช้จะถูกออกจากระบบทุกอุปกรณ์ และต้องยืนยันอีเมลใหม่ก่อนเข้าใช้งานได้
                    </p>
                )}
                <label className="block text-sm font-medium text-slate-700">
                    เบอร์โทร (ไม่บังคับ)
                    <input inputMode="tel" maxLength={20} value={form.phoneNumber} onChange={set('phoneNumber')} className={field} />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                    เหตุผล (บันทึกใน AuditLog)
                    <textarea rows={2} maxLength={500} value={form.reason} onChange={set('reason')} className={field} placeholder="อย่างน้อย 5 ตัวอักษร" />
                </label>

                {error && <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onClose} disabled={busy}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                        ยกเลิก
                    </button>
                    <button type="submit" disabled={!ok || busy}
                        className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40">
                        {busy ? 'กำลังบันทึก...' : 'บันทึก'}
                    </button>
                </div>
            </form>
        </div>
    )
}

export default function AdminUsersPage() {
    const [q, setQ] = useState('')
    const [role, setRole] = useState('')
    const [status, setStatus] = useState('')
    const [users, setUsers] = useState(null)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [modal, setModal] = useState(null)   // { user, action }
    const seq = useRef(0)

    const load = useCallback(async () => {
        const n = ++seq.current
        try {
            const params = {}
            if (q.trim()) params.q = q.trim()
            if (role) params.role = role
            if (status) params.status = status
            const res = await api.get('/admin/users', { params })
            if (n !== seq.current) return   // มีคำค้นใหม่กว่าแล้ว ทิ้งผลเก่า
            setUsers(res.data)
            setError('')
        } catch (err) {
            if (n === seq.current) setError(errorText(err))
        }
    }, [q, role, status])

    useEffect(() => {
        const t = setTimeout(load, q ? 300 : 0)
        return () => clearTimeout(t)
    }, [load, q])

    const onDone = (action, data) => {
        setModal(null)
        const base = { suspend: 'ระงับบัญชีแล้ว', unsuspend: 'ยกเลิกการระงับแล้ว', delete: 'ลบบัญชีแล้ว', edit: 'บันทึกข้อมูลผู้ใช้แล้ว' }[action]
        setNotice(
            action === 'suspend' && data?.affectedJobs > 0
                ? `${base} — Rider คนนี้ยังมีงานค้าง ${data.affectedJobs} งาน ต้องย้ายงานให้ Rider คนอื่น`
                : base,
        )
        load()
    }

    return (
        <div className="space-y-5 mx-auto w-full max-w-7xl px-3 py-5 sm:px-6 lg:px-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">จัดการผู้ใช้</h1>
                <p className="mt-1 text-sm text-slate-500">ทุกการระงับ/ลบต้องระบุเหตุผล และถูกบันทึกใน AuditLog</p>
            </div>

            <div className="grid gap-2 sm:grid-cols-[1fr_160px_160px]">
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="ค้นหาชื่อหรืออีเมล"
                    maxLength={100}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
                <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm">
                    <option value="">ทุกบทบาท</option>
                    <option value="Customer">ลูกค้า</option>
                    <option value="Rider">Rider</option>
                    <option value="Admin">Admin</option>
                </select>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm">
                    <option value="">ทุกสถานะ</option>
                    <option value="active">ใช้งานปกติ</option>
                    <option value="suspended">ถูกระงับ</option>
                    <option value="deleted">ถูกลบ</option>
                </select>
            </div>

            {notice && (
                <div className="flex items-start justify-between gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-100">
                    <span>{notice}</span>
                    <button type="button" onClick={() => setNotice('')} className="shrink-0 font-medium hover:underline">ปิด</button>
                </div>
            )}
            {error && <div className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600 ring-1 ring-red-100">{error}</div>}

            {users === null ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
                    กำลังโหลด...
                </div>
            ) : users.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">ไม่พบผู้ใช้</p>
            ) : (
                <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    {users.map((u) => {
                        const isAdmin = u.role === 'Admin'
                        return (
                            <div key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-5">
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-sm font-bold text-indigo-600">
                                    {u.fullName?.charAt(0)?.toUpperCase() || '?'}
                                </span>

                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="truncate text-sm font-bold text-slate-900">{u.fullName}</span>
                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                                            {ROLE_LABELS[u.role] ?? u.role ?? '-'}
                                        </span>
                                        <Badge u={u} />
                                    </div>
                                    <div className="mt-0.5 truncate text-xs text-slate-500">{u.email}</div>
                                    {u.isSuspended && u.suspendedReason && !u.deletedAt && (
                                        <div className="mt-1 text-xs text-amber-700">เหตุผล: {u.suspendedReason}</div>
                                    )}
                                </div>

                                {!isAdmin && !u.deletedAt && (
                                    <div className="flex shrink-0 gap-2">
                                        <button
                                            type="button"
                                            title="แก้ไขข้อมูล"
                                            aria-label="แก้ไขข้อมูล"
                                            onClick={() => setModal({ user: u, action: 'edit' })}
                                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 active:scale-95"
                                        >
                                            <svg {...ICON}>
                                                <path d="M4 20h4L19 9l-4-4L4 16z" />
                                                <path d="M13.5 6.5l4 4" />
                                            </svg>
                                        </button>
                                        {u.isSuspended ? (
                                            <button
                                                type="button"
                                                title="ยกเลิกการระงับ"
                                                aria-label="ยกเลิกการระงับ"
                                                onClick={() => setModal({ user: u, action: 'unsuspend' })}
                                                className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-200 text-indigo-600 transition hover:bg-indigo-50 active:scale-95"
                                            >
                                                <svg {...ICON}>
                                                    <circle cx="12" cy="12" r="9" />
                                                    <path d="M8 12.5l3 3 5-6" />
                                                </svg>
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                title="ระงับบัญชี"
                                                aria-label="ระงับบัญชี"
                                                onClick={() => setModal({ user: u, action: 'suspend' })}
                                                className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-200 text-amber-600 transition hover:bg-amber-50 active:scale-95"
                                            >
                                                <svg {...ICON}>
                                                    <circle cx="12" cy="12" r="9" />
                                                    <path d="M5.6 5.6l12.8 12.8" />
                                                </svg>
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            title="ลบบัญชี"
                                            aria-label="ลบบัญชี"
                                            onClick={() => setModal({ user: u, action: 'delete' })}
                                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-200 text-red-600 transition hover:bg-red-50 active:scale-95"
                                        >
                                            <svg {...ICON}>
                                                <path d="M4 7h16M10 11v6M14 11v6" />
                                                <path d="M6 7l1 13h10l1-13M9 7V4h6v3" />
                                            </svg>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {users && users.length >= 50 && (
                <p className="text-xs text-slate-400">แสดง 50 รายการแรก ใช้ช่องค้นหาเพื่อกรองให้แคบลง</p>
            )}

            {modal && (modal.action === 'edit' ? (
                <EditModal target={modal.user} onClose={() => setModal(null)} onDone={onDone} />
            ) : (
                <ActionModal
                    target={modal.user}
                    action={modal.action}
                    onClose={() => setModal(null)}
                    onDone={onDone}
                />
            ))}
        </div>
    )
}