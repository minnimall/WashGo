import { useEffect, useRef } from 'react'

// เรียก refresh เป็นรอบทุก interval ms ขณะหน้านี้มองเห็นอยู่
// และเรียกทันทีเมื่อผู้ใช้กลับมาที่แท็บ/หน้าต่าง หรืออินเทอร์เน็ตกลับมา
// refresh ควรเป็นฟังก์ชันที่ "เงียบ" (ไม่โชว์ loading และไม่ตั้ง error ของหน้า)
export default function useAutoRefresh(refresh, { interval = 8000, enabled = true, immediate = false } = {}) {
    const latest = useRef(refresh)
    useEffect(() => { latest.current = refresh })

    useEffect(() => {
        if (!enabled) return

        let running = false
        const run = async () => {
        if (running || document.hidden) return   // กันเรียกซ้อน และไม่ยิงตอนไม่มีใครมองหน้านี้
        running = true
        try {
            await latest.current()
        } finally {
            running = false
        }
        }

        if (immediate) run() // ยิงทันทีตอนเข้าหน้า ไม่ต้องรอครบ interval
        const timer = setInterval(run, interval)
        const onBack = () => { if (!document.hidden) run() }
        document.addEventListener('visibilitychange', onBack)
        window.addEventListener('focus', onBack)
        window.addEventListener('online', onBack)

        return () => {
        clearInterval(timer)
        document.removeEventListener('visibilitychange', onBack)
        window.removeEventListener('focus', onBack)
        window.removeEventListener('online', onBack)
        }
    }, [interval, enabled])
}