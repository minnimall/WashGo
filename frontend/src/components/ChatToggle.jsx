import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../api'
import useAutoRefresh from '../useAutoRefresh'
import { subscribeChat } from '../chatConnection'

// ปุ่มไอคอนแชทสำหรับวางในส่วนหัว มีจุดแดงบอกจำนวนข้อความที่ยังไม่อ่าน
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

    return (
        <button
        type="button"
        onClick={onToggle}
        aria-label={open ? 'ปิดแชท' : 'เปิดแชท'}
        aria-expanded={open}
        className={`relative ml-auto flex h-10 w-10 items-center justify-center rounded-full border text-xl transition ${
            open ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white hover:bg-gray-50'
        }`}
        >
        💬
        {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-semibold text-white">
            {unread > 9 ? '9+' : unread}
            </span>
        )}
        </button>
    )
}