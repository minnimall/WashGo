import { useState } from 'react'
import ImageModal from './ImageModal'

/* แสดงรูปสลิปการโอนเงิน — ใช้ร่วมกันทั้งฝั่งลูกค้าและ Rider (กดรูปแล้วเปิดเป็น modal) */
export default function SlipPreview({ src, title = 'สลิปการโอนเงิน' }) {
    const [failed, setFailed] = useState(false)
    const [open, setOpen] = useState(false)

    if (!src) return null

    if (failed) {
        return (
            <p className="mt-3 rounded-lg bg-white px-3 py-2.5 text-xs text-gray-500">
                โหลดรูปสลิปไม่ได้ ลองรีเฟรชหน้านี้อีกครั้ง
            </p>
        )
    }

    return (
        <>
            <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3">
                <p className="mb-2 text-xs font-medium text-gray-500">{title}</p>

                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="group relative block w-full cursor-zoom-in overflow-hidden rounded-lg bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                    <img
                        src={src}
                        alt={title}
                        loading="lazy"
                        onError={() => setFailed(true)}
                        className="mx-auto max-h-64 w-auto object-contain"
                    />
                    <span className="absolute bottom-2 right-2 rounded-full bg-gray-900/70 px-2.5 py-1 text-[11px] font-medium text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                        แตะเพื่อดูขนาดเต็ม
                    </span>
                </button>
            </div>

            {open && <ImageModal images={[{ src, title }]} onClose={() => setOpen(false)} />}
        </>
    )
}