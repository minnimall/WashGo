import { useRegisterSW } from 'virtual:pwa-register/react'

// ลงทะเบียน service worker และแจ้งเมื่อมีเวอร์ชันใหม่ (ไม่รีโหลดเอง กันข้อมูลที่กำลังกรอก/อัปโหลดหาย)
export default function PwaUpdater() {
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegisteredSW(_url, registration) {
            // เช็กเวอร์ชันใหม่ทุก 1 ชั่วโมง สำหรับคนที่เปิดแอปค้างไว้นาน ๆ
            if (registration) setInterval(() => registration.update(), 60 * 60 * 1000)
        },
    })

    if (!needRefresh) return null

    return (
        <div
            role="status"
            className="fixed inset-x-4 bottom-24 z-[60] mx-auto flex max-w-sm items-center gap-3 rounded-2xl bg-slate-800 px-4 py-3 text-white shadow-xl lg:inset-x-auto lg:bottom-6 lg:left-6 lg:mx-0"
        >
            <p className="flex-1 text-xs leading-5">มี WashGo เวอร์ชันใหม่พร้อมใช้งาน</p>
            <button
                type="button"
                onClick={() => setNeedRefresh(false)}
                className="text-xs font-semibold text-slate-300 hover:text-white"
            >
                ภายหลัง
            </button>
            <button
                type="button"
                onClick={() => updateServiceWorker(true)}
                className="rounded-lg bg-violet-500 px-3 py-1.5 text-xs font-semibold hover:bg-violet-400"
            >
                อัปเดต
            </button>
        </div>
    )
}