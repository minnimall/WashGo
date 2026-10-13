import { useCallback, useState } from 'react'
import api from './api'
import { useAuth } from './AuthContext'
import useAutoRefresh from './useAutoRefresh'

// เก็บผลล่าสุดไว้ในหน่วยความจำ ผูกกับผู้ใช้ เพื่อเปิดหน้าซ้ำแล้วเห็นทันที
let cache = { uid: null, data: null }
const uidOf = (u) => u?.id ?? u?.userId ?? u?.email ?? null   // ไม่มีตัวระบุ = ไม่ใช้แคช (ปลอดภัยไว้ก่อน)

export function useEarnings(interval = 30000) {
    const { user } = useAuth()
    const uid = uidOf(user)
    const initial = uid && cache.uid === uid ? cache.data : null

    const [data, setData] = useState(initial)
    const [loading, setLoading] = useState(!initial)
    const [error, setError] = useState('')

    const load = useCallback(async () => {
        try {
            const res = await api.get('/rider/earnings')
            if (uid) cache = { uid, data: res.data }
            setData(res.data)
            setError('')
        } catch {
            setError('โหลดข้อมูลรายได้ไม่สำเร็จ')
        } finally {
            setLoading(false)
        }
    }, [uid])

    useAutoRefresh(load, { interval })

    return { data, loading, error, reload: load }
}