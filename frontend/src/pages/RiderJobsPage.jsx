import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'
import StatusBadge from '../components/StatusBadge'
import { DETERGENT_LABELS, SIZE_DESC, dateTime, errorText, money } from '../utils'
import { btn, ui } from '../ui'

const TABS = [
    ['available', 'งานที่รอรับ'],
    ['active', 'งานที่กำลังทำ'],
    ['history', 'ประวัติ'],
]

export default function RiderJobsPage() {
    const navigate = useNavigate()
    const [tab, setTab] = useState('available')
    const [pos, setPos] = useState(null)
    const [geoMsg, setGeoMsg] = useState('')
    const [data, setData] = useState(null)   // available = { accepting, items } / อื่นๆ = array
    const [error, setError] = useState('')
    const [busyId, setBusyId] = useState(null)

    const load = useCallback(async () => {
        setError('')
        setData(null)
        try {
        if (tab === 'available') {
            const res = await api.get('/rider/jobs/available', { params: pos ?? {} })
            setData(res.data)
        } else {
            const res = await api.get('/rider/jobs', { params: { active: tab === 'active' } })
            setData(res.data)
        }
        } catch (err) {
        setError(errorText(err))
        }
    }, [tab, pos])

    useEffect(() => { load() }, [load])

    // ตำแหน่งของ Rider ใช้คำนวณระยะทางชั่วคราว ระบบไม่เก็บ
    const locateMe = () => {
        if (!navigator.geolocation) {
        setGeoMsg('เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง')
        return
        }
        setGeoMsg('กำลังหาตำแหน่ง...')
        navigator.geolocation.getCurrentPosition(
        (p) => {
            setPos({ lat: p.coords.latitude, lng: p.coords.longitude })
            setGeoMsg('เรียงตามระยะใกล้ที่สุดแล้ว')
        },
        () => setGeoMsg('อ่านตำแหน่งไม่ได้ กรุณาอนุญาตการเข้าถึงตำแหน่ง'),
        { timeout: 10000 },
        )
    }

    const accept = async (id) => {
        setError('')
        setBusyId(id)
        try {
        await api.post(`/rider/jobs/${id}/accept`)
        navigate(`/rider/jobs/${id}`)
        } catch (err) {
        setError(errorText(err))
        await load()          // งานอาจถูกรับไปแล้ว โหลดรายการใหม่
        } finally {
        setBusyId(null)
        }
    }

    return (
        <>
        <h1 className={ui.h1}>งาน</h1>
        <div className={ui.tabs}>
            {TABS.map(([key, label]) => (
            <button key={key} className={btn(tab === key ? 'primary' : 'default')} onClick={() => setTab(key)}>
                {label}
            </button>
            ))}
        </div>

        {error && (
            <div className={ui.error}>
            {error} <Link to="/rider" className={ui.link}>ดูสถานะบัญชี</Link>
            </div>
        )}
        {!data && !error && <p className={ui.muted}>กำลังโหลด...</p>}

        {tab === 'available' && data && (
            <>
            {!data.accepting && (
                <p className={ui.muted}>
                คุณปิดรับงานอยู่ <Link to="/rider" className={ui.link}>เปิดรับงานที่หน้าบัญชี</Link>
                </p>
            )}
            {data.accepting && (
                <p className="mb-4 flex flex-wrap items-center gap-2">
                <button className={btn('default', 'sm')} onClick={locateMe}>📍 เรียงตามระยะใกล้ฉัน</button>
                <span className={ui.muted}>{geoMsg}</span>
                </p>
            )}
            {data.accepting && data.items.length === 0 && <p className={ui.muted}>ตอนนี้ยังไม่มีงานรอรับ</p>}

            {data.items.map((j) => (
                <div className={ui.card} key={j.id}>
                <div className={ui.row}>
                    <strong className="text-gray-900">{j.orderNo}</strong>
                    <span className={ui.muted}>{dateTime(j.createdAt)}</span>
                </div>
                <p className="mt-2">
                    {j.serviceName} · ไซส์ {j.size} ({SIZE_DESC[j.size]})
                    {j.extraItems > 0 && ` · รายการเสริม ${j.extraItems} ชิ้น`}
                </p>
                <p className={ui.muted}>
                    น้ำยา: {DETERGENT_LABELS[j.detergentSource] ?? j.detergentSource}
                    {j.distanceKm != null && ` · ห่างจากคุณ ${j.distanceKm} กม.`}
                </p>
                <div className={`${ui.row} mt-3`}>
                    <strong className="text-blue-700">ยอดที่ลูกค้าจ่าย {money(j.totalPrice)}</strong>
                    <button className={btn('primary')} disabled={busyId === j.id} onClick={() => accept(j.id)}>
                    {busyId === j.id ? 'กำลังรับ...' : 'รับงาน'}
                    </button>
                </div>
                </div>
            ))}
            <p className={ui.muted}>ที่อยู่ลูกค้าจะแสดงหลังรับงานเท่านั้น</p>
            </>
        )}

        {tab !== 'available' && Array.isArray(data) && (
            <>
            {data.length === 0 && <p className={ui.muted}>ไม่มีรายการ</p>}
            {data.map((j) => (
                <Link to={`/rider/jobs/${j.id}`} key={j.id} className={ui.cardLink}>
                <div className={ui.row}>
                    <strong className="text-gray-900">{j.orderNo}</strong>
                    <StatusBadge status={j.status} />
                </div>
                <div className={`${ui.muted} mt-1`}>{j.serviceName} · ไซส์ {j.size} · {money(j.totalPrice)}</div>
                <div className={ui.muted}>รับที่: {j.pickupAddress}</div>
                </Link>
            ))}
            </>
        )}
        </>
    )
}