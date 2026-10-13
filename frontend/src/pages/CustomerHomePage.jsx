import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../AuthContext'
import useAutoRefresh from '../useAutoRefresh'
import StatusBadge from '../components/StatusBadge'
import { money, dateTime } from '../utils'
import { ui } from '../ui'

/* ============================================================
   ใส่รูปที่นี่
   - HERO_IMAGE : รูป PNG พื้นหลังโปร่งใส ที่จะโผล่เลยกรอบแบนเนอร์
   - image ของแต่ละ STEP : รูปประกอบแต่ละขั้นตอน
   วางไฟล์ไว้ในโฟลเดอร์ public/ ตาม path ด้านล่าง
   ถ้าโหลดรูปไม่ได้ ระบบจะซ่อนรูปแบนเนอร์ และใช้อีโมจิแทนในขั้นตอน
   ============================================================ */
const HERO_IMAGE = '/images/banner(1).png'

const STEPS = [
    {
        emoji: '🧺',
        title: 'เลือกบริการ',
        desc: 'เลือกประเภทผ้า ขนาด และน้ำยา แล้วปักหมุดจุดรับ-ส่ง',
        image: '/images/ตะกร้าผ้า.png',
    },
    {
        emoji: '🛵',
        title: 'Rider มารับผ้า',
        desc: 'ติดตามตำแหน่ง Rider บนแผนที่ และแชทกับ Rider ได้',
        image: '/images/มอไซ(1).png',
    },
    {
        emoji: '🫧',
        title: 'ซักและตรวจสอบ',
        desc: 'Rider ถ่ายรูปหลักฐาน และยืนยันราคาตามขนาดจริง',
        image: '/images/ซักผ้า.png',
    },
    {
        emoji: '✅',
        title: 'รับผ้าและชำระเงิน',
        desc: 'ชำระเงินสดหรือโอน แล้วกดยืนยันรับผ้า',
        image: '/images/เงิน.png',
    },
]

/* รูปประกอบขั้นตอน — ถ้าโหลดรูปไม่ได้ จะแสดงอีโมจิแทน
   มือถือ = ช่องสี่เหลี่ยมเล็กอยู่ซ้ายของข้อความ / จอใหญ่ = เต็มความกว้างการ์ดอยู่ด้านบน */
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

/* เส้นโค้งเชื่อมการ์ดบนมือถือ: จากกึ่งกลางล่างของการ์ดนี้ ไปกึ่งกลางบนของการ์ดถัดไป
   SVG กว้างเท่าพื้นที่ทั้งหมด (การ์ดกว้าง 82% → svg กว้าง ~122% ของการ์ด)
   กึ่งกลางการ์ดซ้าย = 41, กึ่งกลางการ์ดขวา = 59 */
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

export default function CustomerHomePage() {
    const { user } = useAuth()
    const [orders, setOrders] = useState(null)
    const [error, setError] = useState('')
    const [heroFailed, setHeroFailed] = useState(false)

    const load = useCallback(async () => {
        try {
            const res = await api.get('/orders')
            const d = res.data
            setOrders(Array.isArray(d) ? d : (d.items ?? []))
            setError('')
        } catch {
            setError('โหลดรายการออเดอร์ไม่สำเร็จ')
        }
    }, [])

    useAutoRefresh(load, { interval: 10000 })

    const recent = (orders ?? []).slice(0, 3)

    return (
        <div className="space-y-6">
            <section className="relative mb-5 rounded-2xl bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 p-6 text-slate-900 shadow-sm ring-1 ring-blue-100 sm:p-8 lg:mb-0 lg:mt-24 lg:min-h-[260px]">

                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                    <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/70" />
                    <div className="absolute -bottom-28 right-40 h-64 w-64 rounded-full bg-blue-200/40" />
                </div>

                <div className="relative z-10 lg:max-w-[55%]">
                    <p className="text-sm font-medium text-blue-600">สวัสดี {user.fullName}</p>
                    <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">ซักผ้าสะอาด ส่งถึงที่</h1>
                    <p className="mt-2 max-w-xl text-sm text-slate-600">
                        สั่งซักได้ในไม่กี่ขั้นตอน Rider จะมารับผ้าถึงที่ และคุณติดตามได้ทุกสถานะ
                    </p>
                    <Link
                        to="/orders/new"
                        className="group relative mt-5 inline-flex items-center gap-2 overflow-hidden rounded-2xl border border-blue-600/30 bg-white/40 px-6 py-2.5 text-sm font-semibold text-blue-700 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-600 hover:text-white hover:shadow-lg hover:shadow-blue-600/25 active:translate-y-0 active:scale-95"
                    >
                        <span
                            aria-hidden="true"
                            className="absolute inset-0 origin-left scale-x-0 bg-blue-600 transition-transform duration-300 ease-out group-hover:scale-x-100"
                        />

                        <span className="relative">สั่งซักผ้า</span>
                        <span
                            aria-hidden="true"
                            className="relative transition-transform duration-300 group-hover:translate-x-1"
                        >
                            →
                        </span>
                    </Link>
                </div>

                {!heroFailed && (
                    <img
                        src={HERO_IMAGE}
                        alt=""
                        onError={() => setHeroFailed(true)}
                        className="pointer-events-none relative z-10 mx-auto -mb-10 mt-4 h-44 object-contain sm:h-52 lg:absolute lg:bottom-0 lg:right-6 lg:m-0 lg:h-[380px] lg:max-w-none"
                    />
                )}
            </section>

            {error && <div className={ui.error}>{error}</div>}

            {/*
              ขั้นตอนการใช้งาน
              - มือถือ/แท็บเล็ต: เรียงลงมา สลับ ซ้าย → ขวา → ซ้าย → ขวา เชื่อมกันด้วยเส้นโค้ง
              - จอใหญ่ (lg): 4 ก้อนเรียงแถวเดียว เชื่อมกันด้วยเส้นตรงกลางการ์ด
            */}
            <div>
                <h2 className={`${ui.h2} mb-3 mt-5`}>ใช้งานอย่างไร</h2>

                <div className="flex flex-col gap-y-8 lg:grid lg:grid-cols-4 lg:gap-x-8 lg:gap-y-0">
                    {STEPS.map((s, i) => {
                        const isLeft = i % 2 === 0
                        const hasNext = i < STEPS.length - 1

                        return (
                            <div
                                key={s.title}
                                className={`relative w-[82%] lg:w-auto lg:self-stretch ${
                                    isLeft ? 'self-start' : 'self-end'
                                }`}
                            >
                                {/* เส้นเชื่อมบนมือถือ (โค้ง ไปการ์ดถัดไปในแถวล่าง) */}
                                {hasNext && <MobileConnector fromLeft={isLeft} />}

                                {/* เส้นเชื่อมบนจอใหญ่ (ตรง กึ่งกลางความสูงการ์ด ไปการ์ดถัดไปทางขวา) */}
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
        </div>
    )
}