import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { errorText } from '../utils'

export default function LoginPage() {
    const { user, loading, login, register } = useAuth()

    const [mode, setMode] = useState('login')
    const [form, setForm] = useState({
        fullName: '',
        email: '',
        password: '',
        phone: '',
        role: 'Customer'
    })
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f3f1ff]">
                <div className="text-sm font-medium text-slate-500">กำลังโหลด...</div>
            </div>
        )
    }

    if (user) return <Navigate to="/" replace />

    const set = (key) => (e) => {
        setForm({
            ...form,
            [key]: e.target.value
        })
    }

    const switchMode = () => {
        setError('')
        setMode(mode === 'login' ? 'register' : 'login')
    }

    const submit = async (e) => {
        e.preventDefault()
        setError('')
        setBusy(true)

        try {
            if (mode === 'login') {
                await login(form.email, form.password)
            } else {
                await register(form)
            }
        } catch (err) {
            setError(errorText(err))
        } finally {
            setBusy(false)
        }
    }

    const isLogin = mode === 'login'

    return (
        <main className="min-h-screen flex items-center justify-center bg-[#f3f1ff] px-4 py-8 sm:px-6 lg:px-8 relative overflow-hidden">
            <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-violet-300/30 blur-2xl" />
            <div className="absolute -bottom-28 -right-20 w-80 h-80 rounded-full bg-indigo-300/30 blur-2xl" />
            <div className="absolute top-1/2 left-1/2 w-96 h-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40 blur-3xl" />

            <div className="relative z-10 w-full max-w-5xl min-h-[580px] bg-white rounded-[28px] shadow-[0_25px_70px_rgba(76,61,145,0.18)] overflow-hidden flex">
                {/* Left Form */}
                <section className="w-full lg:w-1/2 flex items-center justify-center px-7 py-10 sm:px-12 lg:px-14">
                    <div className="w-full max-w-md">
                        <div className="flex items-center justify-center mb-7">
                            <div className="w-14 h-14 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center overflow-hidden">
                                <img src="/images/logo (2).png" alt="WashGo" className="w-11 h-11 object-contain" />
                            </div>
                        </div>

                        {isLogin && (
                            <div>
                                <div className="text-center mb-7">
                                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">เข้าสู่ระบบ</h1>
                                    <p className="mt-2 text-xs sm:text-sm text-slate-400">เข้าสู่ระบบเพื่อใช้งาน WashGo</p>
                                </div>

                                <form onSubmit={submit} className="space-y-4">
                                    <div>
                                        <label className="block mb-1.5 text-xs font-semibold text-slate-600">อีเมล</label>
                                        <div className="relative">
                                            <input type="email" placeholder="กรอกอีเมล" value={form.email} onChange={set('email')} required className="w-full h-12 px-4 pr-11 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:bg-white focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10" />
                                            <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                                <path d="M4 6h16v12H4z" />
                                                <path d="m4 7 8 6 8-6" />
                                            </svg>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block mb-1.5 text-xs font-semibold text-slate-600">รหัสผ่าน</label>
                                        <div className="relative">
                                            <input type="password" placeholder="กรอกรหัสผ่าน" maxLength={100} value={form.password} onChange={set('password')} required className="w-full h-12 px-4 pr-11 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:bg-white focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10" />
                                            <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                                <rect x="5" y="10" width="14" height="10" rx="2" />
                                                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                                            </svg>
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-600">
                                            {error}
                                        </div>
                                    )}

                                    <button type="submit" disabled={busy} className="w-full h-12 mt-2 rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-sm font-semibold shadow-lg shadow-violet-500/20 transition disabled:opacity-60 disabled:cursor-not-allowed">
                                        {busy ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                                    </button>
                                </form>

                                <div className="relative flex items-center gap-3 my-6">
                                    <div className="flex-1 h-px bg-slate-100" />
                                    <span className="text-[11px] text-slate-400">หรือ</span>
                                    <div className="flex-1 h-px bg-slate-100" />
                                </div>

                                <div className="text-center">
                                    <span className="text-xs text-slate-400">ยังไม่มีบัญชี? </span>
                                    <button type="button" onClick={switchMode} className="text-xs font-semibold text-violet-500 hover:text-violet-600 transition">
                                        สมัครสมาชิก
                                    </button>
                                </div>
                            </div>
                        )}

                        {!isLogin && (
                            <div>
                                <div className="text-center mb-6">
                                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">สร้างบัญชีใหม่</h1>
                                    <p className="mt-2 text-xs sm:text-sm text-slate-400">สมัครสมาชิกเพื่อเริ่มใช้งาน WashGo</p>
                                </div>

                                <form onSubmit={submit} className="space-y-3.5">
                                    <div>
                                        <label className="block mb-1.5 text-xs font-semibold text-slate-600">ชื่อ-นามสกุล</label>
                                        <input type="text" placeholder="กรอกชื่อ-นามสกุล" maxLength={100} value={form.fullName} onChange={set('fullName')} required className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:bg-white focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10" />
                                    </div>

                                    <div>
                                        <label className="block mb-1.5 text-xs font-semibold text-slate-600">อีเมล</label>
                                        <input type="email" placeholder="กรอกอีเมล" value={form.email} onChange={set('email')} required className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:bg-white focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10" />
                                    </div>

                                    <div>
                                        <label className="block mb-1.5 text-xs font-semibold text-slate-600">เบอร์โทรศัพท์ <span className="font-normal text-slate-400">(ไม่บังคับ)</span></label>
                                        <input type="tel" placeholder="กรอกเบอร์โทรศัพท์" maxLength={20} value={form.phone} onChange={set('phone')} className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:bg-white focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10" />
                                    </div>

                                    <div>
                                        <label className="block mb-1.5 text-xs font-semibold text-slate-600">ประเภทบัญชี</label>
                                        <div className="relative">
                                            <select value={form.role} onChange={set('role')} className="appearance-none w-full h-11 px-4 pr-10 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 outline-none transition cursor-pointer focus:bg-white focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10">
                                                <option value="Customer">ลูกค้า</option>
                                                <option value="Rider">ไรเดอร์</option>
                                            </select>
                                            <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="m6 9 6 6 6-6" />
                                            </svg>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block mb-1.5 text-xs font-semibold text-slate-600">รหัสผ่าน</label>
                                        <input type="password" placeholder="อย่างน้อย 8 ตัวอักษร" maxLength={100} value={form.password} onChange={set('password')} required className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:bg-white focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10" />
                                    </div>

                                    {error && (
                                        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-600">
                                            {error}
                                        </div>
                                    )}

                                    <button type="submit" disabled={busy} className="w-full h-11 mt-2 rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-sm font-semibold shadow-lg shadow-violet-500/20 transition disabled:opacity-60 disabled:cursor-not-allowed">
                                        {busy ? 'กำลังสร้างบัญชี...' : 'สร้างบัญชี'}
                                    </button>
                                </form>

                                <div className="text-center mt-6">
                                    <span className="text-xs text-slate-400">มีบัญชีอยู่แล้ว? </span>
                                    <button type="button" onClick={switchMode} className="text-xs font-semibold text-violet-500 hover:text-violet-600 transition">
                                        เข้าสู่ระบบ
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="text-center mt-7">
                            <p className="text-[10px] text-slate-300">© 2026 WashGo. All rights reserved.</p>
                        </div>
                    </div>
                </section>

                {/* Right Visual */}
                <section className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-violet-500 via-indigo-500 to-blue-600 items-center justify-center">
                    <div className="absolute inset-0 opacity-20">
                        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full border-[2px] border-white/60" />
                        <div className="absolute top-10 -right-32 w-[430px] h-[430px] rounded-full border-[2px] border-white/30" />
                        <div className="absolute -bottom-32 -left-20 w-[430px] h-[430px] rounded-full border-[2px] border-white/40" />
                    </div>

                    <div className="absolute top-10 left-10 w-20 h-20 rounded-full bg-white/10 blur-xl" />
                    <div className="absolute bottom-16 right-12 w-28 h-28 rounded-full bg-cyan-300/20 blur-2xl" />

                    <div className="relative z-10 w-full h-full flex flex-col items-center justify-center px-10">
                        <div className="text-center mb-8">
                            <div className="text-white/80 text-xs font-medium tracking-[0.25em] mb-3">WASHGO</div>
                            <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight">
                                ซักผ้าให้เป็น
                                <br />
                                เรื่องง่าย
                            </h2>
                            <p className="mt-3 text-sm text-white/70 max-w-xs mx-auto leading-6">
                                บริการรับส่งผ้าที่ช่วยให้การซักผ้าของคุณสะดวกและง่ายยิ่งขึ้น
                            </p>
                        </div>

                        <div className="relative w-64 h-64 xl:w-72 xl:h-72">
                            <div className="absolute inset-5 rounded-[40px] bg-white/10 border border-white/20 backdrop-blur-sm rotate-3" />
                            <div className="absolute inset-0 rounded-[40px] bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center shadow-2xl">
                                <div className="w-44 h-44 xl:w-48 xl:h-48 rounded-full bg-white/20 border border-white/30 flex items-center justify-center">
                                    <div className="w-32 h-32 xl:w-36 xl:h-36 rounded-full bg-white/15 border border-white/30 flex items-center justify-center">
                                        <div className="w-20 h-20 xl:w-24 xl:h-24 rounded-full bg-white/20 border border-white/30 flex items-center justify-center">
                                            <img src="/images/WashGo-logo.png" alt="WashGo" className="w-12 h-12 xl:w-14 xl:h-14 object-contain brightness-0 invert opacity-90" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                    <path d="M12 3v3" />
                                    <path d="M12 18v3" />
                                    <path d="M3 12h3" />
                                    <path d="M18 12h3" />
                                    <path d="m5.64 5.64 2.12 2.12" />
                                    <path d="m16.24 16.24 2.12 2.12" />
                                    <path d="m18.36 5.64-2.12 2.12" />
                                    <path d="m7.76 16.24-2.12 2.12" />
                                    <circle cx="12" cy="12" r="3" />
                                </svg>
                            </div>
                        </div>

                        <div className="mt-8 flex items-center gap-6 text-xs text-white/70">
                            <span>Pickup</span>
                            <span className="w-1 h-1 rounded-full bg-white/50" />
                            <span>Wash</span>
                            <span className="w-1 h-1 rounded-full bg-white/50" />
                            <span>Delivery</span>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    )
}