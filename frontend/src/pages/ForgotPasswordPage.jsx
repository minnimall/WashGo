import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import { errorText } from '../utils'
import AuthShell from '../components/AuthShell'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [sent, setSent] = useState(false)
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)

    const submit = async (e) => {
        e.preventDefault()
        setError('')
        setBusy(true)
        try {
            await api.post('/auth/forgot-password', { email })
            setSent(true)
        } catch (err) {
            setError(errorText(err))
        } finally {
            setBusy(false)
        }
    }

    const linkCls = 'text-xs font-semibold text-[#3D8DB3] hover:text-[#2f7396] transition'

    if (sent) {
        return (
            <AuthShell title="ตรวจสอบอีเมลของคุณ">
                <p className="text-center text-sm leading-6 text-slate-500">
                    ถ้ามีบัญชีที่ใช้อีเมล <span className="font-semibold text-slate-700">{email}</span> เราได้ส่งลิงก์ตั้งรหัสผ่านใหม่ไปให้แล้ว
                    (ใช้ได้ 2 ชั่วโมง)
                </p>
                <p className="mt-2 text-center text-xs text-slate-400">ไม่เจอ? ลองดูในโฟลเดอร์สแปมด้วย</p>
                <div className="mt-6 text-center">
                    <Link to="/login" className={linkCls}>
                        กลับไปหน้าเข้าสู่ระบบ
                    </Link>
                </div>
            </AuthShell>
        )
    }

    return (
        <AuthShell title="ลืมรหัสผ่าน" subtitle="กรอกอีเมลที่ใช้สมัคร เราจะส่งลิงก์ตั้งรหัสผ่านใหม่ให้">
            <form onSubmit={submit} className="space-y-4">
                <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">อีเมล</label>
                    <input
                        type="email"
                        required
                        maxLength={254}
                        placeholder="กรอกอีเมล"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#3D8DB3] focus:bg-white focus:ring-4 focus:ring-[#3D8DB3]/15"
                    />
                </div>

                {error && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-600">{error}</div>}

                <button
                    type="submit"
                    disabled={busy}
                    className="h-12 w-full rounded-xl bg-[#3D8DB3] text-sm font-semibold text-white shadow-md shadow-[#3D8DB3]/25 transition-all duration-200 hover:bg-[#2f7396] hover:shadow-lg hover:shadow-[#3D8DB3]/30 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {busy ? 'กำลังส่ง...' : 'ส่งลิงก์ตั้งรหัสผ่านใหม่'}
                </button>
            </form>
            <div className="mt-6 text-center">
                <Link to="/login" className={linkCls}>
                    กลับไปหน้าเข้าสู่ระบบ
                </Link>
            </div>
        </AuthShell>
    )
}