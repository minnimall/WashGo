import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../api'
import { errorText } from '../utils'

const DEFAULT_CENTER = [13.7563, 100.5018]

const round6 = (n) => Number(n.toFixed(6))

const pinIcon = L.divIcon({
    className: '',
    html: `
        <svg width="36" height="48" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg"
            style="filter: drop-shadow(0 3px 3px rgba(0,0,0,.35))">
            <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" fill="#2563eb"/>
            <circle cx="12" cy="12" r="5" fill="#fff"/>
        </svg>`,
    iconSize: [36, 48],
    iconAnchor: [18, 48],
})

const emptyForm = {
    label: '',
    address: '',
    building: '',
    floor: '',
    room: '',
    landmark: '',
    latitude: null,
    longitude: null,
}

const inputCls =
    'w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100'

const labelCls = 'mb-2 block text-sm font-semibold text-slate-700'

function LocationPicker({ latitude, longitude, onChange, flyTo }) {
    const elRef = useRef(null)
    const mapRef = useRef(null)
    const markerRef = useRef(null)
    const onChangeRef = useRef(onChange)

    onChangeRef.current = onChange

    useEffect(() => {
        const map = L.map(elRef.current).setView(DEFAULT_CENTER, 13)

        const satellite = L.tileLayer(
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            {
                maxZoom: 19,
                attribution:
                    'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
            },
        )

        const streets = L.tileLayer(
            'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            {
                maxZoom: 19,
                attribution:
                    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            },
        )

        const labels = L.tileLayer(
            'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
            { maxZoom: 19 },
        )

        satellite.addTo(map)
        labels.addTo(map)

        L.control
            .layers(
                {
                    'ดาวเทียม': satellite,
                    'แผนที่ถนน': streets,
                },
                {
                    'ชื่อสถานที่': labels,
                },
                {
                    position: 'topright',
                },
            )
            .addTo(map)

        map.on('click', (e) => {
            onChangeRef.current(
                round6(e.latlng.lat),
                round6(e.latlng.lng),
            )
        })

        mapRef.current = map

        return () => {
            map.remove()
            mapRef.current = null
            markerRef.current = null
        }
    }, [])

    useEffect(() => {
        const map = mapRef.current

        if (!map) return

        if (latitude == null || longitude == null) {
            if (markerRef.current) {
                markerRef.current.remove()
                markerRef.current = null
            }

            return
        }

        const pos = [latitude, longitude]

        if (!markerRef.current) {
            const marker = L.marker(pos, {
                draggable: true,
                icon: pinIcon,
            }).addTo(map)

            marker.on('dragend', () => {
                const p = marker.getLatLng()

                onChangeRef.current(
                    round6(p.lat),
                    round6(p.lng),
                )
            })

            markerRef.current = marker
        } else {
            markerRef.current.setLatLng(pos)
        }

        if (flyTo || !map.getBounds().contains(pos)) {
            map.setView(
                pos,
                Math.max(map.getZoom(), 16),
                { animate: true },
            )
        }
    }, [latitude, longitude, flyTo])

    return (
        <div
            ref={elRef}
            className="relative z-0 h-[360px] w-full overflow-hidden rounded-2xl border border-slate-200 sm:h-[430px]"
        />
    )
}

export default function LocationsPage() {
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [form, setForm] = useState(emptyForm)
    const [error, setError] = useState('')
    const [geoMsg, setGeoMsg] = useState('')
    const [busy, setBusy] = useState(false)
    const [flyTo, setFlyTo] = useState(0)

    const load = () => {
        api.get('/locations')
            .then((res) => setItems(res.data))
            .catch((err) => setError(errorText(err)))
            .finally(() => setLoading(false))
    }

    useEffect(() => {
        load()
    }, [])

    const set = (key) => (e) => {
        setForm({
            ...form,
            [key]: e.target.value,
        })
    }

    const setPin = (latitude, longitude) => {
        setForm((f) => ({
            ...f,
            latitude,
            longitude,
        }))

        setGeoMsg('')
    }

    const getMyLocation = () => {
        if (!navigator.geolocation) {
            setGeoMsg('เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง')
            return
        }

        setGeoMsg('กำลังค้นหาตำแหน่ง...')

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setPin(
                    round6(pos.coords.latitude),
                    round6(pos.coords.longitude),
                )

                setFlyTo((n) => n + 1)

                setGeoMsg('พบตำแหน่งปัจจุบันแล้ว')
            },
            () => {
                setGeoMsg(
                    'ไม่สามารถอ่านตำแหน่งได้ กรุณาอนุญาตการเข้าถึงตำแหน่ง',
                )
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
            },
        )
    }

    const submit = async (e) => {
        e.preventDefault()

        setError('')
        setBusy(true)

        try {
            await api.post('/locations', {
                label: form.label.trim() || null,
                address: form.address.trim(),
                building: form.building.trim() || null,
                floor: form.floor.trim() || null,
                room: form.room.trim() || null,
                landmark: form.landmark.trim() || null,
                latitude: form.latitude,
                longitude: form.longitude,
            })

            setForm(emptyForm)
            setGeoMsg('')

            await load()
        } catch (err) {
            setError(errorText(err))
        } finally {
            setBusy(false)
        }
    }

    const remove = async (id) => {
        if (!window.confirm('ต้องการลบที่อยู่นี้ออกจากรายการหรือไม่?')) {
            return
        }

        try {
            await api.delete(`/locations/${id}`)
            await load()
        } catch (err) {
            setError(errorText(err))
        }
    }

    return (
        <div className="space-y-8">

            {/* Page Header */}
            <section>
                <p className="text-xs font-bold tracking-[0.2em] text-blue-600">
                    MY LOCATIONS
                </p>

                <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                            ที่อยู่ของฉัน
                        </h1>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                            จัดการที่อยู่สำหรับรับและส่งผ้าของคุณ
                            เพื่อให้การใช้บริการ WashGo สะดวกยิ่งขึ้น
                        </p>
                    </div>

                    <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-600">
                        {items.length} ที่อยู่
                    </div>
                </div>
            </section>

            {/* Error */}
            {error && (
                <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 font-bold">
                        !
                    </span>
                    <span>{error}</span>
                </div>
            )}

            {/* Add Location */}
            <section className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">

                {/* Section Header */}
                <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/60 px-6 py-5 sm:px-8">
                    <p className="text-xs font-bold tracking-wider text-blue-600">
                        ADD NEW LOCATION
                    </p>

                    <h2 className="mt-1 text-xl font-bold text-slate-900">
                        เพิ่มที่อยู่ใหม่
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                        กรอกข้อมูลที่อยู่และเลือกตำแหน่งบนแผนที่
                    </p>
                </div>

                <form onSubmit={submit} className="p-6 sm:p-8">

                    <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">

                        {/* Form */}
                        <div className="space-y-5">

                            <div>
                                <label className={labelCls}>
                                    ชื่อเรียก
                                </label>

                                <input
                                    type="text"
                                    maxLength={50}
                                    value={form.label}
                                    onChange={set('label')}
                                    placeholder="เช่น บ้าน, ที่ทำงาน"
                                    className={inputCls}
                                />
                            </div>

                            <div>
                                <label className={labelCls}>
                                    ที่อยู่
                                    <span className="ml-1 text-red-500">
                                        *
                                    </span>
                                </label>

                                <textarea
                                    maxLength={300}
                                    value={form.address}
                                    onChange={set('address')}
                                    required
                                    placeholder="บ้านเลขที่ ถนน ตำบล อำเภอ จังหวัด"
                                    className={`${inputCls} min-h-[110px] resize-none`}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">

                                <div>
                                    <label className={labelCls}>
                                        อาคาร / หมู่บ้าน
                                    </label>

                                    <input
                                        type="text"
                                        maxLength={100}
                                        value={form.building}
                                        onChange={set('building')}
                                        placeholder="เช่น หมู่บ้าน..."
                                        className={inputCls}
                                    />
                                </div>

                                <div>
                                    <label className={labelCls}>
                                        ชั้น
                                    </label>

                                    <input
                                        type="text"
                                        maxLength={20}
                                        value={form.floor}
                                        onChange={set('floor')}
                                        placeholder="เช่น 2"
                                        className={inputCls}
                                    />
                                </div>

                                <div>
                                    <label className={labelCls}>
                                        ห้อง
                                    </label>

                                    <input
                                        type="text"
                                        maxLength={20}
                                        value={form.room}
                                        onChange={set('room')}
                                        placeholder="เช่น 204"
                                        className={inputCls}
                                    />
                                </div>

                                <div>
                                    <label className={labelCls}>
                                        จุดสังเกต
                                    </label>

                                    <input
                                        type="text"
                                        maxLength={200}
                                        value={form.landmark}
                                        onChange={set('landmark')}
                                        placeholder="เช่น ใกล้ร้าน..."
                                        className={inputCls}
                                    />
                                </div>

                            </div>

                            {/* Selected Location */}
                            <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">

                                <div className="flex items-start gap-3">

                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                                        <svg
                                            className="h-5 w-5"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                        >
                                            <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
                                            <circle cx="12" cy="10" r="2.5" />
                                        </svg>
                                    </div>

                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-slate-800">
                                            ตำแหน่งที่เลือก
                                        </p>

                                        {form.latitude != null ? (
                                            <p className="mt-1 break-all text-xs leading-5 text-slate-500">
                                                {form.latitude}, {form.longitude}
                                            </p>
                                        ) : (
                                            <p className="mt-1 text-xs text-slate-500">
                                                ยังไม่ได้เลือกตำแหน่งบนแผนที่
                                            </p>
                                        )}
                                    </div>

                                </div>

                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={busy || form.latitude == null}
                                className="w-full rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                            >
                                {busy
                                    ? 'กำลังบันทึก...'
                                    : 'บันทึกที่อยู่'}
                            </button>

                        </div>

                        {/* Map */}
                        <div>

                            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">

                                <div>
                                    <p className="text-sm font-bold text-slate-800">
                                        ตำแหน่งบนแผนที่
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                        คลิกบนแผนที่หรือลากหมุดเพื่อปรับตำแหน่ง
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={getMyLocation}
                                    className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-3.5 py-2 text-xs font-bold text-blue-600 shadow-sm transition-all hover:border-blue-300 hover:bg-blue-50 hover:shadow-md"
                                >
                                    <svg
                                        className="h-4 w-4"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <circle cx="12" cy="12" r="8" />
                                        <circle cx="12" cy="12" r="2" />
                                        <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
                                    </svg>

                                    ตำแหน่งปัจจุบัน
                                </button>

                            </div>

                            <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
                                <LocationPicker
                                    latitude={form.latitude}
                                    longitude={form.longitude}
                                    onChange={setPin}
                                    flyTo={flyTo}
                                />
                            </div>

                            {geoMsg && (
                                <p className="mt-2 text-xs text-slate-500">
                                    {geoMsg}
                                </p>
                            )}

                        </div>

                    </div>
                </form>
            </section>

            {/* Saved Locations */}
            <section>

                <div className="mb-5 flex items-end justify-between gap-3">
                    <div>
                        <p className="text-xs font-bold tracking-[0.2em] text-blue-600">
                            SAVED LOCATIONS
                        </p>

                        <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
                            ที่อยู่ที่บันทึกไว้
                        </h2>
                    </div>

                    {!loading && items.length > 0 && (
                        <p className="text-sm text-slate-400">
                            {items.length} รายการ
                        </p>
                    )}
                </div>

                {loading && (
                    <div className="grid gap-4 md:grid-cols-2">
                        {[1, 2].map((item) => (
                            <div
                                key={item}
                                className="h-40 animate-pulse rounded-2xl bg-slate-200/70"
                            />
                        ))}
                    </div>
                )}

                {!loading && items.length === 0 && (
                    <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 px-6 py-14 text-center">

                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">

                            <svg
                                className="h-8 w-8"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                            >
                                <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
                                <circle cx="12" cy="10" r="2.5" />
                            </svg>

                        </div>

                        <h3 className="mt-5 text-lg font-bold text-slate-800">
                            ยังไม่มีที่อยู่
                        </h3>

                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                            เพิ่มที่อยู่สำหรับรับและส่งผ้า
                            เพื่อเริ่มใช้บริการ WashGo ได้สะดวกยิ่งขึ้น
                        </p>

                    </div>
                )}

                {!loading && items.length > 0 && (
                    <div className="grid gap-4 md:grid-cols-2">

                        {items.map((l) => (
                            <div
                                key={l.id}
                                className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-100 hover:shadow-lg"
                            >

                                {/* Decorative */}
                                <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-blue-50 transition-transform duration-500 group-hover:scale-125" />

                                <div className="relative z-10">

                                    <div className="flex items-start justify-between gap-4">

                                        <div className="flex min-w-0 items-center gap-3">

                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">

                                                <svg
                                                    className="h-5 w-5"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="1.8"
                                                >
                                                    <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
                                                    <circle cx="12" cy="10" r="2.5" />
                                                </svg>

                                            </div>

                                            <div className="min-w-0">

                                                <div className="flex flex-wrap items-center gap-2">

                                                    <h3 className="truncate font-bold text-slate-900">
                                                        {l.label || 'ที่อยู่'}
                                                    </h3>

                                                    {l.label && (
                                                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-600">
                                                            SAVED
                                                        </span>
                                                    )}

                                                </div>

                                                <p className="mt-1 text-xs text-slate-400">
                                                    ตำแหน่งรับ-ส่งผ้า
                                                </p>

                                            </div>

                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => remove(l.id)}
                                            className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                                        >
                                            ลบ
                                        </button>

                                    </div>

                                    <div className="mt-5 border-t border-slate-100 pt-4">

                                        <p className="text-sm leading-6 text-slate-700">
                                            {l.address}
                                        </p>

                                        {[
                                            l.building,
                                            l.floor && `ชั้น ${l.floor}`,
                                            l.room && `ห้อง ${l.room}`,
                                            l.landmark,
                                        ].filter(Boolean).length > 0 && (
                                            <p className="mt-2 text-xs leading-5 text-slate-400">
                                                {[
                                                    l.building,
                                                    l.floor && `ชั้น ${l.floor}`,
                                                    l.room && `ห้อง ${l.room}`,
                                                    l.landmark,
                                                ]
                                                    .filter(Boolean)
                                                    .join(' · ')}
                                            </p>
                                        )}

                                        {l.latitude != null && (
                                            <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-400">
                                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                                <span>
                                                    {l.latitude}, {l.longitude}
                                                </span>
                                            </div>
                                        )}

                                    </div>

                                </div>
                            </div>
                        ))}

                    </div>
                )}

            </section>

        </div>
    )
}