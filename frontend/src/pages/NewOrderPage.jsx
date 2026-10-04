import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'
import { errorText, money, SIZE_DESC } from '../utils'

const SIZES = ['S', 'M', 'L']

const inputCls =
    'w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100'

const sectionCls =
    'rounded-[24px] border border-slate-100 bg-white p-6 shadow-sm sm:p-7'

const sectionTitleCls =
    'text-lg font-bold tracking-tight text-slate-900'

function StepHeader({ number, title, description }) {
    return (
        <div className="mb-6 flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-sm font-black text-white shadow-lg shadow-blue-500/20">
                {number}
            </div>

            <div>
                <h2 className={sectionTitleCls}>{title}</h2>
                {description && (
                    <p className="mt-1 text-sm text-slate-500">
                        {description}
                    </p>
                )}
            </div>
        </div>
    )
}

function ChoiceCard({ selected, children, ...props }) {
    return (
        <label
            {...props}
            className={`group flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition-all duration-200 ${
                selected
                    ? 'border-blue-600 bg-blue-50 shadow-sm shadow-blue-500/10'
                    : 'border-slate-100 bg-slate-50/50 hover:border-blue-200 hover:bg-blue-50/30'
            }`}
        >
            {children}
        </label>
    )
}

function PriceRow({ label, value, total }) {
    return (
        <div className={`flex items-center justify-between gap-4 ${
            total ? 'border-t border-slate-100 pt-4' : ''
        }`}>
            <span className={total ? 'font-bold text-slate-900' : 'text-sm text-slate-500'}>
                {label}
            </span>

            <span className={
                total
                    ? 'text-xl font-black text-blue-600'
                    : 'text-sm font-semibold text-slate-800'
            }>
                {value}
            </span>
        </div>
    )
}

export default function NewOrderPage() {
    const navigate = useNavigate()

    const [catalog, setCatalog] = useState(null)
    const [locations, setLocations] = useState([])
    const [loadError, setLoadError] = useState('')

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
            .then(([c, l]) => {
                setCatalog(c.data)
                setLocations(l.data)
                setServiceId(c.data.services[0]?.id ?? null)

                if (l.data.length) {
                    setPickupId(String(l.data[0].id))
                }
            })
            .catch((err) => setLoadError(errorText(err)))
    }, [])

    const estimate = useMemo(() => {
        if (!catalog) return null

        const service = catalog.services.find(
            (s) => s.id === serviceId,
        )

        const base =
            service?.prices.find((p) => p.size === size)?.price ?? 0

        const extras = catalog.items.reduce(
            (sum, item) =>
                sum + item.price * (qty[item.id] || 0),
            0,
        )

        return {
            base,
            extras,
            delivery: catalog.deliveryFee,
            total: base + extras + catalog.deliveryFee,
        }
    }, [catalog, serviceId, size, qty])

    if (loadError) {
        return (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">
                {loadError}
            </div>
        )
    }

    if (!catalog) {
        return (
            <div className="space-y-4">
                <div className="h-10 w-48 animate-pulse rounded-lg bg-slate-200" />
                <div className="h-64 animate-pulse rounded-[24px] bg-slate-200" />
            </div>
        )
    }

    const setQuantity = (id, value) => {
        setQty({
            ...qty,
            [id]: Math.min(
                20,
                Math.max(0, Number(value) || 0),
            ),
        })
    }

    const changeQuantity = (id, amount) => {
        const current = qty[id] || 0

        setQuantity(id, current + amount)
    }

    const submit = async (e) => {
        e.preventDefault()

        setError('')

        const delivery = sameAsPickup
            ? pickupId
            : deliveryId

        if (!pickupId || !delivery) {
            setError('กรุณาเลือกจุดรับและจุดส่งผ้า')
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

    const service = catalog.services.find(
        (s) => s.id === serviceId,
    )

    const locationLabel = (l) =>
        `${l.label || 'ที่อยู่'} — ${l.address}`.slice(0, 90)

    return (
        <form
            onSubmit={submit}
            className="space-y-8"
        >

            {/* Page Header */}
            <section>
                <p className="text-xs font-bold tracking-[0.2em] text-blue-600">
                    NEW ORDER
                </p>

                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                    สั่งซักผ้า
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    เลือกบริการ กำหนดรายละเอียดการซัก
                    และจุดรับส่งผ้าของคุณ
                </p>
            </section>

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">

                {/* LEFT */}
                <div className="space-y-5">

                    {/* Service */}
                    <section className={sectionCls}>
                        <StepHeader
                            number="01"
                            title="เลือกบริการ"
                            description="เลือกประเภทบริการที่ต้องการ"
                        />

                        <div className="grid gap-3 sm:grid-cols-2">
                            {catalog.services.map((s) => (
                                <ChoiceCard
                                    key={s.id}
                                    selected={serviceId === s.id}
                                >
                                    <input
                                        type="radio"
                                        name="service"
                                        className="mt-1 size-4 accent-blue-600"
                                        checked={serviceId === s.id}
                                        onChange={() =>
                                            setServiceId(s.id)
                                        }
                                    />

                                    <div>
                                        <p className="font-bold text-slate-900">
                                            {s.name}
                                        </p>

                                        <p className="mt-1 text-xs text-slate-500">
                                            เลือกบริการนี้สำหรับออเดอร์ของคุณ
                                        </p>
                                    </div>
                                </ChoiceCard>
                            ))}
                        </div>
                    </section>

                    {/* Size */}
                    <section className={sectionCls}>
                        <StepHeader
                            number="02"
                            title="เลือกขนาด"
                            description="เลือกขนาดโดยประมาณของผ้าที่ต้องการซัก"
                        />

                        <div className="grid gap-3 sm:grid-cols-3">
                            {SIZES.map((s) => {
                                const price =
                                    service?.prices.find(
                                        (p) => p.size === s,
                                    )?.price

                                return (
                                    <ChoiceCard
                                        key={s}
                                        selected={size === s}
                                    >
                                        <input
                                            type="radio"
                                            name="size"
                                            className="mt-1 size-4 accent-blue-600"
                                            checked={size === s}
                                            onChange={() =>
                                                setSize(s)
                                            }
                                        />

                                        <div>
                                            <div className="flex items-center gap-2">
                                                <strong className="text-base text-slate-900">
                                                    {s}
                                                </strong>

                                                <span className="text-xs text-slate-400">
                                                    {SIZE_DESC[s]}
                                                </span>
                                            </div>

                                            <p className="mt-1 text-sm font-semibold text-blue-600">
                                                {price != null
                                                    ? money(price)
                                                    : '-'}
                                            </p>
                                        </div>
                                    </ChoiceCard>
                                )
                            })}
                        </div>

                        <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
                            Rider จะตรวจสอบขนาดอีกครั้งตอนรับผ้า
                            หากขนาดไม่ตรงกับที่เลือก
                            ระบบจะแจ้งราคาใหม่ให้คุณยืนยันก่อนซัก
                        </div>
                    </section>

                    {/* Extras */}
                    <section className={sectionCls}>
                        <StepHeader
                            number="03"
                            title="รายการเสริม"
                            description="เพิ่มบริการเสริมได้ตามต้องการ"
                        />

                        <div className="divide-y divide-slate-100">
                            {catalog.items.map((item) => {
                                const count = qty[item.id] || 0

                                return (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                                    >
                                        <div className="min-w-0">
                                            <p className="font-semibold text-slate-800">
                                                {item.name}
                                            </p>

                                            <p className="mt-1 text-xs text-slate-400">
                                                {money(item.price)} / รายการ
                                            </p>
                                        </div>

                                        <div className="flex shrink-0 items-center rounded-xl border border-slate-200 bg-slate-50 p-1">

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    changeQuantity(
                                                        item.id,
                                                        -1,
                                                    )
                                                }
                                                disabled={count === 0}
                                                className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-slate-500 transition hover:bg-white hover:text-blue-600 disabled:opacity-30"
                                            >
                                                −
                                            </button>

                                            <span className="w-8 text-center text-sm font-bold text-slate-800">
                                                {count}
                                            </span>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    changeQuantity(
                                                        item.id,
                                                        1,
                                                    )
                                                }
                                                disabled={count >= 20}
                                                className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-slate-500 transition hover:bg-white hover:text-blue-600 disabled:opacity-30"
                                            >
                                                +
                                            </button>

                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </section>

                    {/* Detergent */}
                    <section className={sectionCls}>
                        <StepHeader
                            number="04"
                            title="น้ำยาซักผ้า"
                            description="เลือกน้ำยาที่ต้องการใช้"
                        />

                        <div className="grid gap-3 sm:grid-cols-2">

                            <ChoiceCard
                                selected={
                                    detergent === 'Standard'
                                }
                            >
                                <input
                                    type="radio"
                                    name="detergent"
                                    className="mt-1 size-4 accent-blue-600"
                                    checked={
                                        detergent === 'Standard'
                                    }
                                    onChange={() =>
                                        setDetergent('Standard')
                                    }
                                />

                                <div>
                                    <p className="font-bold text-slate-900">
                                        น้ำยามาตรฐาน
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                        รวมในราคาแล้ว
                                    </p>
                                </div>
                            </ChoiceCard>

                            <ChoiceCard
                                selected={
                                    detergent === 'CustomerOwn'
                                }
                            >
                                <input
                                    type="radio"
                                    name="detergent"
                                    className="mt-1 size-4 accent-blue-600"
                                    checked={
                                        detergent === 'CustomerOwn'
                                    }
                                    onChange={() =>
                                        setDetergent(
                                            'CustomerOwn',
                                        )
                                    }
                                />

                                <div>
                                    <p className="font-bold text-slate-900">
                                        นำน้ำยามาเอง
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                        Rider จะคืนส่วนที่เหลือ
                                    </p>
                                </div>
                            </ChoiceCard>

                        </div>

                        {detergent === 'CustomerOwn' && (
                            <div className="mt-4">
                                <label className="mb-2 block text-sm font-semibold text-slate-700">
                                    รายละเอียดน้ำยา
                                </label>

                                <input
                                    type="text"
                                    maxLength={300}
                                    value={detergentNote}
                                    onChange={(e) =>
                                        setDetergentNote(
                                            e.target.value,
                                        )
                                    }
                                    placeholder="เช่น น้ำยาซักผ้า Brand A 500ml"
                                    className={inputCls}
                                />
                            </div>
                        )}
                    </section>

                    {/* Locations */}
                    <section className={sectionCls}>
                        <StepHeader
                            number="05"
                            title="จุดรับและจุดส่งผ้า"
                            description="กำหนดตำแหน่งสำหรับ Rider"
                        />

                        {locations.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                                <p className="text-sm font-semibold text-slate-700">
                                    ยังไม่มีที่อยู่ที่บันทึกไว้
                                </p>

                                <Link
                                    to="/locations"
                                    className="mt-3 inline-flex text-sm font-bold text-blue-600 hover:text-blue-700"
                                >
                                    เพิ่มที่อยู่ก่อน →
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-4">

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                                        จุดรับผ้า
                                    </label>

                                    <select
                                        value={pickupId}
                                        onChange={(e) =>
                                            setPickupId(
                                                e.target.value,
                                            )
                                        }
                                        className={inputCls}
                                    >
                                        {locations.map((l) => (
                                            <option
                                                key={l.id}
                                                value={l.id}
                                            >
                                                {locationLabel(l)}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700 transition hover:bg-blue-50">
                                    <input
                                        type="checkbox"
                                        className="size-4 accent-blue-600"
                                        checked={sameAsPickup}
                                        onChange={(e) =>
                                            setSameAsPickup(
                                                e.target.checked,
                                            )
                                        }
                                    />

                                    <span>
                                        ส่งคืนที่จุดเดียวกับจุดรับ
                                    </span>
                                </label>

                                {!sameAsPickup && (
                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                                            จุดส่งผ้าคืน
                                        </label>

                                        <select
                                            value={deliveryId}
                                            onChange={(e) =>
                                                setDeliveryId(
                                                    e.target.value,
                                                )
                                            }
                                            className={inputCls}
                                        >
                                            <option value="">
                                                -- เลือกจุดส่ง --
                                            </option>

                                            {locations.map((l) => (
                                                <option
                                                    key={l.id}
                                                    value={l.id}
                                                >
                                                    {locationLabel(l)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                            </div>
                        )}
                    </section>

                    {/* Care Note */}
                    <section className={sectionCls}>
                        <StepHeader
                            number="06"
                            title="หมายเหตุการดูแลผ้า"
                            description="แจ้งรายละเอียดพิเศษให้ Rider ทราบ"
                        />

                        <textarea
                            maxLength={500}
                            placeholder="เช่น ผ้าสีตก ห้ามอบร้อน หรือมีเสื้อผ้าที่ต้องดูแลเป็นพิเศษ"
                            value={careNote}
                            onChange={(e) =>
                                setCareNote(e.target.value)
                            }
                            className={`${inputCls} min-h-[120px] resize-none`}
                        />
                    </section>

                </div>

                {/* RIGHT - SUMMARY */}
                <aside className="lg:sticky lg:top-24">

                    <div className="overflow-hidden rounded-[28px] bg-white shadow-lg shadow-slate-900/5 ring-1 ring-slate-100">

                        {/* Header */}
                        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-6 text-white">
                            <p className="text-xs font-bold tracking-[0.15em] text-blue-100">
                                ORDER SUMMARY
                            </p>

                            <h2 className="mt-1 text-xl font-black">
                                สรุปรายการสั่งซัก
                            </h2>
                        </div>

                        <div className="space-y-5 p-6">

                            {/* Selected service */}
                            <div className="rounded-2xl bg-slate-50 p-4">
                                <p className="text-xs font-semibold text-slate-400">
                                    บริการ
                                </p>

                                <div className="mt-2 flex items-center justify-between gap-3">
                                    <p className="font-bold text-slate-900">
                                        {service?.name || '-'}
                                    </p>

                                    <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-600">
                                        Size {size}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <PriceRow
                                    label={`ค่าซัก (${size})`}
                                    value={money(estimate.base)}
                                />

                                <PriceRow
                                    label="รายการเสริม"
                                    value={money(estimate.extras)}
                                />

                                <PriceRow
                                    label="ค่าส่ง (ไป-กลับ)"
                                    value={money(estimate.delivery)}
                                />

                                <PriceRow
                                    label="รวมโดยประมาณ"
                                    value={money(estimate.total)}
                                    total
                                />
                            </div>

                            <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                                <p className="text-xs leading-5 text-amber-700">
                                    ราคานี้เป็นราคาโดยประมาณ
                                    ราคาจริงจะคำนวณโดยระบบ
                                    และ Rider จะตรวจสอบขนาดผ้าก่อนซัก
                                </p>
                            </div>

                            {/* Terms */}
                            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                                <input
                                    type="checkbox"
                                    className="mt-0.5 size-4 shrink-0 accent-blue-600"
                                    checked={accepted}
                                    onChange={(e) =>
                                        setAccepted(
                                            e.target.checked,
                                        )
                                    }
                                />

                                <span className="text-xs leading-5 text-slate-600">
                                    ฉันยอมรับเงื่อนไขความเสียหายของผ้า
                                    (ผ้าเสียหายจากการซักตามปกติ เช่น
                                    สีตก ผ้าหด ทางร้านและ Rider
                                    ไม่รับผิดชอบ)
                                </span>
                            </label>

                            {error && (
                                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={
                                    busy ||
                                    !accepted ||
                                    locations.length === 0
                                }
                                className="w-full rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
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