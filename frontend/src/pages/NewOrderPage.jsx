import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { errorText, money, SIZE_DESC } from '../utils'

const SIZES = ['S', 'M', 'L']
const STEP_LABELS = ['บริการ', 'รับ–ส่ง', 'ยืนยัน']

const inputCls =
    'w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100'

const sectionCls =
    'rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-7'

/* การ์ดตัวเลือกแบบมีวงกลมเลือก (ใช้กับบริการ) */
const choiceCls = (selected) =>
    `flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-3.5 transition-all duration-200 ${
        selected
            ? 'border-blue-600 bg-blue-50'
            : 'border-slate-100 bg-slate-50/50 hover:border-blue-200 hover:bg-blue-50/30'
    }`

/* ปุ่มเลือกแบบกะทัดรัด เรียงในแถวเดียว (ใช้กับขนาดและน้ำยา) */
const chipCls = (selected) =>
    `flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 px-2 py-3 text-center transition-all duration-200 focus-within:ring-4 focus-within:ring-blue-100 ${
        selected
            ? 'border-blue-600 bg-blue-50'
            : 'border-slate-100 bg-slate-50/50 hover:border-blue-200 hover:bg-blue-50/30'
    }`

function PriceRow({ label, value, total }) {
    return (
        <div
            className={`flex items-center justify-between gap-4 ${
                total ? 'border-t border-slate-200 pt-4' : ''
            }`}
        >
            <span
                className={
                    total
                        ? 'font-bold text-slate-900'
                        : 'text-sm text-slate-500'
                }
            >
                {label}
            </span>

            <span
                className={
                    total
                        ? 'text-xl font-bold text-slate-900'
                        : 'text-sm font-semibold text-slate-800'
                }
            >
                {value}
            </span>
        </div>
    )
}

function StepHeader({ number, title, description }) {
    return (
        <div className="mb-4 sm:mb-5">
            <p className="text-xs font-bold tracking-[0.15em] text-blue-600">
                {number}
            </p>

            <h2 className="mt-1 text-lg font-bold text-slate-900">
                {title}
            </h2>

            {description && (
                <p className="mt-1 text-sm text-slate-500">
                    {description}
                </p>
            )}
        </div>
    )
}

/* แถบขั้นตอน — แสดงเฉพาะมือถือ/แท็บเล็ต */
function Stepper({ step, onGo }) {
    return (
        <ol className="flex items-start lg:hidden">
            {STEP_LABELS.map((label, i) => {
                const n = i + 1
                const done = n < step
                const active = n === step

                return (
                    <li key={label} className="flex flex-1 items-start last:flex-none">
                        <button
                            type="button"
                            disabled={n > step}
                            onClick={() => onGo(n)}
                            className="flex flex-col items-center gap-1 disabled:cursor-default"
                        >
                            <span
                                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all ${
                                    active
                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                        : done
                                          ? 'bg-blue-100 text-blue-600'
                                          : 'bg-slate-100 text-slate-400'
                                }`}
                            >
                                {done ? '✓' : n}
                            </span>
                            <span
                                className={`text-[11px] font-semibold ${
                                    active ? 'text-blue-600' : 'text-slate-400'
                                }`}
                            >
                                {label}
                            </span>
                        </button>

                        {n < STEP_LABELS.length && (
                            <span
                                className={`mx-2 mt-4 h-0.5 flex-1 rounded-full ${
                                    done ? 'bg-blue-300' : 'bg-slate-200'
                                }`}
                            />
                        )}
                    </li>
                )
            })}
        </ol>
    )
}

export default function NewOrderPage() {
    const navigate = useNavigate()

    const [catalog, setCatalog] = useState(null)
    const [locations, setLocations] = useState([])
    const [loadError, setLoadError] = useState('')

    // ขั้นตอนปัจจุบัน (ใช้เฉพาะมือถือ/แท็บเล็ต — จอใหญ่แสดงครบทุกขั้น)
    const [step, setStep] = useState(1)

    const [serviceId, setServiceId] = useState(null)
    const [size, setSize] = useState('M')
    const [qty, setQty] = useState({})

    const [detergent, setDetergent] = useState('Standard')
    const [detergentNote, setDetergentNote] = useState('')
    const [careNote, setCareNote] = useState('')

    const [pickupId, setPickupId] = useState('')
    const [deliveryId, setDeliveryId] = useState('')
    const [sameAsPickup, setSameAsPickup] = useState(true)

    const [accepted, setAccepted] = useState(false)
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        Promise.all([
            api.get('/catalog'),
            api.get('/locations'),
        ])
            .then(([catalogRes, locationsRes]) => {
                const c = catalogRes.data
                const l = locationsRes.data

                setCatalog(c)
                setLocations(l)

                setServiceId(c.services[0]?.id ?? null)
                setPickupId(l[0]?.id ?? '')
                setDeliveryId(l[0]?.id ?? '')
            })
            .catch((err) => {
                setLoadError(errorText(err))
            })
    }, [])

    const service = useMemo(() => {
        return catalog?.services.find(
            (s) => s.id === serviceId
        )
    }, [catalog, serviceId])

    const estimate = useMemo(() => {
        if (!catalog) return null

        const base =
            service?.prices.find(
                (p) => p.size === size
            )?.price ?? 0

        const extras = catalog.items.reduce(
            (sum, item) =>
                sum + item.price * (qty[item.id] || 0),
            0
        )

        return {
            base,
            extras,
            delivery: catalog.deliveryFee,
            total:
                base +
                extras +
                catalog.deliveryFee,
        }
    }, [catalog, service, size, qty])

    const updateQty = (id, amount) => {
        setQty((prev) => {
            const next = Math.max(
                0,
                (prev[id] || 0) + amount
            )

            return {
                ...prev,
                [id]: next,
            }
        })
    }

    const scrollTop = () =>
        window.scrollTo({ top: 0, behavior: 'smooth' })

    const goTo = (n) => {
        setError('')
        setStep(n)
        scrollTop()
    }

    // ตรวจข้อมูลของขั้นที่ระบุ — คืนข้อความ error หรือ '' ถ้าผ่าน
    const validateStep = (n) => {
        if (n === 1 && !serviceId) return 'กรุณาเลือกบริการ'

        if (n === 2) {
            if (locations.length === 0)
                return 'กรุณาเพิ่มสถานที่รับส่งผ้าก่อนสั่งซัก'
            if (!pickupId) return 'กรุณาเลือกจุดรับผ้า'
            if (!sameAsPickup && !deliveryId)
                return 'กรุณาเลือกจุดส่งผ้า'
        }

        return ''
    }

    const goNext = () => {
        const msg = validateStep(step)
        if (msg) {
            setError(msg)
            return
        }
        goTo(Math.min(3, step + 1))
    }

    const submit = async (e) => {
        e.preventDefault()
        setError('')

        // ตรวจทุกขั้น (กรณีกดส่งจากจอใหญ่ที่เห็นครบทุกส่วน)
        for (const n of [1, 2]) {
            const msg = validateStep(n)
            if (msg) {
                setError(msg)
                return
            }
        }

        const delivery = sameAsPickup
            ? pickupId
            : deliveryId

        if (!accepted) {
            setError(
                'กรุณายอมรับเงื่อนไขความเสียหายของผ้า'
            )
            return
        }

        setBusy(true)

        try {
            const res = await api.post('/orders', {
                serviceTypeId: serviceId,
                size,
                pickupLocationId: Number(pickupId),
                deliveryLocationId: Number(delivery),
                detergentSource: detergent,
                detergentNote:
                    detergentNote.trim() || null,
                careNote:
                    careNote.trim() || null,

                extras: Object.entries(qty)
                    .filter(([, n]) => n > 0)
                    .map(([id, n]) => ({
                        catalogItemId: Number(id),
                        quantity: n,
                    })),

                acceptDamageTerms: accepted,
            })

            navigate(`/orders/${res.data.id}`)
        } catch (err) {
            setError(errorText(err))
        } finally {
            setBusy(false)
        }
    }

    if (loadError) {
        return (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {loadError}
            </div>
        )
    }

    if (!catalog) {
        return (
            <p className="text-sm text-slate-500">
                กำลังโหลด...
            </p>
        )
    }

    // แสดงเฉพาะขั้นปัจจุบันบนมือถือ / แสดงทุกขั้นบนจอใหญ่
    const show = (n) => (step === n ? '' : 'hidden lg:block')

    return (
        <form
            onSubmit={submit}
            className="space-y-5 sm:space-y-6"
        >
            {/* PAGE HEADER */}
            <div>
                <p className="text-xs font-bold tracking-[0.2em] text-blue-600">
                    NEW ORDER
                </p>

                <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:mt-2 sm:text-4xl">
                    สั่งซักผ้า
                </h1>

                <p className="mt-2 hidden max-w-2xl text-sm leading-6 text-slate-500 sm:block">
                    เลือกบริการ กำหนดรายละเอียดการซัก
                    และจุดรับส่งผ้าของคุณ
                </p>
            </div>

            {/* STEPPER (มือถือ) */}
            <Stepper step={step} onGo={goTo} />

            <div className="grid items-start gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">

                {/* LEFT */}
                <section className={sectionCls}>

                    {/* =========================================
                        STEP 01 — บริการ + ขนาด + รายการเสริม + น้ำยา
                    ========================================= */}
                    <div className={show(1)}>
                        <StepHeader
                            number="01"
                            title="เลือกบริการ"
                            description="เลือกประเภทบริการ ขนาด และรายละเอียดการซัก"
                        />

                        {/* SERVICE */}
                        <div className="grid gap-2.5 sm:grid-cols-2">
                            {catalog.services.map((item) => (
                                <label
                                    key={item.id}
                                    className={choiceCls(
                                        serviceId === item.id
                                    )}
                                >
                                    <input
                                        type="radio"
                                        name="service"
                                        value={item.id}
                                        checked={
                                            serviceId === item.id
                                        }
                                        onChange={() =>
                                            setServiceId(item.id)
                                        }
                                        className="mt-1 size-4 shrink-0 accent-blue-600"
                                    />

                                    <div className="min-w-0">
                                        <p className="font-semibold text-slate-900">
                                            {item.name}
                                        </p>

                                        {item.description && (
                                            <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-500">
                                                {item.description}
                                            </p>
                                        )}
                                    </div>
                                </label>
                            ))}
                        </div>

                        {/* SIZE — ปุ่ม S / M / L เรียงแถวเดียว */}
                        <div className="mt-5">
                            <p className="mb-2.5 text-sm font-semibold text-slate-700">
                                ขนาดถุงผ้า
                            </p>

                            <div className="grid grid-cols-3 gap-2.5">
                                {SIZES.map((item) => {
                                    const price =
                                        service?.prices.find(
                                            (p) =>
                                                p.size === item
                                        )?.price ?? 0

                                    return (
                                        <label
                                            key={item}
                                            className={chipCls(
                                                size === item
                                            )}
                                        >
                                            <input
                                                type="radio"
                                                name="size"
                                                value={item}
                                                checked={
                                                    size === item
                                                }
                                                onChange={() =>
                                                    setSize(item)
                                                }
                                                className="sr-only"
                                            />

                                            <span className="text-xl font-black text-slate-900">
                                                {item}
                                            </span>

                                            <span className="mt-0.5 text-xs font-semibold text-blue-600">
                                                {money(price)}
                                            </span>
                                        </label>
                                    )
                                })}
                            </div>

                            {/* คำอธิบายของขนาดที่เลือก (แสดงอันเดียวเพื่อลดความยาว) */}
                            <p className="mt-2.5 rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs leading-5 text-slate-500">
                                <span className="font-semibold text-slate-700">
                                    Size {size}:
                                </span>{' '}
                                {SIZE_DESC[size]}
                            </p>
                        </div>

                        {/* EXTRAS */}
                        {catalog.items.length > 0 && (
                            <div className="mt-5">
                                <p className="mb-2.5 text-sm font-semibold text-slate-700">
                                    รายการเสริม{' '}
                                    <span className="font-normal text-slate-400">
                                        (ไม่บังคับ)
                                    </span>
                                </p>

                                <div className="space-y-2">
                                    {catalog.items.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-3.5 py-3"
                                        >
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-slate-800">
                                                    {item.name}
                                                </p>

                                                <p className="text-xs text-slate-500">
                                                    {money(item.price)} / รายการ
                                                </p>
                                            </div>

                                            <div className="flex shrink-0 items-center rounded-lg border border-slate-200 bg-white">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        updateQty(
                                                            item.id,
                                                            -1
                                                        )
                                                    }
                                                    disabled={
                                                        !qty[item.id]
                                                    }
                                                    aria-label="ลด"
                                                    className="flex h-9 w-9 items-center justify-center text-lg text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30"
                                                >
                                                    −
                                                </button>

                                                <span className="w-7 text-center text-sm font-semibold text-slate-800">
                                                    {qty[item.id] || 0}
                                                </span>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        updateQty(
                                                            item.id,
                                                            1
                                                        )
                                                    }
                                                    aria-label="เพิ่ม"
                                                    className="flex h-9 w-9 items-center justify-center text-lg text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* DETERGENT — 2 ปุ่มเรียงแถวเดียว */}
                        <div className="mt-5">
                            <p className="mb-2.5 text-sm font-semibold text-slate-700">
                                น้ำยาซักผ้า
                            </p>

                            <div className="grid grid-cols-2 gap-2.5">
                                <label
                                    className={chipCls(
                                        detergent === 'Standard'
                                    )}
                                >
                                    <input
                                        type="radio"
                                        name="detergent"
                                        value="Standard"
                                        checked={
                                            detergent ===
                                            'Standard'
                                        }
                                        onChange={() =>
                                            setDetergent(
                                                'Standard'
                                            )
                                        }
                                        className="sr-only"
                                    />

                                    <span className="text-sm font-bold text-slate-900">
                                        น้ำยาของร้าน
                                    </span>

                                    <span className="mt-0.5 text-[11px] text-slate-500">
                                        มาตรฐาน WashGo
                                    </span>
                                </label>

                                <label
                                    className={chipCls(
                                        detergent ===
                                            'CustomerOwn'
                                    )}
                                >
                                    <input
                                        type="radio"
                                        name="detergent"
                                        value="CustomerOwn"
                                        checked={
                                            detergent ===
                                            'CustomerOwn'
                                        }
                                        onChange={() =>
                                            setDetergent(
                                                'CustomerOwn'
                                            )
                                        }
                                        className="sr-only"
                                    />

                                    <span className="text-sm font-bold text-slate-900">
                                        นำมาเอง
                                    </span>

                                    <span className="mt-0.5 text-[11px] text-slate-500">
                                        ลูกค้าเตรียมเอง
                                    </span>
                                </label>
                            </div>

                            <input
                                type="text"
                                maxLength={200}
                                value={detergentNote}
                                onChange={(e) =>
                                    setDetergentNote(
                                        e.target.value
                                    )
                                }
                                placeholder="รายละเอียดน้ำยา (ไม่บังคับ) เช่น สำหรับผิวแพ้ง่าย"
                                className={`${inputCls} mt-2.5`}
                            />
                        </div>
                    </div>

                    <div className="my-7 hidden border-t border-slate-100 lg:block" />

                    {/* =========================================
                        STEP 02 — จุดรับ + จุดส่ง
                    ========================================= */}
                    <div className={show(2)}>
                        <StepHeader
                            number="02"
                            title="จุดรับ–ส่งผ้า"
                            description="กำหนดสถานที่ให้ Rider รับและนำผ้ากลับมาส่ง"
                        />

                        {locations.length === 0 ? (
                            <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-4 text-sm text-amber-700">
                                ยังไม่มีสถานที่รับส่งผ้า
                                กรุณาเพิ่มสถานที่ก่อนทำรายการ
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* PICKUP */}
                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                        จุดรับผ้า
                                    </label>

                                    <select
                                        value={pickupId}
                                        onChange={(e) =>
                                            setPickupId(
                                                e.target.value
                                            )
                                        }
                                        className={inputCls}
                                    >
                                        {locations.map(
                                            (location) => (
                                                <option
                                                    key={
                                                        location.id
                                                    }
                                                    value={
                                                        location.id
                                                    }
                                                >
                                                    {location.label} —{' '}
                                                    {
                                                        location.address
                                                    }
                                                </option>
                                            )
                                        )}
                                    </select>
                                </div>

                                {/* SAME LOCATION */}
                                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                    <input
                                        type="checkbox"
                                        checked={sameAsPickup}
                                        onChange={(e) =>
                                            setSameAsPickup(
                                                e.target.checked
                                            )
                                        }
                                        className="size-4 shrink-0 accent-blue-600"
                                    />

                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">
                                            ใช้จุดรับเป็นจุดส่ง
                                        </p>

                                        <p className="text-xs text-slate-500">
                                            รับและส่งผ้าที่สถานที่เดียวกัน
                                        </p>
                                    </div>
                                </label>

                                {/* DELIVERY */}
                                {!sameAsPickup && (
                                    <div>
                                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                            จุดส่งผ้า
                                        </label>

                                        <select
                                            value={deliveryId}
                                            onChange={(e) =>
                                                setDeliveryId(
                                                    e.target.value
                                                )
                                            }
                                            className={inputCls}
                                        >
                                            <option value="">
                                                เลือกจุดส่งผ้า
                                            </option>

                                            {locations.map(
                                                (location) => (
                                                    <option
                                                        key={
                                                            location.id
                                                        }
                                                        value={
                                                            location.id
                                                        }
                                                    >
                                                        {
                                                            location.label
                                                        }{' '}
                                                        —{' '}
                                                        {
                                                            location.address
                                                        }
                                                    </option>
                                                )
                                            )}
                                        </select>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="my-7 hidden border-t border-slate-100 lg:block" />

                    {/* =========================================
                        STEP 03 — รายละเอียด + ยืนยัน
                    ========================================= */}
                    <div className={show(3)}>
                        <StepHeader
                            number="03"
                            title="รายละเอียดและยืนยัน"
                            description="เพิ่มหมายเหตุสำหรับการดูแลผ้าและยืนยันรายการ"
                        />

                        {/* CARE NOTE */}
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                หมายเหตุการดูแลผ้า{' '}
                                <span className="font-normal text-slate-400">
                                    (ไม่บังคับ)
                                </span>
                            </label>

                            <textarea
                                maxLength={500}
                                value={careNote}
                                onChange={(e) =>
                                    setCareNote(
                                        e.target.value
                                    )
                                }
                                placeholder="เช่น ผ้าสีตก ห้ามอบร้อน หรือมีเสื้อผ้าที่ต้องดูแลเป็นพิเศษ"
                                className={`${inputCls} min-h-[96px] resize-none sm:min-h-[120px]`}
                            />
                        </div>

                        {/* DAMAGE TERMS */}
                        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4">
                            <input
                                type="checkbox"
                                checked={accepted}
                                onChange={(e) =>
                                    setAccepted(
                                        e.target.checked
                                    )
                                }
                                className="mt-0.5 size-4 shrink-0 accent-blue-600"
                            />

                            <span className="text-xs leading-5 text-slate-600">
                                ฉันยอมรับเงื่อนไขความเสียหายของผ้า
                                (ผ้าเสียหายจากการซักตามปกติ เช่น
                                สีตก ผ้าหด ทางร้านและ Rider
                                ไม่รับผิดชอบ)
                            </span>
                        </label>
                    </div>

                    {/* =========================================
                        ปุ่มนำทางขั้นตอน (มือถือ/แท็บเล็ต)
                    ========================================= */}
                    <div className="mt-6 border-t border-slate-100 pt-4 lg:hidden">
                        {error && step < 3 && (
                            <div className="mb-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        {step < 3 && (
                            <p className="mb-3 flex items-center justify-between text-sm">
                                <span className="text-slate-500">
                                    รวมโดยประมาณ
                                </span>
                                <span className="text-lg font-bold text-slate-900">
                                    {money(estimate.total)}
                                </span>
                            </p>
                        )}

                        <div className="flex gap-3">
                            {step > 1 && (
                                <button
                                    type="button"
                                    onClick={() => goTo(step - 1)}
                                    className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                                >
                                    ย้อนกลับ
                                </button>
                            )}

                            {step < 3 && (
                                <button
                                    type="button"
                                    onClick={goNext}
                                    className="flex-1 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm shadow-blue-600/30 transition hover:bg-blue-700 active:scale-[0.98]"
                                >
                                    ถัดไป →
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                {/* =========================================
                    RIGHT - SUMMARY
                    (มือถือ: แสดงเฉพาะขั้นสุดท้าย / จอใหญ่: แสดงตลอด)
                ========================================= */}
                <aside className={`lg:sticky lg:top-24 ${show(3)}`}>
                    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

                        <div className="border-b border-slate-200 px-5 py-4 sm:px-6 sm:py-5">
                            <p className="text-xs font-bold tracking-[0.15em] text-slate-400">
                                ORDER SUMMARY
                            </p>

                            <h2 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">
                                สรุปรายการสั่งซัก
                            </h2>
                        </div>

                        <div className="space-y-5 p-5 sm:p-6">

                            {/* SERVICE SUMMARY */}
                            <div className="border-b border-slate-100 pb-5">
                                <p className="text-xs font-semibold text-slate-400">
                                    บริการ
                                </p>

                                <div className="mt-2 flex items-center justify-between gap-3">
                                    <p className="font-semibold text-slate-900">
                                        {service?.name || '-'}
                                    </p>

                                    <span className="text-sm font-semibold text-slate-600">
                                        Size {size}
                                    </span>
                                </div>
                            </div>

                            {/* PRICE */}
                            <div className="space-y-3">
                                <PriceRow
                                    label={`ค่าซัก (${size})`}
                                    value={money(
                                        estimate.base
                                    )}
                                />

                                <PriceRow
                                    label="รายการเสริม"
                                    value={money(
                                        estimate.extras
                                    )}
                                />

                                <PriceRow
                                    label="ค่าส่ง (ไป-กลับ)"
                                    value={money(
                                        estimate.delivery
                                    )}
                                />

                                <PriceRow
                                    label="รวมโดยประมาณ"
                                    value={money(
                                        estimate.total
                                    )}
                                    total
                                />
                            </div>

                            {/* INFO */}
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                <p className="text-xs leading-5 text-slate-600">
                                    ราคานี้เป็นราคาโดยประมาณ
                                    ราคาจริงจะคำนวณโดยระบบ
                                    และ Rider จะตรวจสอบขนาดผ้าก่อนซัก
                                </p>
                            </div>

                            {/* ERROR */}
                            {error && (
                                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                                    {error}
                                </div>
                            )}

                            {/* SUBMIT */}
                            <button
                                type="submit"
                                disabled={
                                    busy ||
                                    !accepted ||
                                    locations.length === 0
                                }
                                className="w-full rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {busy
                                    ? 'กำลังสั่ง...'
                                    : 'ยืนยันสั่งซักผ้า'}
                            </button>

                            <p className="text-center text-[11px] leading-5 text-slate-400">
                                ชำระเงินตอน Rider ส่งผ้าคืน
                            </p>
                        </div>
                    </div>
                </aside>
            </div>
        </form>
    )
}