import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * หน้าต่างแสดงรูปเต็ม (modal) ใช้ร่วมกันทั้งสลิป รูปผ้า และรูปถ่ายในงาน
 *
 * props
 *  - images     : [{ src, title, caption? }]
 *  - startIndex : รูปที่เปิดก่อน
 *  - onClose    : เรียกเมื่อปิด
 *
 * ถ้ามีหลายรูป จะมีปุ่มก่อนหน้า/ถัดไป, ปุ่มลูกศรซ้ายขวาบนคีย์บอร์ด และปัดซ้ายขวาบนมือถือ
 * วาดผ่าน portal ไปที่ <body> เพื่อไม่ให้ถูกตัดโดยการ์ดที่ครอบอยู่
 */
export default function ImageModal({ images, startIndex = 0, onClose }) {
    const [index, setIndex] = useState(startIndex)
    const closeRef = useRef(null)
    const touchX = useRef(null)

    const count = images.length
    const current = images[index]

    const prev = useCallback(() => setIndex((i) => (i - 1 + count) % count), [count])
    const next = useCallback(() => setIndex((i) => (i + 1) % count), [count])

    // กันหน้าด้านหลังเลื่อนตอนเปิด modal (ทำครั้งเดียวตอนเปิด)
    useEffect(() => {
        const prevOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        closeRef.current?.focus()

        return () => {
            document.body.style.overflow = prevOverflow
        }
    }, [])

    // คีย์บอร์ด
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') onClose()
            else if (count > 1 && e.key === 'ArrowLeft') prev()
            else if (count > 1 && e.key === 'ArrowRight') next()
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [onClose, prev, next, count])

    if (!current) return null

    const onTouchStart = (e) => {
        touchX.current = e.touches[0].clientX
    }

    const onTouchEnd = (e) => {
        if (touchX.current === null || count < 2) return
        const dx = e.changedTouches[0].clientX - touchX.current
        touchX.current = null
        if (Math.abs(dx) < 50) return
        if (dx > 0) prev()
        else next()
    }

    const navBtn =
        'absolute top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-gray-900/60 text-white shadow transition hover:bg-gray-900/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400'

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-label={current.title}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
        >
            <div className="relative flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{current.title}</p>
                        {count > 1 && (
                            <p className="text-xs text-gray-400">
                                {index + 1} / {count}
                            </p>
                        )}
                    </div>

                    <button
                        ref={closeRef}
                        type="button"
                        onClick={onClose}
                        aria-label="ปิด"
                        className="flex size-8 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            className="size-4"
                            aria-hidden="true"
                        >
                            <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                    </button>
                </div>

                {/* Image */}
                <div
                    className="relative min-h-0 flex-1 overflow-auto bg-gray-50 p-3"
                    onTouchStart={onTouchStart}
                    onTouchEnd={onTouchEnd}
                >
                    <img
                        key={current.src}
                        src={current.src}
                        alt={current.title}
                        className="mx-auto max-h-[70vh] w-auto max-w-full object-contain"
                    />

                    {count > 1 && (
                        <>
                            <button type="button" onClick={prev} aria-label="รูปก่อนหน้า" className={`${navBtn} left-2`}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden="true">
                                    <path d="M15 6l-6 6 6 6" />
                                </svg>
                            </button>
                            <button type="button" onClick={next} aria-label="รูปถัดไป" className={`${navBtn} right-2`}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden="true">
                                    <path d="M9 6l6 6-6 6" />
                                </svg>
                            </button>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-4 py-2.5">
                    <p className="min-w-0 truncate text-xs text-gray-400">{current.caption ?? ''}</p>

                    <a
                        href={current.src}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                        เปิดในแท็บใหม่
                    </a>
                </div>
            </div>
        </div>,
        document.body,
    )
}