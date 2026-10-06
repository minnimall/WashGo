import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { ui } from '../ui'

// ไอคอนเป็นอีโมจิที่เราเขียนเอง ห้ามใส่ข้อความจากผู้ใช้ลงใน html นี้หรือใน label (กัน XSS)
const pinIcon = (emoji, color) =>
    L.divIcon({
        className: '',
        html: `<div style="width:30px;height:30px;border-radius:9999px;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-size:15px">${emoji}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
    })

const keyOf = (m, digits) => (m ? `${m.lat.toFixed(digits)},${m.lng.toFixed(digits)}` : '')

// to / other = { lat, lng, icon, color, label }   from = { lat, lng }
// มี from → วาดเส้นทางจาก from ไป to
export default function RouteMap({ from, to, other, fromLabel = 'ตำแหน่งของคุณ' }) {
    const el = useRef(null)
    const map = useRef(null)
    const markerLayer = useRef(null)
    const routeLayer = useRef(null)
    const fitted = useRef('')
    const routeFitted = useRef('')
    const [route, setRoute] = useState(null)
    const [routeFailed, setRouteFailed] = useState(false)

    const toKey = keyOf(to, 5)
    const targetsKey = `${toKey}|${keyOf(other, 5)}`
    const fromKey = keyOf(from, 5)        // หมุดขยับทุกครั้งที่ GPS เปลี่ยน
    const routeFromKey = keyOf(from, 3)   // ขอเส้นทางใหม่เมื่อขยับเกิน ~100 ม.

    useEffect(() => {
        map.current = L.map(el.current).setView([to.lat, to.lng], 15)
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap',
        }).addTo(map.current)
        routeLayer.current = L.layerGroup().addTo(map.current)
        markerLayer.current = L.layerGroup().addTo(map.current)
        return () => {
        map.current.remove()
        map.current = null
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // หมุด: วาดใหม่ทุกครั้งที่ตำแหน่งเปลี่ยน แต่ปรับมุมมองแค่ตอนเปลี่ยนเป้าหมาย/เริ่มมีตำแหน่ง
    useEffect(() => {
        const g = markerLayer.current
        if (!g) return
        g.clearLayers()

        const points = []
        const add = (m, emoji, color) => {
        L.marker([m.lat, m.lng], { icon: pinIcon(emoji, color) }).bindTooltip(m.label).addTo(g)
        points.push([m.lat, m.lng])
        }
        add(to, to.icon, to.color)
        if (other) add(other, other.icon, other.color)
        if (from) add({ ...from, label: fromLabel }, '🛵', '#f59e0b')

        const fitKey = targetsKey + (from ? '|r' : '')
        if (fitted.current !== fitKey) {
        fitted.current = fitKey
        if (points.length > 1) map.current.fitBounds(points, { padding: [30, 30], maxZoom: 16 })
        else map.current.setView(points[0], 15)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [targetsKey, fromKey])

    // เส้นทาง: เส้นเก่าอยู่จนกว่าเส้นใหม่จะมา กันกะพริบ
    useEffect(() => {
        const g = routeLayer.current
        if (!g) return
        if (!from) {
        g.clearLayers()
        setRoute(null)
        setRouteFailed(false)
        return
        }

        const ctrl = new AbortController()
        const url =
        `https://router.project-osrm.org/route/v1/driving/` +
        `${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`

        fetch(url, { signal: ctrl.signal })
        .then((r) => {
            if (!r.ok) throw new Error('route')
            return r.json()
        })
        .then((d) => {
            const r0 = d.routes?.[0]
            if (!r0 || !map.current) throw new Error('route')
            g.clearLayers()
            L.geoJSON(r0.geometry, { style: { color: '#2563eb', weight: 5, opacity: 0.85 } }).addTo(g)
            if (routeFitted.current !== toKey) {
            routeFitted.current = toKey
            map.current.fitBounds(
                L.latLngBounds(r0.geometry.coordinates.map(([x, y]) => [y, x])),
                { padding: [30, 30] },
            )
            }
            setRoute({ km: r0.distance / 1000, min: r0.duration / 60 })
            setRouteFailed(false)
        })
        .catch((e) => {
            if (e.name !== 'AbortError') setRouteFailed(true)
        })

        return () => ctrl.abort()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [routeFromKey, toKey])

    return (
        <div>
        <div ref={el} className="isolate z-0 h-72 w-full overflow-hidden rounded-xl border border-gray-200" />
        {route && (
            <p className="mt-2 text-sm text-gray-700">
            ระยะทางตามถนนประมาณ <strong>{route.km.toFixed(1)} กม.</strong> · ใช้เวลาประมาณ{' '}
            <strong>{Math.max(1, Math.round(route.min))} นาที</strong>
            </p>
        )}
        {routeFailed && (
            <p className={`${ui.muted} mt-2`}>วาดเส้นทางไม่ได้ในขณะนี้</p>
        )}
        </div>
    )
}