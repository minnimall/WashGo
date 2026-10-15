function PinIcon({ className = 'h-5 w-5' }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
            <circle cx="12" cy="10" r="2.5" />
        </svg>
    )
}

function TrashIcon({ className = 'h-[18px] w-[18px]' }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M3 6h18" />
            <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
            <path d="M19 6l-1 13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
        </svg>
    )
}

export default function SavedLocations({ items, loading, onRemove }) {
    return (
        <section>
            {/* Header */}
            <div className="mb-5 flex items-end justify-between gap-3">
                <div>
                    <p className="text-xs font-bold tracking-[0.2em] text-blue-600">
                        SAVED LOCATIONS
                    </p>

                    <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
                        ที่อยู่ที่บันทึกไว้
                    </h2>
                </div>

                {!loading && items.length > 0 && (
                    <p className="text-sm text-slate-400">
                        {items.length} รายการ
                    </p>
                )}
            </div>

            {/* Loading */}
            {loading && (
                <div className="grid gap-4 md:grid-cols-2">
                    {[1, 2].map((item) => (
                        <div
                            key={item}
                            className="h-40 animate-pulse rounded-2xl bg-slate-200/70"
                        />
                    ))}
                </div>
            )}

            {/* Empty */}
            {!loading && items.length === 0 && (
                <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 px-6 py-14 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                        <PinIcon className="h-8 w-8" />
                    </div>

                    <h3 className="mt-5 text-lg font-bold text-slate-800">
                        ยังไม่มีที่อยู่
                    </h3>

                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                        เพิ่มที่อยู่สำหรับรับและส่งผ้า
                        เพื่อเริ่มใช้บริการ WashGo ได้สะดวกยิ่งขึ้น
                    </p>
                </div>
            )}

            {/* List */}
            {!loading && items.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                    {items.map((l) => {
                        const details = [
                            l.building,
                            l.floor && `ชั้น ${l.floor}`,
                            l.room && `ห้อง ${l.room}`,
                            l.landmark,
                        ].filter(Boolean)

                        return (
                            <article
                                key={l.id}
                                className="group flex flex-col rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-300 hover:border-blue-100 hover:shadow-lg"
                            >
                                {/* Top: icon + title + delete */}
                                <div className="flex items-start gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                        <PinIcon />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <h3 className="truncate font-bold text-slate-900">
                                            {l.label || 'ที่อยู่'}
                                        </h3>

                                        <p className="mt-0.5 text-xs text-slate-400">
                                            ตำแหน่งรับ-ส่งผ้า
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => onRemove(l.id)}
                                        aria-label={`ลบที่อยู่ ${l.label || ''}`.trim()}
                                        title="ลบที่อยู่"
                                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-red-50 hover:text-red-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-100 active:scale-90"
                                    >
                                        <TrashIcon />
                                    </button>
                                </div>

                                {/* Address */}
                                <div className="mt-4 border-t border-slate-100 pt-4">
                                    <p className="text-sm leading-6 text-slate-700">
                                        {l.address}
                                    </p>

                                    {details.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-1.5">
                                            {details.map((d) => (
                                                <span
                                                    key={d}
                                                    className="rounded-lg bg-slate-50 px-2.5 py-1 text-xs text-slate-500"
                                                >
                                                    {d}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Footer: coordinates + map link */}
                                {l.latitude != null && (
                                    <div className="mt-4 flex items-center justify-between gap-3 text-[11px] text-slate-400">
                                        <span className="flex min-w-0 items-center gap-2">
                                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                                            <span className="truncate">
                                                {l.latitude}, {l.longitude}
                                            </span>
                                        </span>

                                        <a
                                            href={`https://www.google.com/maps?q=${l.latitude},${l.longitude}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="shrink-0 font-semibold text-blue-600 hover:text-blue-700"
                                        >
                                            ดูแผนที่
                                        </a>
                                    </div>
                                )}
                            </article>
                        )
                    })}
                </div>
            )}
        </section>
    )
}