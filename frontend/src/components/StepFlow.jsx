import { useState } from 'react'
import { ui } from '../ui'

function StepImage({ src, emoji, alt }) {
    const [failed, setFailed] = useState(false)

    return (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center lg:h-24 lg:w-full">
            {failed || !src ? (
                <span className="text-4xl lg:text-5xl">{emoji}</span>
            ) : (
                <img
                    src={src}
                    alt={alt}
                    onError={() => setFailed(true)}
                    className="h-full w-full object-contain"
                />
            )}
        </div>
    )
}

function MobileConnector({ fromLeft }) {
    const d = fromLeft
        ? 'M41 0 C41 7 59 3 59 10'
        : 'M59 0 C59 7 41 3 41 10'

    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 100 10"
            preserveAspectRatio="none"
            className={`pointer-events-none absolute top-full h-8 w-[122%] overflow-visible lg:hidden ${
                fromLeft ? 'left-0' : 'right-0'
            }`}
        >
            <path
                d={d}
                fill="none"
                stroke="#93c5fd"
                strokeWidth="2"
                strokeDasharray="5 5"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
            />
        </svg>
    )
}

// steps = [{ emoji, title, desc, image }]
export default function StepFlow({ title, steps }) {
    return (
        <div>
            <h2 className={`${ui.h2} mb-3 mt-5`}>{title}</h2>

            <div className="flex flex-col gap-y-8 lg:grid lg:grid-cols-4 lg:gap-x-8 lg:gap-y-0">
                {steps.map((s, i) => {
                    const isLeft = i % 2 === 0
                    const hasNext = i < steps.length - 1

                    return (
                        <div
                            key={s.title}
                            className={`relative w-[82%] lg:w-auto lg:self-stretch ${
                                isLeft ? 'self-start' : 'self-end'
                            }`}
                        >
                            {hasNext && <MobileConnector fromLeft={isLeft} />}

                            {hasNext && (
                                <span
                                    aria-hidden="true"
                                    className="absolute left-full top-1/2 z-0 -ml-1 hidden h-0 w-10 -translate-y-1/2 border-t-2 border-dashed border-blue-300 lg:block"
                                />
                            )}

                            <div className="relative z-10 flex h-full flex-row items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-4 lg:flex-col lg:items-stretch lg:gap-0 motion-reduce:transition-none">
                                <StepImage src={s.image} emoji={s.emoji} alt={s.title} />

                                <div className="min-w-0 lg:mt-2">
                                    <div className="text-xs font-medium text-blue-600">ขั้นที่ {i + 1}</div>
                                    <div className="text-sm font-semibold leading-tight text-gray-900 sm:text-base">
                                        {s.title}
                                    </div>
                                    <p className={`${ui.muted} mt-1 text-xs sm:text-sm`}>{s.desc}</p>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}