import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../api'
import useAutoRefresh from '../useAutoRefresh'
import { subscribeChat } from '../chatConnection'

// ปุ่มเปิด/ปิดแชท มีป้ายตัวเลขสีแดงบอกจำนวนข้อความที่ยังไม่อ่าน
export default function ChatToggle({ orderId, me, open, onToggle }) {
    const [unread, setUnread] = useState(0)
    const openRef = useRef(open)
    openRef.current = open

    const load = useCallback(async () => {
        if (openRef.current) { setUnread(0); return }
        try {
            const res = await api.get(`/orders/${orderId}/chat/unread`)
            setUnread(res.data.count)
        } catch { /* ไม่เป็นไร ลองใหม่รอบหน้า */ }
    }, [orderId])

    useEffect(() => { load() }, [load, open])

    useEffect(() => subscribeChat({
        onMessage: (oid, dto) => {
            if (Number(oid) !== Number(orderId)) return
            if (!openRef.current && dto.sender !== me && dto.sender !== 'System') setUnread((n) => n + 1)
        },
        onResync: load,
    }), [orderId, me, load])

    useAutoRefresh(load, { interval: 20000 })

    const label = open ? 'ปิดแชท' : me === 'Customer' ? 'แชทกับ Rider' : 'แชทกับลูกค้า'

    return (
        <button
            type="button"
            onClick={onToggle}
            aria-label={unread > 0 && !open ? `${label} (${unread} ข้อความใหม่)` : label}
            aria-expanded={open}
            className={`relative ml-auto inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                open
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    : 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
            }`}
        >
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4"
                aria-hidden="true"
            >
                {open ? (
                    <path d="M18 6 6 18M6 6l12 12" />
                ) : (
                    <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12Z" />
                )}
            </svg>

            {label}

            {unread > 0 && !open && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-semibold text-white ring-2 ring-white">
                    {unread > 9 ? '9+' : unread}
                </span>
            )}
        </button>
    )
}