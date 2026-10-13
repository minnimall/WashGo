import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../api'
import useAutoRefresh from '../useAutoRefresh'
import { subscribeChat } from '../chatConnection'
import { errorText, resizeImage } from '../utils'
import { btn, ui } from '../ui'

const merge = (prev, incoming) => {
    const map = new Map(prev.map((m) => [m.id, m]))
    incoming.forEach((m) => map.set(m.id, m))   // ของใหม่ทับของเก่า (อัปเดตสถานะอ่านแล้วด้วย)
    return [...map.values()].sort((a, b) => a.id - b.id)
}

const timeOf = (iso) =>
    new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })

// me = 'Customer' | 'Rider' (ฝั่งที่กำลังเปิดหน้านี้)
export default function ChatCard({ orderId, me, orderStatus, onClose }) {
    const [messages, setMessages] = useState([])
    const [canSend, setCanSend] = useState(true)
    const [hasMore, setHasMore] = useState(false)
    const [loaded, setLoaded] = useState(false)
    const [text, setText] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')

    const box = useRef(null)
    const stick = useRef(true)   // อยู่ท้ายแชทหรือไม่ ถ้าใช่ค่อยเลื่อนตามข้อความใหม่

    const fromOther = (m) => m.sender !== me && m.sender !== 'System'

    const markRead = useCallback(() => {
        if (document.hidden) return
        api.post(`/orders/${orderId}/chat/read`).catch(() => {})
    }, [orderId])

    const load = useCallback(async (first) => {
        try {
        const res = await api.get(`/orders/${orderId}/chat`)
        setMessages((prev) => merge(prev, res.data.messages))
        setCanSend(res.data.canSend)
        if (first) {
            setHasMore((h) => h || res.data.hasMore)
            setError('')
        }
        if (res.data.messages.some((m) => m.sender !== me && m.sender !== 'System' && !m.readAt)) markRead()
        } catch (err) {
        if (first) setError(errorText(err))
        } finally {
        if (first) setLoaded(true)
        }
    }, [orderId, me, markRead])

    // โหลดตอนเปิด และโหลดซ้ำเมื่อสถานะออเดอร์เปลี่ยน (แชทอาจเปลี่ยนเป็นอ่านอย่างเดียว)
    useEffect(() => { load(true) }, [load, orderStatus])

    // ข้อความใหม่แบบทันที (SignalR)
    useEffect(() => {
        return subscribeChat({
        onMessage: (oid, dto) => {
            if (Number(oid) !== Number(orderId)) return
            setMessages((prev) => merge(prev, [dto]))
            if (dto.sender !== me && dto.sender !== 'System') markRead()
        },
        onRead: (oid) => {
            if (Number(oid) !== Number(orderId)) return
            const now = new Date().toISOString()
            setMessages((prev) => prev.map((m) => (m.sender === me && !m.readAt ? { ...m, readAt: now } : m)))
        },
        onResync: () => load(false),
        })
    }, [orderId, me, markRead, load])

    // สำรอง: ถ้า WebSocket ใช้ไม่ได้ ยังดึงข้อความใหม่เองทุก 20 วินาที และทันทีเมื่อกลับมาที่หน้านี้
    useAutoRefresh(() => load(false), { interval: 20000 })

    useEffect(() => {
        const el = box.current
        if (el && stick.current) el.scrollTop = el.scrollHeight
    }, [messages])

    const onScroll = () => {
        const el = box.current
        stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    }

    const loadOlder = async () => {
        const oldest = messages[0]
        if (!oldest) return
        const el = box.current
        const before = el.scrollHeight
        try {
        const res = await api.get(`/orders/${orderId}/chat`, { params: { before: oldest.id } })
        stick.current = false
        setMessages((prev) => merge(prev, res.data.messages))
        setHasMore(res.data.hasMore)
        requestAnimationFrame(() => { el.scrollTop = el.scrollHeight - before })
        } catch (err) {
        setError(errorText(err))
        }
    }

    const send = async (e) => {
        e?.preventDefault()
        const body = text.trim()
        if (!body || busy) return
        setBusy(true)
        setError('')
        try {
        const res = await api.post(`/orders/${orderId}/chat/messages`, { body })
        stick.current = true
        setMessages((prev) => merge(prev, [res.data]))
        setText('')
        } catch (err) {
        setError(errorText(err))
        } finally {
        setBusy(false)
        }
    }

    const sendImage = async (e) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file || busy) return
        setBusy(true)
        setError('')
        try {
        const blob = await resizeImage(file)
        const fd = new FormData()
        fd.append('file', new File([blob], 'chat.jpg', { type: 'image/jpeg' }))
        const res = await api.post(`/orders/${orderId}/chat/images`, fd)
        stick.current = true
        setMessages((prev) => merge(prev, [res.data]))
        } catch (err) {
        setError(err.response ? errorText(err) : 'อ่านรูปไม่ได้ กรุณาใช้ไฟล์ JPG หรือ PNG')
        } finally {
        setBusy(false)
        }
    }

    const onKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) send(e)
    }

    return (
        <div className={ui.card}>
        <div className="mb-2 flex items-center justify-between">
            <h2 className={ui.h2}>{me === 'Customer' ? 'แชทกับ Rider' : 'แชทกับลูกค้า'}</h2>
            {onClose && (
            <button type="button" className={ui.link} onClick={onClose}>ปิด</button>
            )}
        </div>

        <div
            ref={box}
            onScroll={onScroll}
            className="h-80 space-y-2 overflow-y-auto rounded-xl border border-gray-200 bg-white p-3"
        >
            {hasMore && (
            <div className="text-center">
                <button type="button" className={ui.link} onClick={loadOlder}>โหลดข้อความก่อนหน้า</button>
            </div>
            )}

            {loaded && messages.length === 0 && (
            <p className={`${ui.muted} py-10 text-center`}>ยังไม่มีข้อความ ทักทายได้เลย</p>
            )}

            {messages.map((m) => {
            if (m.sender === 'System') {
                return <p key={m.id} className="text-center text-xs text-gray-400">{m.body}</p>
            }
            const mine = m.sender === me
            return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    mine ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
                    }`}
                >
                    {!mine && (
                    <div className="mb-0.5 text-xs font-medium text-gray-500">
                        {m.sender === 'Rider' ? 'Rider' : 'ลูกค้า'}
                    </div>
                    )}

                    {m.type === 'Image' ? (
                    <a href={`/api/chat/images/${m.id}`} target="_blank" rel="noopener noreferrer">
                        <img
                        src={`/api/chat/images/${m.id}`}
                        alt="รูปในแชท"
                        loading="lazy"
                        className="max-h-60 rounded-lg object-contain"
                        />
                    </a>
                    ) : (
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    )}

                    <div className={`mt-1 text-right text-[11px] ${mine ? 'text-blue-100' : 'text-gray-400'}`}>
                    {timeOf(m.createdAt)}
                    {mine && m.readAt && ' · อ่านแล้ว'}
                    </div>
                </div>
                </div>
            )
            })}
        </div>

        {error && <div className={ui.error}>{error}</div>}

        {canSend ? (
            <form onSubmit={send} className="mt-3 flex items-end gap-2">
            <label className={`${btn('default')} shrink-0 ${busy ? 'pointer-events-none opacity-50' : ''}`}>
                📷
                <input type="file" accept="image/*" className="hidden" onChange={sendImage} disabled={busy} />
            </label>
            <textarea
                className={`${ui.input} max-h-28 min-h-[40px] resize-none`}
                rows={1}
                maxLength={1000}
                placeholder="พิมพ์ข้อความ (Enter เพื่อส่ง)"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={onKeyDown}
            />
            <button type="submit" className={`${btn('primary')} shrink-0`} disabled={busy || !text.trim()}>
                ส่ง
            </button>
            </form>
        ) : (
            <p className={`${ui.muted} mt-3`}>แชทนี้ปิดแล้ว ดูย้อนหลังได้อย่างเดียว</p>
        )}

        <p className="mt-2 text-xs text-gray-400">
            อย่าส่งเลขบัตรประชาชน รหัสผ่าน หรือข้อมูลบัตรในแชท
        </p>
        </div>
    )
}