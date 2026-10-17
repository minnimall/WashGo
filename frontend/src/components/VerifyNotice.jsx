import { useEffect, useState } from 'react'
import api from '../api'

// แสดงหลังสมัครสำเร็จ หรือเมื่อล็อกอินแต่ยังไม่ยืนยันอีเมล
export default function VerifyNotice({ email, justSent, onBack }) {
    const [cooldown, setCooldown] = useState(justSent ? 60 : 0)
    const [msg, setMsg] = useState('')

    useEffect(() => {
        if (cooldown <= 0) return
        const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
        return () => clearTimeout(t)
    }, [cooldown])

    const resend = async () => {
        setMsg('')
        try {
            await api.post('/auth/resend-confirmation', { email })
            setMsg('ส่งอีเมลอีกครั้งแล้ว')
            setCooldown(60)
        } catch {
            setMsg('ส่งไม่สำเร็จ ลองใหม่อีกครั้งภายหลัง')
        }
    }

    return (
        <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 6h16v12H4z" />
                    <path d="m4 7 8 6 8-6" />
                </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-800">ตรวจสอบอีเมลของคุณ</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
                {justSent ? 'เราส่งลิงก์ยืนยันไปที่' : 'บัญชีนี้ยังไม่ได้ยืนยันอีเมล เราส่งลิงก์ยืนยันไปที่'}
                <br />
                <span className="font-semibold text-slate-700">{email}</span>
                <br />
                กดลิงก์ในอีเมล (ใช้ได้ 2 ชั่วโมง) แล้วกลับมาเข้าสู่ระบบ
            </p>
            <p className="mt-2 text-xs text-slate-400">ไม่เจอ? ลองดูในโฟลเดอร์สแปมด้วย</p>

            {msg && <p className="mt-4 text-xs text-violet-600">{msg}</p>}

            <button
                type="button"
                onClick={resend}
                disabled={cooldown > 0}
                className="mt-5 h-11 w-full rounded-xl border border-violet-200 text-sm font-semibold text-violet-600 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {cooldown > 0 ? `ส่งอีกครั้งได้ใน ${cooldown} วินาที` : 'ส่งอีเมลยืนยันอีกครั้ง'}
            </button>
            <button type="button" onClick={onBack} className="mt-4 text-xs font-semibold text-violet-500 hover:text-violet-600">
                กลับไปหน้าเข้าสู่ระบบ
            </button>
        </div>
    )
}