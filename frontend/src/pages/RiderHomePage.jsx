import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../AuthContext'
import useAutoRefresh from '../useAutoRefresh'
import StatusBadge from '../components/StatusBadge'
import StepFlow from '../components/StepFlow'
import { money, VERIFY_LABELS } from '../utils'
import { btn, ui } from '../ui'
import { useEarnings } from '../useEarnings'

/* รูปแบนเนอร์ (PNG พื้นหลังโปร่งใส) อยู่ใน public/ — ถ้าโหลดไม่ได้จะซ่อนรูปเอง
   อยากใช้รูปเฉพาะของ Rider ให้เปลี่ยน path ตรงนี้ */
const HERO_IMAGE = '/images/riderheader.png'

const STEPS = [
    {
        emoji: '📋',
        title: 'รับงาน',
        desc: 'เลือกงานใกล้คุณจากรายการงานใหม่ แล้วกดรับงาน',
        image: '/images/ตะกร้าผ้า.png',
    },
    {
        emoji: '🛵',
        title: 'ไปรับผ้า',
        desc: 'ใช้แผนที่นำทางไปจุดรับ ถ่ายรูปผ้าและน้ำยาตามขั้นตอน',
        image: '/images/มอไซ(1).png',
    },
    {
        emoji: '🫧',
        title: 'ซักและอัปโหลดใบรับ',
        desc: 'ส่งซัก ถ่ายรูปใบรับซัก และแจ้งขนาดผ้าจริง',
        image: '/images/ซักผ้า.png',
    },
    {
        emoji: '💰',
        title: 'ส่งผ้าและรับเงิน',
        desc: 'ส่งผ้าถึงลูกค้า ยืนยันการชำระเงิน แล้วรายได้เข้าบัญชีของคุณ',
        image: '/images/เงิน.png',
    },
]

export default function RiderHomePage() {
    const { user } = useAuth()
    const [me, setMe] = useState(null)
    const { data: earn } = useEarnings(10000)
    const [jobs, setJobs] = useState(null)
    const [heroFailed, setHeroFailed] = useState(false)

    const load = useCallback(async () => {
        const [m, j] = await Promise.allSettled([
            api.get('/rider/me'),
            api.get('/rider/jobs', { params: { active: true } }),
        ])
        if (m.status === 'fulfilled') setMe(m.value.data)
        setJobs(j.status === 'fulfilled' ? j.value.data : []) // ยังไม่อนุมัติ → ไม่มีงาน
    }, [])

    useAutoRefresh(load, { interval: 10000 })

    const approved = me?.status === 'Approved'
    const needDocs = me && (me.status === 'Registered' || me.status === 'Rejected')

    // ปุ่มหลักในแบนเนอร์เปลี่ยนตามสถานะบัญชี
    const heroLink = approved ? '/rider/jobs' : needDocs ? '/rider/verify' : '/rider'
    const heroLabel = approved ? 'ดูงานใหม่' : needDocs ? 'ส่งเอกสารยืนยันตัวตน' : 'ดูสถานะบัญชี'

    return (
        <div className="space-y-6">
            <section className="relative mb-5 rounded-2xl bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 p-6 text-slate-900 shadow-sm ring-1 ring-blue-100 sm:p-8 lg:mb-0 lg:mt-24 lg:min-h-[260px]">

                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                    <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/70" />
                    <div className="absolute -bottom-28 right-40 h-64 w-64 rounded-full bg-blue-200/40" />
                </div>

                <div className="relative z-10 lg:max-w-[55%]">
                    <p className="text-sm font-medium text-blue-600">สวัสดี {user.fullName}</p>
                    <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">พร้อมรับงานวันนี้ไหม</h1>
                    <p className="mt-2 max-w-xl text-sm text-slate-600">
                        เลือกงานใกล้คุณ ติดตามเส้นทางบนแผนที่ และดูรายได้ของคุณได้ในที่เดียว
                    </p>
                    <Link
                        to={heroLink}
                        className="group relative mt-5 inline-flex items-center gap-2 overflow-hidden rounded-2xl border border-blue-600/30 bg-white/40 px-6 py-2.5 text-sm font-semibold text-blue-700 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-600 hover:text-white hover:shadow-lg hover:shadow-blue-600/25 active:translate-y-0 active:scale-95"
                    >
                        <span
                            aria-hidden="true"
                            className="absolute inset-0 origin-left scale-x-0 bg-blue-600 transition-transform duration-300 ease-out group-hover:scale-x-100"
                        />

                        <span className="relative">{heroLabel}</span>
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

            {me && !approved && (
                <div className={ui.card}>
                    <h2 className={ui.h2}>ยังรับงานไม่ได้</h2>
                    <p className={`${ui.muted} mt-1`}>
                        สถานะบัญชี: {VERIFY_LABELS[me.status] ?? me.status}
                    </p>
                    <Link to={heroLink} className={`${btn('primary')} mt-3 inline-block`}>
                        {heroLabel}
                    </Link>
                </div>
            )}


            <StepFlow title="ขั้นตอนการทำงาน" steps={STEPS} />
        </div>
    )
}