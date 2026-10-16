
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import Avatar, { resizeToAvatar } from '../components/Avatar'
import { errorText } from '../utils'
import { btn, ui } from '../ui'

const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6'

function Stat({ label, value, icon, tone = 'indigo' }) {
    const tones = {
        indigo: 'bg-indigo-50 text-indigo-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        blue: 'bg-blue-50 text-blue-600',
    }

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm sm:p-4">
            <div className="flex items-center gap-2.5">
                <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
                    {icon}
                </div>
                <div className="min-w-0">
                    <p className="text-[11px] font-medium leading-4 text-slate-500 sm:text-xs">{label}</p>
                    <p className="mt-1 text-xl font-black leading-6 text-slate-900 sm:text-2xl">{value ?? 0}</p>
                </div>
            </div>
        </div>
    )
}

function InfoItem({ label, value, icon }) {
    return (
        <div className="flex min-w-0 items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200/80">
                {icon}
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-500">{label}</p>
                <p className="mt-1 break-words text-sm font-semibold text-slate-800">{value}</p>
            </div>
        </div>
    )
}

export default function ProfilePage() {
    const [data, setData] = useState(null)
    const [name, setName] = useState('')
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [busy, setBusy] = useState(false)
    const fileRef = useRef(null)

    const load = useCallback(async () => {
        try {
            const res = await api.get('/profile')
            setData(res.data)
            setName(res.data.fullName ?? '')
        } catch (err) {
            setError(errorText(err))
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    async function onPick(e) {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file) return
        if (!file.type.startsWith('image/')) {
            setError('กรุณาเลือกไฟล์รูปภาพ')
            return
        }

        setError('')
        setNotice('')
        setBusy(true)

        try {
            const small = await resizeToAvatar(file)
            const fd = new FormData()
            fd.append('file', small)
            const res = await api.post('/profile/avatar', fd)
            setData((d) => ({ ...d, avatarVersion: res.data.avatarVersion }))
            setNotice('อัปเดตรูปโปรไฟล์เรียบร้อยแล้ว')
        } catch (err) {
            setError(err?.response ? errorText(err) : 'ไฟล์รูปนี้ไม่รองรับ ลองใช้ JPG หรือ PNG')
        } finally {
            setBusy(false)
        }
    }

    async function removeAvatar() {
        if (!window.confirm('ต้องการลบรูปโปรไฟล์ใช่หรือไม่?')) return

        setError('')
        setNotice('')
        setBusy(true)

        try {
            await api.delete('/profile/avatar')
            setData((d) => ({ ...d, avatarVersion: null }))
            setNotice('ลบรูปโปรไฟล์เรียบร้อยแล้ว')
        } catch (err) {
            setError(errorText(err))
        } finally {
            setBusy(false)
        }
    }

    async function saveName(e) {
        e.preventDefault()
        setError('')
        setNotice('')
        setBusy(true)

        try {
            const res = await api.put('/profile', { fullName: name.trim() })
            setData(res.data)
            setName(res.data.fullName ?? '')
            setNotice('บันทึกข้อมูลชื่อเรียบร้อยแล้ว')
        } catch (err) {
            setError(errorText(err))
        } finally {
            setBusy(false)
        }
    }

    if (!data) {
        return error ? (
            <div className={ui.error}>{error}</div>
        ) : (
            <div className="mx-auto max-w-4xl space-y-5">
                <div className="h-48 animate-pulse rounded-2xl bg-slate-200/70" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-200/70" />
                    ))}
                </div>
                <div className="h-64 animate-pulse rounded-2xl bg-slate-200/70" />
            </div>
        )
    }

    const nameChanged = name.trim() !== (data.fullName ?? '') && name.trim().length >= 2

    return (
        <div className="mx-auto max-w-7xl space-y-5 pb-10">
            {error && (
                <div className={ui.error}>
                    <div className="flex items-start justify-between gap-3">
                        <span>{error}</span>
                        <button type="button" onClick={() => setError('')} className="shrink-0 font-bold" aria-label="ปิดข้อความผิดพลาด">✕</button>
                    </div>
                </div>
            )}

            {notice && (
                <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm text-emerald-800">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-bold">✓</span>
                    <div className="min-w-0 flex-1 pt-0.5">{notice}</div>
                    <button type="button" onClick={() => setNotice('')} className="shrink-0 text-emerald-600 hover:text-emerald-800" aria-label="ปิดข้อความแจ้งเตือน">✕</button>
                </div>
            )}

            {/* Profile Header */}
            <section className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/70 to-blue-100/60 p-5 shadow-sm sm:p-7">
                <div className="pointer-events-none absolute -right-14 -top-20 size-56 rounded-full bg-indigo-200/25" />
                <div className="pointer-events-none absolute -bottom-24 right-1/3 size-48 rounded-full bg-sky-200/20" />

                <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-4 sm:gap-5">
                        <div className="shrink-0 rounded-full bg-white p-1.5 shadow-sm ring-1 ring-indigo-100">
                            <Avatar name={data.fullName} version={data.avatarVersion} size="size-20 sm:size-24" text="text-3xl" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] font-bold tracking-[0.18em] text-indigo-600">MY ACCOUNT</p>
                            <h1 className="mt-1 break-words text-xl font-black tracking-tight text-slate-900 sm:text-2xl">{data.fullName || 'ผู้ใช้งาน WashGo'}</h1>
                            <p className="mt-1 break-all text-sm text-slate-500">{data.email}</p>
                            <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white bg-white/80 px-2.5 py-1.5 text-xs font-semibold text-slate-600 shadow-sm">
                                <span className="size-2 rounded-full bg-emerald-500" />
                                บัญชีผู้ใช้งาน WashGo
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 sm:ml-auto sm:max-w-48 sm:justify-end">
                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
                        <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className={`${btn('primary')} flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50`}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4 shrink-0">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z" />
                                <circle cx="12" cy="13" r="3.5" />
                            </svg>
                            {busy ? 'กำลังดำเนินการ...' : data.avatarVersion ? 'เปลี่ยนรูป' : 'เพิ่มรูปโปรไฟล์'}
                        </button>
                        {data.avatarVersion && (
                            <button type="button" disabled={busy} onClick={removeAvatar} className="rounded-xl border border-slate-200 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50">
                                ลบรูป
                            </button>
                        )}
                    </div>
                </div>
            </section>

            {/* Customer Stats */}
            {data.isCustomer && (
                <section className="space-y-3">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">ภาพรวมการใช้งาน</h2>
                        <p className="mt-1 text-xs text-slate-500">สรุปข้อมูลการใช้บริการ WashGo ของคุณ</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <Stat
                            label="ออเดอร์ทั้งหมด"
                            value={data.orders}
                            tone="indigo"
                            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 4h12l1 16H5L6 4Z" /><path strokeLinecap="round" d="M9 9a3 3 0 0 0 6 0" /></svg>}
                        />
                        <Stat
                            label="ซักเสร็จแล้ว"
                            value={data.completed}
                            tone="emerald"
                            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5"><path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6" /></svg>}
                        />
                        <Stat
                            label="ที่อยู่ที่บันทึก"
                            value={data.locations}
                            tone="blue"
                            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5"><path strokeLinecap="round" strokeLinejoin="round" d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>}
                        />
                    </div>
                </section>
            )}

            {/* Account Information */}
            <section className={card}>
                <div className="mb-5 flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
                            <circle cx="12" cy="8" r="4" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 21a8 8 0 0 1 16 0" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-slate-900">ข้อมูลบัญชี</h2>
                        <p className="mt-1 text-xs text-slate-500">จัดการชื่อและตรวจสอบข้อมูลติดต่อของคุณ</p>
                    </div>
                </div>

                <form onSubmit={saveName} className="space-y-5">
                    <div>
                        <label htmlFor="profile-name" className="mb-1.5 block text-sm font-semibold text-slate-700">ชื่อ-นามสกุล</label>
                        <input
                            id="profile-name"
                            value={name}
                            maxLength={100}
                            minLength={2}
                            required
                            autoComplete="name"
                            onChange={(e) => setName(e.target.value)}
                            placeholder="กรอกชื่อและนามสกุล"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                        />
                        <p className="mt-1.5 text-xs text-slate-400">ชื่อที่แสดงในระบบ WashGo</p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <InfoItem
                            label="อีเมล"
                            value={data.email}
                            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4"><rect x="3" y="5" width="18" height="14" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="m4 7 8 6 8-6" /></svg>}
                        />
                        {data.phone && (
                            <InfoItem
                                label="เบอร์โทรศัพท์"
                                value={data.phone}
                                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4"><path strokeLinecap="round" strokeLinejoin="round" d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path strokeLinecap="round" d="M10 18h4" /></svg>}
                            />
                        )}
                    </div>

                    <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs leading-5 text-slate-400">อีเมลไม่สามารถเปลี่ยนได้ในขณะนี้</p>
                        <button type="submit" disabled={busy || !nameChanged} className={`${btn('primary')} inline-flex items-center justify-center disabled:cursor-not-allowed disabled:opacity-50`}>
                            {busy ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                        </button>
                    </div>
                </form>
            </section>

            {/* Customer Shortcuts */}
            {data.isCustomer && (
                <section className="space-y-3">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">เมนูของฉัน</h2>
                        <p className="mt-1 text-xs text-slate-500">เข้าถึงข้อมูลบริการที่ใช้บ่อย</p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Link to="/orders" className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/40 active:scale-[0.99]">
                            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-100">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
                                    <rect x="4" y="3" width="16" height="18" rx="2" />
                                    <path strokeLinecap="round" d="M8 8h8M8 12h8M8 16h5" />
                                </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-slate-900">ออเดอร์ของฉัน</p>
                                <p className="mt-1 text-xs text-slate-500">ตรวจสอบสถานะและประวัติการสั่งซัก</p>
                            </div>
                            <span className="text-lg text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-500">→</span>
                        </Link>

                        <Link to="/locations" className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/40 active:scale-[0.99]">
                            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-100">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
                                    <circle cx="12" cy="10" r="2.5" />
                                </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-slate-900">ที่อยู่ของฉัน</p>
                                <p className="mt-1 text-xs text-slate-500">จัดการจุดรับและส่งเสื้อผ้า</p>
                            </div>
                            <span className="text-lg text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-500">→</span>
                        </Link>
                    </div>
                </section>
            )}
        </div>
    )
}
