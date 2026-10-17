import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../api'
import AuthShell from '../components/AuthShell'

const linkBtn =
    'flex h-12 w-full items-center justify-center rounded-xl bg-[#3D8DB3] text-sm font-semibold text-white shadow-md shadow-[#3D8DB3]/25 transition-all duration-200 hover:bg-[#2f7396] hover:shadow-lg hover:shadow-[#3D8DB3]/30 active:scale-[0.99]'

export default function VerifyEmailPage() {
    const [params] = useSearchParams()
    const [state, setState] = useState('loading') // loading | ok | error
    const ran = useRef(false)

    useEffect(() => {
        if (ran.current) return
        ran.current = true

        const uid = params.get('uid')
        const token = params.get('token')
        if (!uid || !token) {
            setState('error')
            return
        }
        api.post('/auth/confirm-email', { userId: uid, token })
            .then(() => setState('ok'))
            .catch(() => setState('error'))
    }, [params])

    if (state === 'loading') {
        return (
            <AuthShell title="กำลังยืนยันอีเมล...">
                <p className="text-center text-sm text-slate-400">กรุณารอสักครู่</p>
            </AuthShell>
        )
    }

    if (state === 'ok') {
        return (
            <AuthShell title="ยืนยันอีเมลสำเร็จ" subtitle="ตอนนี้เข้าสู่ระบบได้แล้ว">
                <Link to="/login" className={linkBtn}>
                    ไปหน้าเข้าสู่ระบบ
                </Link>
            </AuthShell>
        )
    }

    return (
        <AuthShell title="ลิงก์ไม่ถูกต้องหรือหมดอายุ" subtitle="กลับไปหน้าเข้าสู่ระบบ แล้วล็อกอินเพื่อขอส่งอีเมลยืนยันใหม่">
            <Link to="/login" className={linkBtn}>
                ไปหน้าเข้าสู่ระบบ
            </Link>
        </AuthShell>
    )
}