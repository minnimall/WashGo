import { useCallback, useEffect, useState } from 'react'
import api from '../api'
import { errorText } from '../utils'

export function Stars({ value = 0, className = 'text-lg' }) {
    const n = Math.max(0, Math.min(5, Math.round(value)))
    return (
        <span className={`${className} leading-none`} role="img" aria-label={`${n} จาก 5 ดาว`}>
            <span className="text-amber-400">{'★'.repeat(n)}</span>
            <span className="text-slate-200">{'★'.repeat(5 - n)}</span>
        </span>
    )
}

const LABELS = ['', 'แย่มาก', 'ไม่ค่อยดี', 'พอใช้', 'ดี', 'ยอดเยี่ยม']
const card = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5'

export default function ReviewCard({ orderId, riderName }) {
    const [state, setState] = useState(null) // { canReview, review }
    const [rating, setRating] = useState(0)
    const [hover, setHover] = useState(0)
    const [comment, setComment] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')

    const load = useCallback(async () => {
        try {
            const res = await api.get(`/orders/${orderId}/review`)
            setState(res.data)
        } catch (err) {
            setState({ canReview: false, review: null, failed: errorText(err) })
        }
    }, [orderId])

    useEffect(() => {
        load()
    }, [load])

    async function submit(e) {
        e.preventDefault()
        if (rating < 1) return setError('กรุณาเลือกจำนวนดาว')
        setError('')
        setBusy(true)
        try {
            await api.post(`/orders/${orderId}/review`, { rating, comment: comment.trim() || null })
            await load()
        } catch (err) {
            setError(errorText(err))
            await load()
        } finally {
            setBusy(false)
        }
    }

    if (!state) return null

    if (state.failed) {
        return (
            <section className={card}>
                <p className="text-sm text-red-600">โหลดข้อมูลรีวิวไม่สำเร็จ: {state.failed}</p>
            </section>
        )
    }

    if (state.review) {
        return (
            <section className={card}>
                <h2 className="text-base font-bold text-slate-900">รีวิวของคุณ</h2>
                <div className="mt-2 flex items-center gap-2">
                    <Stars value={state.review.rating} className="text-xl" />
                    <span className="text-sm text-slate-500">{LABELS[state.review.rating]}</span>
                </div>
                {state.review.comment && (
                    <p className="mt-2 text-sm leading-6 text-slate-700">{state.review.comment}</p>
                )}
            </section>
        )
    }

    if (!state.canReview) return null

    const shown = hover || rating

    return (
        <section className={card}>
            <h2 className="text-base font-bold text-slate-900">ให้คะแนน {riderName || 'ไรเดอร์'}</h2>
            <p className="mt-1 text-xs text-slate-500">รีวิวได้ 1 ครั้งต่อออเดอร์ และแก้ไขภายหลังไม่ได้</p>

            <form onSubmit={submit} className="mt-4 space-y-3">
                <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
                    {[1, 2, 3, 4, 5].map((n) => (
                        <button
                            key={n}
                            type="button"
                            aria-label={`${n} ดาว`}
                            onMouseEnter={() => setHover(n)}
                            onClick={() => setRating(n)}
                            className={`text-3xl leading-none transition hover:scale-110 ${
                                n <= shown ? 'text-amber-400' : 'text-slate-200'
                            }`}
                        >
                            ★
                        </button>
                    ))}
                    <span className="ml-2 text-sm font-medium text-slate-600">{LABELS[shown]}</span>
                </div>

                <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="เล่าประสบการณ์ของคุณ (ไม่บังคับ)"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                    type="submit"
                    disabled={busy}
                    className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
                >
                    {busy ? 'กำลังส่ง...' : 'ส่งรีวิว'}
                </button>
            </form>
        </section>
    )
}