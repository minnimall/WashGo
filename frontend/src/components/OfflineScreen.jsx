import { useEffect } from 'react'

// แสดงเมื่อเปิดแอปแล้วติดต่อเซิร์ฟเวอร์ไม่ได้เลย (ไม่มีอินเทอร์เน็ต)
// ไม่ให้เด้งไปหน้า Login เพราะผู้ใช้ยังล็อกอินอยู่ แค่ออฟไลน์
export default function OfflineScreen() {
    useEffect(() => {
        const reload = () => window.location.reload()
        window.addEventListener('online', reload)
        return () => window.removeEventListener('online', reload)
    }, [])

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#f3f1ff] px-4">
            <div className="w-full max-w-sm rounded-[28px] bg-white px-8 py-10 text-center shadow-[0_25px_70px_rgba(76,61,145,0.18)]">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 8.8a15 15 0 0 1 4-2.5M22 8.8a15 15 0 0 0-9.5-3.7" />
                        <path d="M5 12.5a10 10 0 0 1 3-2M19 12.5a10 10 0 0 0-5.5-2.9" />
                        <path d="M8.5 16.2a5 5 0 0 1 7 0" />
                        <circle cx="12" cy="19.5" r="0.6" />
                        <path d="M3 3l18 18" />
                    </svg>
                </div>
                <h1 className="text-xl font-bold text-slate-800">ไม่มีการเชื่อมต่ออินเทอร์เน็ต</h1>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                    WashGo ต้องใช้อินเทอร์เน็ตเพื่อดูออเดอร์และติดตามไรเดอร์ ตรวจสอบสัญญาณแล้วลองใหม่อีกครั้ง
                </p>
                <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="mt-6 h-12 w-full rounded-xl bg-violet-500 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:bg-violet-600"
                >
                    ลองใหม่
                </button>
            </div>
        </main>
    )
}