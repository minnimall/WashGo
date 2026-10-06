import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { errorText, money, SIZE_DESC } from '../utils'

const SIZES = ['S', 'M', 'L']

const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100'

const sectionCls = 'rounded-[24px] border border-slate-100 bg-white p-6 shadow-sm sm:p-7'

const choiceCls = (selected) =>
    `flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-all duration-200 ${
        selected
            ? 'border-blue-600 bg-blue-50'
            : 'border-slate-100 bg-slate-50/50 hover:border-blue-200 hover:bg-blue-50/30'
    }`

function PriceRow({ label, value, total }) {
    return (
        <div className={`flex items-center justify-between gap-4 ${total ? 'border-t border-slate-200 pt-4' : ''}`}>
            <span className={total ? 'font-bold text-slate-900' : 'text-sm text-slate-500'}>{label}</span>
            <span className={total ? 'text-xl font-bold text-slate-900' : 'text-sm font-semibold text-slate-800'}>{value}</span>
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
        Promise.all([api.get('/catalog'), api.get('/locations')])
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
        return catalog?.services.find((s) => s.id === serviceId)
    }, [catalog, serviceId])

    const estimate = useMemo(() => {
        if (!catalog) return null

        const base =
            service?.prices.find((p) => p.size === size)?.price ?? 0

        const extras = catalog.items.reduce(
            (sum, item) => sum + item.price * (qty[item.id] || 0),
            0,
        )

        return {
            base,
            extras,
            delivery: catalog.deliveryFee,
            total: base + extras + catalog.deliveryFee,
        }
    }, [catalog, service, size, qty])

    const updateQty = (id, amount) => {
        setQty((prev) => {
            const next = Math.max(0, (prev[id] || 0) + amount)

            return {
                ...prev,
                [id]: next,
            }
        })
    }

    const submit = async (e) => {
        e.preventDefault()
        setError('')

        if (!serviceId) {
            setError('กรุณาเลือกบริการ')
            return
        }

        if (locations.length === 0) {
            setError('กรุณาเพิ่มสถานที่รับส่งผ้าก่อนสั่งซัก')
            return
        }

        if (!pickupId) {
            setError('กรุณาเลือกจุดรับผ้า')
            return
        }

        const delivery = sameAsPickup ? pickupId : deliveryId

        if (!delivery) {
            setError('กรุณาเลือกจุดส่งผ้า')
            return
        }

        if (!accepted) {
            setError('กรุณายอมรับเงื่อนไขความเสียหายของผ้า')
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
                detergentNote: detergentNote.trim() || null,
                careNote: careNote.trim() || null,
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
        return <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</div>
    }

    if (!catalog) {
        return <p className="text-sm text-slate-500">กำลังโหลด...</p>
    }

    return (
        <form onSubmit={submit} className="space-y-6">
            <div>
                <p className="text-xs font-bold tracking-[0.2em] text-blue-600">NEW ORDER</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">สั่งซักผ้า</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">เลือกบริการ กำหนดรายละเอียดการซัก และจุดรับส่งผ้าของคุณ</p>
            </div>

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                {/* LEFT - ORDER FORM */}
                <section className={sectionCls}>
                    {/* SERVICE */}
                    <div>
                        <div className="mb-5">
                            <p className="text-xs font-bold tracking-[0.15em] text-blue-600">01</p>
                            <h2 className="mt-1 text-lg font-bold text-slate-900">เลือกบริการ</h2>
                            <p className="mt-1 text-sm text-slate-500">เลือกประเภทบริการที่ต้องการ</p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            {catalog.services.map((item) => (
                                <label key={item.id} className={choiceCls(serviceId === item.id)}>
                                    <input type="radio" name="service" value={item.id} checked={serviceId === item.id} onChange={() => setServiceId(item.id)} className="mt-1 size-4 shrink-0 accent-blue-600" />
                                    <div className="min-w-0">
                                        <p className="font-semibold text-slate-900">{item.name}</p>
                                        {item.description && <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>}
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="my-7 border-t border-slate-100" />

                    {/* SIZE */}
                    <div>
                        <div className="mb-5">
                            <p className="text-xs font-bold tracking-[0.15em] text-blue-600">02</p>
                            <h2 className="mt-1 text-lg font-bold text-slate-900">เลือกขนาด</h2>
                            <p className="mt-1 text-sm text-slate-500">เลือกขนาดถุงผ้าที่ต้องการซัก</p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                            {SIZES.map((item) => {
                                const price = service?.prices.find((p) => p.size === item)?.price ?? 0

                                return (
                                    <label key={item} className={choiceCls(size === item)}>
                                        <input type="radio" name="size" value={item} checked={size === item} onChange={() => setSize(item)} className="mt-1 size-4 shrink-0 accent-blue-600" />
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-900">Size {item}</span>
                                                <span className="text-sm font-semibold text-blue-600">{money(price)}</span>
                                            </div>
                                            <p className="mt-1 text-xs leading-5 text-slate-500">{SIZE_DESC[item]}</p>
                                        </div>
                                    </label>
                                )
                            })}
                        </div>
                    </div>

                    <div className="my-7 border-t border-slate-100" />

                    {/* EXTRAS */}
                    <div>
                        <div className="mb-5">
                            <p className="text-xs font-bold tracking-[0.15em] text-blue-600">03</p>
                            <h2 className="mt-1 text-lg font-bold text-slate-900">รายการเสริม</h2>
                            <p className="mt-1 text-sm text-slate-500">เลือกบริการเพิ่มเติมตามความต้องการ</p>
                        </div>

                        <div className="space-y-3">
                            {catalog.items.map((item) => (
                                <div key={item.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-slate-800">{item.name}</p>
                                        <p className="mt-1 text-xs text-slate-500">{money(item.price)} / รายการ</p>
                                    </div>

                                    <div className="flex shrink-0 items-center rounded-lg border border-slate-200 bg-white">
                                        <button type="button" onClick={() => updateQty(item.id, -1)} disabled={!qty[item.id]} className="flex h-9 w-9 items-center justify-center text-lg text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30">−</button>
                                        <span className="w-8 text-center text-sm font-semibold text-slate-800">{qty[item.id] || 0}</span>
                                        <button type="button" onClick={() => updateQty(item.id, 1)} className="flex h-9 w-9 items-center justify-center text-lg text-slate-500 transition hover:bg-slate-50 hover:text-slate-900">+</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="my-7 border-t border-slate-100" />

                    {/* DETERGENT */}
                    <div>
                        <div className="mb-5">
                            <p className="text-xs font-bold tracking-[0.15em] text-blue-600">04</p>
                            <h2 className="mt-1 text-lg font-bold text-slate-900">น้ำยาซักผ้า</h2>
                            <p className="mt-1 text-sm text-slate-500">เลือกแหล่งน้ำยาที่ต้องการใช้</p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className={choiceCls(detergent === 'Standard')}>
                                <input type="radio" name="detergent" value="Standard" checked={detergent === 'Standard'} onChange={() => setDetergent('Standard')} className="mt-1 size-4 shrink-0 accent-blue-600" />
                                <div>
                                    <p className="font-semibold text-slate-900">ใช้น้ำยาของร้าน</p>
                                    <p className="mt-1 text-xs leading-5 text-slate-500">ใช้น้ำยามาตรฐานของ WashGo</p>
                                </div>
                            </label>

                            <label className={choiceCls(detergent === 'CustomerOwn')}>
                                <input type="radio" name="detergent" value="CustomerOwn" checked={detergent === 'CustomerOwn'} onChange={() => setDetergent('CustomerOwn')} className="mt-1 size-4 shrink-0 accent-blue-600" />
                                <div>
                                    <p className="font-semibold text-slate-900">นำมาเอง</p>
                                    <p className="mt-1 text-xs leading-5 text-slate-500">ลูกค้าจัดเตรียมน้ำยาเอง</p>
                                </div>
                            </label>
                        </div>

                        <div className="mt-4">
                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">รายละเอียดเพิ่มเติม <span className="font-normal text-slate-400">(ไม่บังคับ)</span></label>
                            <input type="text" maxLength={200} value={detergentNote} onChange={(e) => setDetergentNote(e.target.value)} placeholder="เช่น น้ำยาสำหรับผิวแพ้ง่าย" className={inputCls} />
                        </div>
                    </div>

                    <div className="my-7 border-t border-slate-100" />

                    {/* LOCATIONS */}
                    <div>
                        <div className="mb-5">
                            <p className="text-xs font-bold tracking-[0.15em] text-blue-600">05</p>
                            <h2 className="mt-1 text-lg font-bold text-slate-900">จุดรับและจุดส่งผ้า</h2>
                            <p className="mt-1 text-sm text-slate-500">กำหนดสถานที่ให้ Rider รับและนำผ้ากลับมาส่ง</p>
                        </div>

                        {locations.length === 0 ? (
                            <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-4 text-sm text-amber-700">
                                ยังไม่มีสถานที่รับส่งผ้า กรุณาเพิ่มสถานที่ก่อนทำรายการ
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">จุดรับผ้า</label>
                                    <select value={pickupId} onChange={(e) => setPickupId(e.target.value)} className={inputCls}>
                                        {locations.map((location) => (
                                            <option key={location.id} value={location.id}>{location.label} — {location.address}</option>
                                        ))}
                                    </select>
                                </div>

                                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                                    <input type="checkbox" checked={sameAsPickup} onChange={(e) => setSameAsPickup(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-blue-600" />
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">ใช้จุดรับเป็นจุดส่ง</p>
                                        <p className="mt-1 text-xs text-slate-500">Rider จะรับและส่งผ้าที่สถานที่เดียวกัน</p>
                                    </div>
                                </label>

                                {!sameAsPickup && (
                                    <div>
                                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">จุดส่งผ้า</label>
                                        <select value={deliveryId} onChange={(e) => setDeliveryId(e.target.value)} className={inputCls}>
                                            <option value="">เลือกจุดส่งผ้า</option>
                                            {locations.map((location) => (
                                                <option key={location.id} value={location.id}>{location.label} — {location.address}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="my-7 border-t border-slate-100" />

                    {/* CARE NOTE */}
                    <div>
                        <div className="mb-5">
                            <p className="text-xs font-bold tracking-[0.15em] text-blue-600">06</p>
                            <h2 className="mt-1 text-lg font-bold text-slate-900">หมายเหตุการดูแลผ้า</h2>
                            <p className="mt-1 text-sm text-slate-500">แจ้งรายละเอียดพิเศษที่ต้องการให้ Rider ทราบ</p>
                        </div>

                        <textarea maxLength={500} value={careNote} onChange={(e) => setCareNote(e.target.value)} placeholder="เช่น ผ้าสีตก ห้ามอบร้อน หรือมีเสื้อผ้าที่ต้องดูแลเป็นพิเศษ" className={`${inputCls} min-h-[120px] resize-none`} />
                    </div>
                </section>

                {/* RIGHT - SUMMARY */}
                <aside className="lg:sticky lg:top-24">
                    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-200 px-6 py-5">
                            <p className="text-xs font-bold tracking-[0.15em] text-slate-400">ORDER SUMMARY</p>
                            <h2 className="mt-1 text-xl font-bold text-slate-900">สรุปรายการสั่งซัก</h2>
                        </div>

                        <div className="space-y-5 p-6">
                            <div className="border-b border-slate-100 pb-5">
                                <p className="text-xs font-semibold text-slate-400">บริการ</p>
                                <div className="mt-2 flex items-center justify-between gap-3">
                                    <p className="font-semibold text-slate-900">{service?.name || '-'}</p>
                                    <span className="text-sm font-semibold text-slate-600">Size {size}</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <PriceRow label={`ค่าซัก (${size})`} value={money(estimate.base)} />
                                <PriceRow label="รายการเสริม" value={money(estimate.extras)} />
                                <PriceRow label="ค่าส่ง (ไป-กลับ)" value={money(estimate.delivery)} />
                                <PriceRow label="รวมโดยประมาณ" value={money(estimate.total)} total />
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                <p className="text-xs leading-5 text-slate-600">
                                    ราคานี้เป็นราคาโดยประมาณ ราคาจริงจะคำนวณโดยระบบ และ Rider จะตรวจสอบขนาดผ้าก่อนซัก
                                </p>
                            </div>

                            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4">
                                <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-blue-600" />
                                <span className="text-xs leading-5 text-slate-600">
                                    ฉันยอมรับเงื่อนไขความเสียหายของผ้า (ผ้าเสียหายจากการซักตามปกติ เช่น สีตก ผ้าหด ทางร้านและ Rider ไม่รับผิดชอบ)
                                </span>
                            </label>

                            {error && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

                            <button type="submit" disabled={busy || !accepted || locations.length === 0} className="w-full rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                                {busy ? 'กำลังสั่ง...' : 'ยืนยันสั่งซักผ้า'}
                            </button>

                            <p className="text-center text-[11px] leading-5 text-slate-400">ชำระเงินตอน Rider ส่งผ้าคืน</p>
                        </div>
                    </div>
                </aside>
            </div>
        </form>
    )
}