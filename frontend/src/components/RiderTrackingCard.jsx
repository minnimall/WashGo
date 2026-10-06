import { useEffect, useState } from 'react'
import api from '../api'
import RouteMap from './RouteMap'
import { ui } from '../ui'

function haversineKm(a, b) {
    const R = 6371
    const rad = (d) => (d * Math.PI) / 180
    const dLat = rad(b.lat - a.lat)
    const dLng = rad(b.lng - a.lng)
    const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export default function RiderTrackingCard({ orderId, status, pickup, delivery }) {
    const [point, setPoint] = useState(null)
    const [error, setError] = useState('')

    useEffect(() => {
        let alive = true
        const load = async () => {
        try {
            const res = await api.get(`/orders/${orderId}/tracking`)
            if (!alive) return
            setPoint(res.data.point)
            setError('')
        } catch {
            if (alive) setError('โหลดตำแหน่ง Rider ไม่ได้ในขณะนี้')
        }
        }
        load()
        const t = setInterval(() => { if (!document.hidden) load() }, 6000)
        return () => {
        alive = false
        clearInterval(t)
        }
    }, [orderId, status])

    const delivering = status === 'Delivering'
    const loc = delivering ? delivery : pickup
    const target = {
        lat: loc.latitude,
        lng: loc.longitude,
        icon: delivering ? '🏠' : '🧺',
        color: delivering ? '#16a34a' : '#2563eb',
        label: delivering ? 'จุดส่งผ้า' : 'จุดรับผ้า',
    }

    const rider = point ? { lat: point.lat, lng: point.lng } : null
    const km = rider ? haversineKm(rider, { lat: target.lat, lng: target.lng }) : null
    const ageSec = point ? Math.round((Date.now() - new Date(point.at).getTime()) / 1000) : null

    let banner = null
    if (km !== null) {
        if (km <= 0.2) banner = ['bg-green-50 text-green-800', 'Rider ถึงแล้ว หรืออยู่ใกล้มาก เตรียมรับได้เลย']
        else if (km <= 0.8) banner = ['bg-amber-50 text-amber-800', `Rider ใกล้ถึงแล้ว (ห่างประมาณ ${Math.round(km * 1000)} เมตร)`]
        else banner = ['bg-blue-50 text-blue-800', `Rider ห่างประมาณ ${km.toFixed(1)} กม. (เส้นตรง)`]
    }

    return (
        <div className={ui.card}>
        <h2 className={ui.h2}>
            {delivering ? 'Rider กำลังนำผ้ามาส่ง' : 'Rider กำลังเดินทางมารับผ้าของคุณ'}
        </h2>

        {banner && <p className={`mb-3 rounded-lg px-3 py-2 font-medium ${banner[0]}`}>{banner[1]}</p>}
        {!point && !error && (
            <p className={`${ui.muted} mb-3`}>รอ Rider เปิดแชร์ตำแหน่ง...</p>
        )}
        {error && <div className={ui.error}>{error}</div>}

        <RouteMap from={rider} to={target} fromLabel="Rider" />

        {ageSec !== null && (
            <p className={`${ui.muted} mt-2`}>
            {ageSec > 60 ? `ตำแหน่งล่าสุดเมื่อ ${Math.round(ageSec / 60)} นาทีที่แล้ว` : 'อัปเดตตำแหน่งล่าสุดเมื่อสักครู่'}
            </p>
        )}
        </div>
    )
}