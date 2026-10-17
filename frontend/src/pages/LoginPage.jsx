import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { errorText } from '../utils'
import PasswordInput from '../components/PasswordInput'
import GoogleButton from '../components/GoogleButton'
import VerifyNotice from '../components/VerifyNotice'

// ช่องกรอก: มือถือ = label พาดขอบบนของช่อง / desktop = label อยู่เหนือช่อง
const inputCls =
    'w-full px-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 lg:bg-slate-50 lg:focus:bg-white'

function Field({ label, hint, children }) {
    return (
        <div className="relative">
            <label className="absolute -top-2 left-3 z-10 bg-white px-1.5 text-[10px] font-semibold text-slate-500 lg:static lg:mb-1.5 lg:block lg:bg-transparent lg:px-0 lg:text-xs lg:text-slate-600">
                {label}
                {hint && <span className="ml-1 font-normal text-slate-400">{hint}</span>}
            </label>
            {children}
        </div>
    )
}

// หัว blob บนมือถือ (ซ่อนบน desktop)
function MobileHeader({ greeting, title }) {
    return (
        <div className="relative h-44 shrink-0 lg:hidden">
            <svg
                viewBox="0 0 400 200"
                preserveAspectRatio="none"
                className="absolute inset-0 h-full w-full overflow-visible drop-shadow-[0_14px_16px_rgba(14,116,144,0.28)]"
                aria-hidden="true"
            >
                <defs>
                    <linearGradient id="washgo-blob" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor="#1e5fa8" />
                        <stop offset="0.55" stopColor="#1b8cc0" />
                        <stop offset="1" stopColor="#35aaa8" />
                    </linearGradient>
                </defs>
                <path
                    d="M0 0H400V72C400 112 372 130 336 124C292 116 270 152 220 172C160 196 70 176 0 154Z"
                    fill="url(#washgo-blob)"
                />
            </svg>

            <div className="absolute -top-10 right-2 h-28 w-28 rounded-full bg-white/10" />
            <div className="absolute right-24 top-20 h-8 w-8 rounded-full bg-white/10" />

            <div className="absolute left-7 top-12">
                <p className="text-sm font-medium text-white/85">{greeting}</p>
                <h1 className="mt-0.5 text-3xl font-bold leading-tight text-white">{title}</h1>
            </div>
        </div>
    )
}

export default function LoginPage() {
    const { user, loading, login, register, loginWithGoogle } = useAuth()

    const [mode, setMode] = useState('login')
    const [form, setForm] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        role: 'Customer'
    })
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)
    const [pending, setPending] = useState(null)

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#eef6fb]">
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
                if (form.password !== form.confirmPassword) {
                    setError('รหัสผ่านทั้งสองช่องไม่ตรงกัน')
                    return
                }
                const { confirmPassword, ...payload } = form
                await register(payload)
                setPending({ email: payload.email, justSent: true })
            }
        } catch (err) {
            if (err.response?.data?.code === 'EMAIL_NOT_CONFIRMED') {
                setPending({ email: form.email, justSent: false })
            } else {
                setError(errorText(err))
            }
        } finally {
            setBusy(false)
        }
    }

    const onGoogle = async (credential) => {
        setError('')
        setBusy(true)
        try {
            await loginWithGoogle(credential)
        } catch (err) {
            setError(errorText(err))
        } finally {
            setBusy(false)
        }
    }

    const isLogin = mode === 'login'

    const header = pending
        ? { greeting: 'เกือบเสร็จแล้ว', title: 'ยืนยันอีเมล' }
        : isLogin
            ? { greeting: 'ยินดีต้อนรับกลับ WashGo', title: 'เข้าสู่ระบบ' }
            : { greeting: 'มาใช้ WashGo กัน', title: 'สมัครสมาชิก' }

    const submitCls = 'w-full mt-1 rounded-xl bg-[#3D8DB3] px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-[#3D8DB3]/25 transition-all duration-200 hover:bg-[#327A9D] hover:shadow-md hover:shadow-[#3D8DB3]/30 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#3D8DB3]/20 disabled:cursor-not-allowed disabled:opacity-50'

    const linkCls = 'text-xs font-semibold text-sky-600 hover:text-blue-700 transition'

    return (
        <main className="relative flex min-h-screen overflow-hidden bg-white lg:items-center lg:justify-center lg:bg-[#eef6fb] lg:px-8 lg:py-8">
            {/* ลวดลายพื้นหลัง (desktop เท่านั้น) */}
            <div className="hidden lg:block absolute -top-24 -left-24 w-64 h-64 rounded-full bg-sky-300/30 blur-2xl" />
            <div className="hidden lg:block absolute -bottom-28 -right-20 w-80 h-80 rounded-full bg-teal-300/30 blur-2xl" />
            <div className="hidden lg:block absolute top-1/2 left-1/2 w-96 h-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40 blur-3xl" />

            {/* มือถือ = เต็มจอ / desktop = การ์ดลอย */}
            <div className="relative z-10 flex w-full min-h-screen bg-white lg:min-h-[580px] lg:max-w-5xl lg:rounded-[28px] lg:shadow-[0_25px_70px_rgba(14,80,140,0.18)] lg:overflow-hidden">
                {/* Left Form */}
                <section className="flex w-full flex-col lg:w-1/2 lg:items-center lg:justify-center">
                    <MobileHeader greeting={header.greeting} title={header.title} />

                    <div className="mx-auto w-full max-w-md px-7 pb-8 sm:px-10 lg:px-14 lg:py-10">
                        {/* โลโก้ */}
                        <div className="flex items-center justify-center -mt-3 -mb-1 lg:mt-0 lg:mb-0">
                            <img
                                src="/images/logo3.png"
                                alt="WashGo"
                                className="h-28 w-auto object-contain lg:h-30 lg:w-30"
                            />
                        </div>

                        {pending && (
                            <VerifyNotice
                                email={pending.email}
                                justSent={pending.justSent}
                                onBack={() => { setPending(null); setMode('login') }}
                            />
                        )}

                        {!pending && isLogin && (
                            <div>
                                <div className="hidden lg:block text-center mb-7">
                                    <h1 className="text-3xl font-bold text-slate-800">เข้าสู่ระบบ</h1>
                                    <p className="mt-2 text-sm text-slate-400">เข้าสู่ระบบเพื่อใช้งาน WashGo</p>
                                </div>

                                <form onSubmit={submit} className="mt-4 space-y-5 lg:mt-0 lg:space-y-4">
                                    <Field label="อีเมล">
                                        <div className="relative">
                                            <input type="email" placeholder="กรอกอีเมล" value={form.email} onChange={set('email')} required className={`${inputCls} h-12 pr-11`} />
                                            <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                                <path d="M4 6h16v12H4z" />
                                                <path d="m4 7 8 6 8-6" />
                                            </svg>
                                        </div>
                                    </Field>

                                    <div>
                                        <Field label="รหัสผ่าน">
                                            <PasswordInput placeholder="กรอกรหัสผ่าน" maxLength={100} value={form.password} onChange={set('password')} required autoComplete="current-password" />
                                        </Field>
                                        <div className="mt-2 text-right">
                                            <Link to="/forgot-password" className={linkCls}>ลืมรหัสผ่าน?</Link>
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-600">
                                            {error}
                                        </div>
                                    )}

                                    <button type="submit" disabled={busy} className={`${submitCls} h-12`}>
                                        {busy ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                                    </button>
                                </form>

                                <div className="relative flex items-center gap-3 my-6">
                                    <div className="flex-1 h-px bg-slate-100" />
                                    <span className="text-[11px] text-slate-400">หรือ</span>
                                    <div className="flex-1 h-px bg-slate-100" />
                                </div>

                                <GoogleButton onCredential={onGoogle} onError={setError} />

                                <div className="text-center mt-6 lg:mt-5">
                                    <span className="text-xs text-slate-400">ยังไม่มีบัญชี? </span>
                                    <button type="button" onClick={switchMode} className={linkCls}>
                                        สมัครสมาชิก
                                    </button>
                                </div>
                            </div>
                        )}

                        {!pending && !isLogin && (
                            <div>
                                <div className="hidden lg:block text-center mb-6">
                                    <h1 className="text-3xl font-bold text-slate-800">สร้างบัญชีใหม่</h1>
                                    <p className="mt-2 text-sm text-slate-400">สมัครสมาชิกเพื่อเริ่มใช้งาน WashGo</p>
                                </div>

                                <form onSubmit={submit} className="mt-4 space-y-5 lg:mt-0 lg:space-y-3.5">
                                    <Field label="ชื่อ-นามสกุล">
                                        <input type="text" placeholder="กรอกชื่อ-นามสกุล" maxLength={100} value={form.fullName} onChange={set('fullName')} required className={`${inputCls} h-11`} />
                                    </Field>

                                    <Field label="อีเมล">
                                        <input type="email" placeholder="กรอกอีเมล" value={form.email} onChange={set('email')} required className={`${inputCls} h-11`} />
                                    </Field>

                                    <Field label="เบอร์โทรศัพท์" hint="(ไม่บังคับ)">
                                        <input type="tel" placeholder="กรอกเบอร์โทรศัพท์" maxLength={20} value={form.phone} onChange={set('phone')} className={`${inputCls} h-11`} />
                                    </Field>

                                    <Field label="ประเภทบัญชี">
                                        <div className="relative">
                                            <select value={form.role} onChange={set('role')} className={`${inputCls} appearance-none h-11 pr-10 cursor-pointer`}>
                                                <option value="Customer">ลูกค้า</option>
                                                <option value="Rider">ไรเดอร์</option>
                                            </select>
                                            <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="m6 9 6 6 6-6" />
                                            </svg>
                                        </div>
                                    </Field>

                                    <Field label="รหัสผ่าน">
                                        <PasswordInput className="h-11" placeholder="อย่างน้อย 8 ตัวอักษร" maxLength={100} value={form.password} onChange={set('password')} required autoComplete="new-password" />
                                    </Field>

                                    <div>
                                        <Field label="ยืนยันรหัสผ่าน">
                                            <PasswordInput className="h-11" placeholder="กรอกรหัสผ่านอีกครั้ง" maxLength={100} value={form.confirmPassword} onChange={set('confirmPassword')} required autoComplete="new-password" />
                                        </Field>
                                        {form.confirmPassword && form.confirmPassword !== form.password && (
                                            <p className="mt-1 text-[11px] text-red-500">รหัสผ่านไม่ตรงกัน</p>
                                        )}
                                    </div>

                                    {error && (
                                        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-600">
                                            {error}
                                        </div>
                                    )}

                                    <button type="submit" disabled={busy} className={`${submitCls} h-12 lg:h-11`}>
                                        {busy ? 'กำลังสร้างบัญชี...' : 'สร้างบัญชี'}
                                    </button>
                                </form>

                                <div className="flex items-center gap-3 mt-5 mb-4">
                                    <div className="flex-1 h-px bg-slate-100" />
                                    <span className="text-[11px] text-slate-400">หรือ</span>
                                    <div className="flex-1 h-px bg-slate-100" />
                                </div>
                                <GoogleButton onCredential={onGoogle} onError={setError} />
                                <p className="mt-2 text-center text-[11px] text-slate-400">สมัครด้วย Google จะได้บัญชีลูกค้า</p>

                                <div className="text-center mt-5">
                                    <span className="text-xs text-slate-400">มีบัญชีอยู่แล้ว? </span>
                                    <button type="button" onClick={switchMode} className={linkCls}>
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

                {/* Right Visual (desktop เท่านั้น) */}
                <section className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-blue-700 via-sky-600 to-teal-500 items-center justify-center">
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
                                <svg className="w-5 h-5 text-sky-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
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