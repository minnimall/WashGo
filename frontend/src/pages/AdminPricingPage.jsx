
import { useCallback, useEffect, useState } from 'react'
import api from '../api'
import { errorText, money } from '../utils'

const card = 'rounded-2xl border border-slate-200/80 bg-white shadow-sm'
const input = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50'
const btn = 'inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50'
const btnSecondary = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50'

function toPrice(v) {
    const n = Number(v)
    return v !== '' && Number.isFinite(n) && n >= 0 ? n : null
}

function Toggle({ checked, onChange, label }) {
    return (
        <label className="inline-flex cursor-pointer items-center gap-2.5">
            <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
                <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
            </span>
            <span className={`text-xs font-semibold ${checked ? 'text-indigo-700' : 'text-slate-500'}`}>{label}</span>
        </label>
    )
}

function SectionHeading({ icon, title, description, count }) {
    return (
        <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    {icon}
                </div>
                <div className="min-w-0">
                    <h2 className="text-base font-extrabold text-slate-900 sm:text-lg">{title}</h2>
                    <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">{description}</p>
                </div>
            </div>
            {count !== undefined && (
                <span className="shrink-0 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-600">{count} รายการ</span>
            )}
        </div>
    )
}

/* ---------- ค่าส่ง ---------- */
function DeliveryFeeCard({ value, run, busy }) {
    const [v, setV] = useState(String(value))

    return (
        <section className={`${card} overflow-hidden`}>
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                            <path d="M3 7h11v11H3zM14 11h4l3 3v4h-7z" strokeLinejoin="round" />
                            <circle cx="7.5" cy="18" r="1.5" />
                            <circle cx="17.5" cy="18" r="1.5" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-base font-extrabold text-slate-900">ค่าส่งมาตรฐาน</h2>
                        <p className="mt-1 max-w-lg text-xs leading-5 text-slate-500 sm:text-sm">กำหนดค่าจัดส่งสำหรับออเดอร์ใหม่ โดยไม่เปลี่ยนแปลงออเดอร์ที่สร้างไว้แล้ว</p>
                        <p className="mt-2 text-xs font-medium text-slate-400">ค่าปัจจุบัน {money(value)}</p>
                    </div>
                </div>
                <div className="flex w-full items-center gap-2 sm:max-w-sm">
                    <div className="relative min-w-0 flex-1">
                        <input type="number" min="0" max="5000" step="0.01" value={v} onChange={(e) => setV(e.target.value)} aria-label="ค่าส่งเป็นบาท" className={`${input} pr-14 text-right text-base font-bold tabular-nums`} />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">บาท</span>
                    </div>
                    <button type="button" disabled={busy} className={btn} onClick={() => { const n = toPrice(v); if (n === null || n > 5000) return run(null, 'ค่าส่งต้องอยู่ระหว่าง 0 - 5,000 บาท'); run(() => api.put('/admin/pricing/delivery-fee', { value: n }), 'บันทึกค่าส่งแล้ว') }}>
                        บันทึก
                    </button>
                </div>
            </div>
        </section>
    )
}

/* ---------- ราคาบริการ ---------- */
function ServiceCard({ svc, run, busy }) {
    const [active, setActive] = useState(svc.isActive)
    const [prices, setPrices] = useState(Object.fromEntries(svc.prices.map((p) => [p.size, String(p.price)])))

    function save() {
        const list = []
        for (const p of svc.prices) {
            const n = toPrice(prices[p.size])
            if (n === null || n > 100000) return run(null, `ราคาไซส์ ${p.size} ไม่ถูกต้อง`)
            list.push({ size: p.size, price: n })
        }
        run(() => api.put(`/admin/pricing/services/${svc.id}`, { isActive: active, prices: list }), `บันทึก "${svc.name}" แล้ว`)
    }

    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-indigo-200 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-extrabold text-slate-600">
                        {svc.name?.slice(0, 1) || 'S'}
                    </div>
                    <div className="min-w-0">
                        <h3 className="truncate text-sm font-extrabold text-slate-900 sm:text-base">{svc.name}</h3>
                        <p className="mt-0.5 text-xs text-slate-400">กำหนดราคาตามขนาดผ้า</p>
                    </div>
                </div>
                <Toggle checked={active} onChange={setActive} label={active ? 'เปิดให้บริการ' : 'ปิดให้บริการ'} />
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {svc.prices.map((p) => (
                    <label key={p.size} className="block rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                        <span className="flex items-center justify-between gap-2 text-xs font-bold text-slate-600">
                            ไซส์ {p.size}
                            <span className="text-[10px] font-medium text-slate-400">บาท</span>
                        </span>
                        <input type="number" min="0" step="0.01" value={prices[p.size]} onChange={(e) => setPrices({ ...prices, [p.size]: e.target.value })} className={`${input} mt-2 bg-white text-right font-bold tabular-nums`} />
                    </label>
                ))}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <span className="text-xs text-slate-400">ตรวจสอบราคาให้ถูกต้องก่อนบันทึก</span>
                <button type="button" disabled={busy} className={btn} onClick={save}>
                    บันทึก
                </button>
            </div>
        </article>
    )
}

/* ---------- รายการเสริม ---------- */
function ItemRow({ item, run, busy }) {
    const [name, setName] = useState(item.name)
    const [price, setPrice] = useState(String(item.price))
    const [active, setActive] = useState(item.isActive)

    function save() {
        const n = toPrice(price)
        if (!name.trim()) return run(null, 'กรุณากรอกชื่อรายการ')
        if (n === null || n > 100000) return run(null, 'ราคาไม่ถูกต้อง')
        run(() => api.put(`/admin/pricing/items/${item.id}`, { name: name.trim(), price: n, isActive: active }), 'บันทึกรายการแล้ว')
    }

    return (
        <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_120px_auto_auto] sm:items-center sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                    </svg>
                </span>
                <div className="min-w-0 flex-1">
                    <label className="mb-1 block text-[11px] font-bold text-slate-400">ชื่อรายการ · {item.type}</label>
                    <input value={name} maxLength={100} onChange={(e) => setName(e.target.value)} aria-label="ชื่อรายการเสริม" className={input} />
                </div>
            </div>
            <label className="block">
                <span className="mb-1 block text-[11px] font-bold text-slate-400">ราคา (บาท)</span>
                <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} aria-label="ราคาของรายการเสริม" className={`${input} text-right tabular-nums`} />
            </label>
            <div className="flex items-center justify-between gap-2 sm:justify-center">
                <span className="text-xs text-slate-400 sm:hidden">สถานะรายการ</span>
                <Toggle checked={active} onChange={setActive} label={active ? 'เปิดใช้' : 'ปิดใช้'} />
            </div>
            <button type="button" disabled={busy} className={`${btnSecondary} w-full sm:w-auto`} onClick={save}>บันทึก</button>
        </div>
    )
}

function NewItemForm({ types, run, busy }) {
    const [type, setType] = useState(types[0] ?? '')
    const [name, setName] = useState('')
    const [price, setPrice] = useState('')

    function add() {
        const n = toPrice(price)
        if (!name.trim()) return run(null, 'กรุณากรอกชื่อรายการ')
        if (n === null || n > 100000) return run(null, 'ราคาไม่ถูกต้อง')
        run(async () => {
            await api.post('/admin/pricing/items', { type, name: name.trim(), price: n })
            setName('')
            setPrice('')
        }, 'เพิ่มรายการแล้ว')
    }

    return (
        <div className="border-t border-slate-200 bg-slate-50/70 p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                    </svg>
                </span>
                <div>
                    <h3 className="text-sm font-extrabold text-slate-800">เพิ่มรายการเสริมใหม่</h3>
                    <p className="mt-0.5 text-xs text-slate-500">กรอกประเภท ชื่อ และราคาที่ต้องการ</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[140px_minmax(0,1fr)_140px_auto] sm:items-end">
                <label className="block text-xs font-bold text-slate-600">
                    ประเภท
                    <select value={type} onChange={(e) => setType(e.target.value)} className={`${input} mt-1.5`}>
                        {types.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                </label>
                <label className="block text-xs font-bold text-slate-600">
                    ชื่อรายการใหม่
                    <input value={name} maxLength={100} onChange={(e) => setName(e.target.value)} placeholder="เช่น น้ำยาปรับผ้านุ่ม" className={`${input} mt-1.5`} />
                </label>
                <label className="block text-xs font-bold text-slate-600">
                    ราคา (บาท)
                    <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className={`${input} mt-1.5 text-right tabular-nums`} />
                </label>
                <button type="button" disabled={busy} className={`${btn} w-full sm:w-auto`} onClick={add}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                    </svg>
                    เพิ่มรายการ
                </button>
            </div>
        </div>
    )
}

/* ---------- page ---------- */
export default function AdminPricingPage() {
    const [data, setData] = useState(null)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [busy, setBusy] = useState(false)

    const load = useCallback(async () => {
        try {
            const res = await api.get('/admin/pricing')
            setData(res.data)
            setError('')
        } catch (err) {
            setError(errorText(err))
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    async function run(fn, okMessage) {
        setNotice('')
        if (!fn) return setError(okMessage)
        setError('')
        setBusy(true)
        try {
            await fn()
            setNotice(okMessage)
            await load()
        } catch (err) {
            setError(errorText(err))
        } finally {
            setBusy(false)
        }
    }

    if (!data) {
        return error ? (
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
                <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                    <span className="mt-0.5 font-bold">!</span>
                    <div className="min-w-0 flex-1">
                        <p className="font-bold">ไม่สามารถโหลดข้อมูลราคาได้</p>
                        <p className="mt-1">{error}</p>
                        <button type="button" onClick={load} className="mt-3 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100">ลองโหลดใหม่</button>
                    </div>
                </div>
            </div>
        ) : (
            <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
                <div className="h-20 animate-pulse rounded-2xl bg-slate-200/70" />
                <div className="h-32 animate-pulse rounded-2xl bg-slate-200/70" />
                <div className="h-64 animate-pulse rounded-2xl bg-slate-200/70" />
            </div>
        )
    }

    const itemTypes = [...new Set(data.items.map((i) => i.type))]
    if (itemTypes.length === 0) itemTypes.push('AddOn')

    return (
        <div className="min-h-full bg-slate-50/70">
            <div className="mx-auto w-full max-w-7xl space-y-5 px-3 py-5 sm:space-y-6 sm:px-6 sm:py-7 lg:px-8">
                {/* Header */}
                <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">ตั้งราคา</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">จัดการค่าส่ง ราคาบริการซักผ้า และรายการเสริมของ WashGo ได้จากที่เดียว</p>
                    </div>
                    <div className="flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 shadow-sm">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 text-emerald-600">
                            <path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" strokeLinejoin="round" />
                            <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        บันทึกประวัติผ่าน Audit Log
                    </div>
                </header>

                {/* Alerts */}
                {error && (
                    <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        <span className="font-extrabold">!</span>
                        <p className="min-w-0 flex-1">{error}</p>
                        <button type="button" onClick={() => setError('')} aria-label="ปิดข้อความแจ้งเตือน" className="font-bold text-red-500 hover:text-red-700">✕</button>
                    </div>
                )}
                {notice && (
                    <div role="status" className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 h-4 w-4 shrink-0">
                            <path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <p className="min-w-0 flex-1 font-semibold">{notice}</p>
                        <button type="button" onClick={() => setNotice('')} aria-label="ปิดข้อความแจ้งเตือน" className="font-bold text-emerald-600 hover:text-emerald-800">✕</button>
                    </div>
                )}

                {/* Policy notice */}
                <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3.5">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 11v5M12 8h.01" strokeLinecap="round" />
                    </svg>
                    <div>
                        <p className="text-sm font-bold text-indigo-900">การเปลี่ยนแปลงราคา</p>
                        <p className="mt-1 text-xs leading-5 text-indigo-800/80">ราคาใหม่มีผลกับออเดอร์ที่สร้างหลังจากนี้เท่านั้น ออเดอร์เดิมจะไม่ถูกเปลี่ยนราคาอัตโนมัติ</p>
                    </div>
                </div>

                {/* Delivery */}
                <DeliveryFeeCard value={data.deliveryFee} run={run} busy={busy} />

                {/* Services */}
                <section className={`${card} p-4 sm:p-6`}>
                    <SectionHeading
                        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path d="M6 3h12v18H6zM9 7h6M9 11h6M9 15h3" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                        title="ราคาบริการตามไซส์"
                        description="กำหนดราคาแยกตามขนาด S, M และ L สำหรับแต่ละบริการ"
                        count={data.services.length}
                    />
                    <div className="mt-5 space-y-3">
                        {data.services.length > 0 ? data.services.map((s) => (
                            <ServiceCard key={s.id} svc={s} run={run} busy={busy} />
                        )) : (
                            <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center">
                                <p className="text-sm font-semibold text-slate-600">ยังไม่มีข้อมูลบริการ</p>
                                <p className="mt-1 text-xs text-slate-400">เมื่อมีบริการจะแสดงรายการที่นี่</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* Add-on items */}
                <section className={`${card} overflow-hidden`}>
                    <div className="p-4 sm:p-6">
                        <SectionHeading
                            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" /><circle cx="8" cy="7" r="1" fill="currentColor" /><circle cx="14" cy="12" r="1" fill="currentColor" /><circle cx="10" cy="17" r="1" fill="currentColor" /></svg>}
                            title="รายการเสริม"
                            description="จัดการชื่อ ราคา และสถานะของรายการที่ลูกค้าสามารถเลือกเพิ่มได้"
                            count={data.items.length}
                        />
                        <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-3 text-xs leading-5 text-amber-800">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="mt-0.5 h-4 w-4 shrink-0"><path d="M12 3 22 20H2z" strokeLinejoin="round" /><path d="M12 9v4M12 16h.01" strokeLinecap="round" /></svg>
                            <p>รายการเสริมไม่สามารถลบได้ เนื่องจากออเดอร์เก่าอาจอ้างอิงรายการนั้นอยู่ หากไม่ต้องการให้ลูกค้าเลือกอีก ให้ปิดใช้งานแทน</p>
                        </div>
                    </div>

                    <div className="border-y border-slate-200 bg-slate-50 px-4 py-2.5 sm:px-5">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">รายการที่มีอยู่</p>
                    </div>

                    {data.items.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                            {data.items.map((i) => <ItemRow key={i.id} item={i} run={run} busy={busy} />)}
                        </div>
                    ) : (
                        <div className="px-4 py-8 text-center text-sm text-slate-400">ยังไม่มีรายการเสริม</div>
                    )}

                    <NewItemForm types={itemTypes} run={run} busy={busy} />
                </section>

                <div className="flex flex-wrap items-center justify-between gap-3 px-1 pb-2 text-xs text-slate-400">
                    <span>WashGo · ระบบจัดการราคา</span>
                    <button type="button" onClick={load} disabled={busy} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 font-semibold text-slate-500 transition hover:bg-white hover:text-indigo-600 disabled:opacity-50">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M20 7v5h-5M4 17v-5h5" strokeLinecap="round" strokeLinejoin="round" /><path d="M5.5 9a7 7 0 0 1 11.8-2L20 12M4 12l2.7 5a7 7 0 0 0 11.8-2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        โหลดข้อมูลใหม่
                    </button>
                </div>
            </div>
        </div>
    )
}
