import { useCallback, useEffect, useRef, useState } from 'react'
import api from './api'
import { errorText } from './utils'

// โหลดสถานะการชำระเงิน และดึงใหม่ทุก 8 วินาทีจนกว่าออเดอร์จะ Completed
export default function usePayment(orderId, orderStatus, onChanged) {
    const [payment, setPayment] = useState(null)
    const [error, setError] = useState('')

    const changed = useRef(onChanged)
    useEffect(() => { changed.current = onChanged })

    const load = useCallback(async () => {
        try {
        const res = await api.get(`/orders/${orderId}/payment`)
        setPayment(res.data)
        setError('')
        } catch (err) {
        setError(errorText(err))
        }
    }, [orderId])

    useEffect(() => { load() }, [load])

    const done = payment?.orderStatus === 'Completed'
    useEffect(() => {
        if (done) return
        const t = setInterval(() => { if (!document.hidden) load() }, 8000)
        return () => clearInterval(t)
    }, [done, load])

    // อีกฝั่งทำให้ออเดอร์จบแล้ว แต่หน้าแม่ยังเป็นสถานะเก่า → ให้หน้าแม่โหลดใหม่
    useEffect(() => {
        if (payment?.orderStatus === 'Completed' && orderStatus !== 'Completed') changed.current?.()
    }, [payment?.orderStatus, orderStatus])

    return { payment, setPayment, error, setError }
}