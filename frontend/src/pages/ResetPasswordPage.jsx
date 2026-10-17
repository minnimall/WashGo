import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../api'
import { errorText } from '../utils'
import AuthShell from '../components/AuthShell'
import PasswordInput from '../components/PasswordInput'

const linkCls = 'text-xs font-semibold text-[#3D8DB3] hover:text-[#2f7396] transition'

const primaryBtn =
    'h-12 w-full rounded-xl bg-[#3D8DB3] text-sm font-semibold text-white shadow-md shadow-[#3D8DB3]/25 transition-all duration-200 hover:bg-[#2f7396] hover:shadow-lg hover:shadow-[#3D8DB3]/30 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60'

export default function ResetPasswordPage() {
    const [params] = useSearchParams()
    const uid = params.get('uid')
    const token = params.get('token')

    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)
    const [done, setDone] = useState(false)

    const submit = async (e) => {
        e.preventDefault()
        setError('')
        if (password !== confirm) {
            setError('รหัสผ่านทั้งสองช่องไม่ตรงกัน')
            return
        }
        setBusy(true)
        try {
            await api.post('/auth/reset-password', { userId: uid, token, newPassword: password })
            setDone(true)
        } catch (err) {
            setError(errorText(err))
        } finally {
            setBusy(false)
        }
    }

    if (!uid || !token) {
        return (
            <AuthShell title="ลิงก์ไม่ถูกต้อง">
                <p className="text-center text-sm text-slate-500">ลิงก์นี้ไม่ครบหรือหมดอายุ กรุณาขอลิงก์ใหม่อีกครั้ง</p>
                <div className="mt-6 text-center">
                    <Link to="/forgot-password" className={linkCls}>
                        ขอลิงก์ตั้งรหัสผ่านใหม่
                    </Link>
                </div>
            </AuthShell>
        )
    }

    if (done) {
        return (
            <AuthShell title="เปลี่ยนรหัสผ่านสำเร็จ" subtitle="อุปกรณ์เดิมที่เคยล็อกอินไว้จะถูกออกจากระบบอัตโนมัติ">
                <Link to="/login" className={`${primaryBtn} flex items-center justify-center`}>
                    ไปหน้าเข้าสู่ระบบ
                </Link>
            </AuthShell>
        )
    }

    return (
        <AuthShell title="ตั้งรหัสผ่านใหม่" subtitle="อย่างน้อย 8 ตัวอักษร">
            <form onSubmit={submit} className="space-y-4">
                <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">รหัสผ่านใหม่</label>
                    <PasswordInput
                        placeholder="อย่างน้อย 8 ตัวอักษร"
                        maxLength={100}
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                    />
                </div>
                <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">ยืนยันรหัสผ่านใหม่</label>
                    <PasswordInput
                        placeholder="กรอกรหัสผ่านอีกครั้ง"
                        maxLength={100}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        required
                        autoComplete="new-password"
                    />
                    {confirm && confirm !== password && <p className="mt-1 text-[11px] text-red-500">รหัสผ่านไม่ตรงกัน</p>}
                </div>

                {error && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-600">{error}</div>}

                <button type="submit" disabled={busy} className={primaryBtn}>
                    {busy ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
                </button>
            </form>
        </AuthShell>
    )
}