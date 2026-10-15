import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import api from '../api'
import useAutoRefresh from '../useAutoRefresh'
import { subscribeChat } from '../chatConnection'
import { errorText, resizeImage } from '../utils'

const merge = (prev, incoming) => {
    const map = new Map(prev.map((m) => [m.id, m]))
    incoming.forEach((m) => map.set(m.id, m))   // ของใหม่ทับของเก่า (อัปเดตสถานะอ่านแล้วด้วย)
    return [...map.values()].sort((a, b) => a.id - b.id)
}

const timeOf = (iso) =>
    new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })

const dayKey = (iso) => new Date(iso).toDateString()

const dayLabel = (iso) => {
    const d = new Date(iso)
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)
    if (d.toDateString() === today.toDateString()) return 'วันนี้'
    if (d.toDateString() === yesterday.toDateString()) return 'เมื่อวาน'
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

/* ---------- Icons ---------- */
const iconProps = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
}

const SendIcon = () => (
    <svg {...iconProps} className="size-[18px]">
        <path d="M22 2 11 13" />
        <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
    </svg>
)

const ImageIcon = () => (
    <svg {...iconProps} className="size-5">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="9" cy="9" r="1.5" />
        <path d="m21 15-4.5-4.5L6 21" />
    </svg>
)

const CloseIcon = () => (
    <svg {...iconProps} className="size-4">
        <path d="M18 6 6 18M6 6l12 12" />
    </svg>
)

const LockIcon = () => (
    <svg {...iconProps} className="size-4">
        <rect x="4" y="11" width="16" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
)

// me = 'Customer' | 'Rider' (ฝั่งที่กำลังเปิดหน้านี้)
// embedded = true เมื่อวางอยู่ในการ์ดอื่นอยู่แล้ว (ไม่แสดงกรอบและส่วนหัวของตัวเอง)
export default function ChatCard({ orderId, me, orderStatus, onClose, embedded = false }) {
    const [messages, setMessages] = useState([])
    const [canSend, setCanSend] = useState(true)
    const [hasMore, setHasMore] = useState(false)
    const [loaded, setLoaded] = useState(false)
    const [text, setText] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')

    const box = useRef(null)
    const stick = useRef(true)   // อยู่ท้ายแชทหรือไม่ ถ้าใช่ค่อยเลื่อนตามข้อความใหม่

    const otherName = me === 'Customer' ? 'Rider' : 'ลูกค้า'

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

    const shell = embedded
        ? 'flex flex-col bg-white'
        : 'flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'

    return (
        <div className={shell}>
            {/* Header */}
            {!embedded && (
                <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-600">
                        {otherName.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h2 className="truncate text-sm font-semibold text-slate-900">
                            แชทกับ{otherName}
                        </h2>
                        <p className="flex items-center gap-1.5 text-xs text-slate-500">
                            <span className={`size-1.5 rounded-full ${canSend ? 'bg-green-500' : 'bg-slate-300'}`} />
                            {canSend ? 'กำลังสนทนา' : 'ปิดแชทแล้ว'}
                        </p>
                    </div>
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="ปิดแชท"
                            className="flex size-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                            <CloseIcon />
                        </button>
                    )}
                </div>
            )}

            {/* Messages */}
            <div
                ref={box}
                onScroll={onScroll}
                className="h-80 space-y-1.5 overflow-y-auto bg-slate-50 px-3 py-4 sm:h-96 sm:px-4"
            >
                {hasMore && (
                    <div className="pb-2 text-center">
                        <button
                            type="button"
                            onClick={loadOlder}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                        >
                            โหลดข้อความก่อนหน้า
                        </button>
                    </div>
                )}

                {loaded && messages.length === 0 && (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                        <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-white text-2xl shadow-sm">
                            👋
                        </div>
                        <p className="text-sm font-medium text-slate-700">ยังไม่มีข้อความ</p>
                        <p className="mt-0.5 text-xs text-slate-400">ส่งข้อความทักทายได้เลย</p>
                    </div>
                )}

                {messages.map((m, i) => {
                    const prev = messages[i - 1]
                    const newDay = !prev || dayKey(prev.createdAt) !== dayKey(m.createdAt)
                    const sameSender = prev && prev.sender === m.sender && !newDay

                    const dayDivider = newDay && (
                        <div className="flex justify-center py-2">
                            <span className="rounded-full bg-slate-200/70 px-3 py-0.5 text-[11px] font-medium text-slate-500">
                                {dayLabel(m.createdAt)}
                            </span>
                        </div>
                    )

                    if (m.sender === 'System') {
                        return (
                            <Fragment key={m.id}>
                                {dayDivider}
                                <p className="py-1 text-center text-xs text-slate-400">{m.body}</p>
                            </Fragment>
                        )
                    }

                    const mine = m.sender === me
                    const isImage = m.type === 'Image'

                    return (
                        <Fragment key={m.id}>
                            {dayDivider}
                            <div className={`flex ${mine ? 'justify-end' : 'justify-start'} ${sameSender ? '' : 'pt-1.5'}`}>
                                <div
                                    className={`max-w-[80%] text-sm ${
                                        isImage ? 'p-1' : 'px-3.5 py-2'
                                    } ${
                                        mine
                                            ? 'rounded-2xl rounded-br-md bg-blue-600 text-white'
                                            : 'rounded-2xl rounded-bl-md border border-slate-200 bg-white text-slate-900'
                                    }`}
                                >
                                    {isImage ? (
                                        <a href={`/api/chat/images/${m.id}`} target="_blank" rel="noopener noreferrer">
                                            <img
                                                src={`/api/chat/images/${m.id}`}
                                                alt="รูปในแชท"
                                                loading="lazy"
                                                className="max-h-60 rounded-xl object-contain"
                                            />
                                        </a>
                                    ) : (
                                        <p className="whitespace-pre-wrap break-words leading-relaxed">{m.body}</p>
                                    )}

                                    <div
                                        className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${
                                            isImage ? 'px-2 pb-1' : ''
                                        } ${mine ? 'text-blue-100' : 'text-slate-400'}`}
                                    >
                                        {mine && m.readAt && <span>อ่านแล้ว</span>}
                                        <span>{timeOf(m.createdAt)}</span>
                                    </div>
                                </div>
                            </div>
                        </Fragment>
                    )
                })}
            </div>

            {error && (
                <div className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">
                    {error}
                </div>
            )}

            {/* Composer */}
            {canSend ? (
                <div className="border-t border-slate-100 bg-white px-3 py-3 sm:px-4">
                    <form onSubmit={send} className="flex items-end gap-2">
                        <label
                            className={`flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-within:ring-2 focus-within:ring-blue-500 ${
                                busy ? 'pointer-events-none opacity-50' : ''
                            }`}
                            title="ส่งรูป"
                        >
                            <ImageIcon />
                            <span className="sr-only">ส่งรูป</span>
                            <input type="file" accept="image/*" className="sr-only" onChange={sendImage} disabled={busy} />
                        </label>

                        <textarea
                            className="max-h-28 min-h-10 flex-1 resize-none rounded-2xl border border-transparent bg-slate-100 px-4 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 sm:text-sm"
                            rows={1}
                            maxLength={1000}
                            placeholder="พิมพ์ข้อความ..."
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onKeyDown={onKeyDown}
                        />

                        <button
                            type="submit"
                            aria-label="ส่งข้อความ"
                            disabled={busy || !text.trim()}
                            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                        >
                            <SendIcon />
                        </button>
                    </form>

                    <p className="mt-2 text-center text-[11px] text-slate-400">
                        อย่าส่งเลขบัตรประชาชน รหัสผ่าน หรือข้อมูลบัตรในแชท
                    </p>
                </div>
            ) : (
                <div className="flex items-center justify-center gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3.5 text-xs text-slate-500">
                    <LockIcon />
                    แชทนี้ปิดแล้ว ดูย้อนหลังได้อย่างเดียว
                </div>
            )}
        </div>
    )
}