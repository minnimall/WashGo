import { dateTime } from '../utils'
import { Stars } from './ReviewCard'

export default function RiderReviewsCard({ data }) {
    if (!data) return <div className="h-32 animate-pulse rounded-2xl bg-slate-200/70" />

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-bold text-slate-900">คะแนนจากลูกค้า</h2>
                {data.count > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-slate-900">
                            {Number(data.average).toFixed(1)}
                        </span>
                        <Stars value={data.average} />
                        <span className="text-xs text-slate-400">({data.count})</span>
                    </div>
                )}
            </div>

            {data.recent.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">ยังไม่มีรีวิว เมื่อลูกค้าให้คะแนนจะแสดงที่นี่</p>
            ) : (
                <ul className="mt-3 divide-y divide-slate-100">
                    {data.recent.map((r, i) => (
                        <li key={i} className="py-3">
                            <div className="flex items-center justify-between gap-2">
                                <Stars value={r.rating} className="text-base" />
                                <span className="text-[11px] text-slate-400">
                                    {r.orderNo} · {dateTime(r.createdAt)}
                                </span>
                            </div>
                            {r.comment && <p className="mt-1 text-sm leading-6 text-slate-700">{r.comment}</p>}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    )
}