import { useEffect, useRef, useState } from 'react'
import api from './api'

// ส่งตำแหน่งล่าสุดของ Rider ทุก 6 วินาทีขณะ enabled คืนค่า true ถ้าส่งสำเร็จล่าสุด
export default function useShareLocation(orderId, enabled, pos) {
    const latest = useRef(pos)
    useEffect(() => { latest.current = pos })

    const [sharing, setSharing] = useState(false)

    useEffect(() => {
        if (!enabled) {
        setSharing(false)
        return
        }
        let stopped = false

        const send = async () => {
        const p = latest.current
        if (!p) return
        try {
            await api.put(`/orders/${orderId}/tracking`, { lat: p.lat, lng: p.lng })
            if (!stopped) setSharing(true)
        } catch {
            if (!stopped) setSharing(false)
        }
        }

        send()
        const t = setInterval(send, 6000)
        return () => {
        stopped = true
        clearInterval(t)
        }
    }, [enabled, orderId])

    return sharing
}