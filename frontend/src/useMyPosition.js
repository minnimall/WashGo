import { useEffect, useState } from 'react'

// ติดตามตำแหน่งปัจจุบันของผู้ใช้ (เปิดเฉพาะตอน enabled) ตำแหน่งอยู่แค่ในหน้าจอ ไม่ถูกส่งไปไหน
export default function useMyPosition(enabled) {
    const [pos, setPos] = useState(null)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!enabled) return
        if (!navigator.geolocation) {
        setError('เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง')
        return
        }
        const id = navigator.geolocation.watchPosition(
        (p) => {
            setPos({ lat: p.coords.latitude, lng: p.coords.longitude })
            setError('')
        },
        () => setError('อ่านตำแหน่งของคุณไม่ได้ กรุณาอนุญาตการเข้าถึงตำแหน่งในเบราว์เซอร์'),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
        )
        return () => navigator.geolocation.clearWatch(id)
    }, [enabled])

    return { pos, error }
}