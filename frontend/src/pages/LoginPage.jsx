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
            <div className="min-h-screen flex items-center justify-center bg-[#f6f7fb]">
                <div className="text-gray-500 animate-pulse">
                    กำลังโหลด...
                </div>
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
        <main className="min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50 relative">

            {/* Background decoration */}
            <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-300/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-40 -right-32 w-[500px] h-[500px] bg-cyan-300/20 rounded-full blur-3xl animate-pulse" />

            {/* Floating 3D shapes */}
            <div className="absolute top-24 left-[12%] w-16 h-16 rounded-2xl bg-white/70 border border-white shadow-xl rotate-12 animate-[bounce_5s_ease-in-out_infinite]" />
            
            <div className="absolute bottom-24 left-[15%] w-10 h-10 rounded-full bg-blue-400/20 blur-sm animate-[bounce_4s_ease-in-out_infinite]" />

            <div className="absolute top-32 right-[12%] w-20 h-20 rounded-full bg-cyan-300/20 blur-md animate-[bounce_6s_ease-in-out_infinite]" />

            {/* Main */}
            <div className="relative min-h-screen flex items-center justify-center px-4 py-10">

                <div
                    className="
                        w-full max-w-5xl
                        grid lg:grid-cols-2
                        rounded-[32px]
                        overflow-hidden
                        bg-white/70
                        backdrop-blur-2xl
                        border border-white
                        shadow-[0_30px_80px_rgba(15,23,42,0.15)]
                    "
                >

                    {/* LEFT SIDE */}
                    <div
                        className="
                            hidden lg:flex
                            relative
                            overflow-hidden
                            min-h-[650px]
                            bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700
                            text-white
                            p-12
                            flex-col
                            justify-between
                        "
                    >

                        {/* Glow */}
                        <div className="absolute -top-32 -right-32 w-80 h-80 bg-white/20 rounded-full blur-3xl" />
                        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-cyan-300/20 rounded-full blur-3xl" />

                        {/* Content */}
                        <div className="relative z-10">

                            <div className="flex items-center gap-3 mb-10">
                                <div className="
                                    w-12 h-12
                                    rounded-2xl
                                    bg-white/15
                                    backdrop-blur-md
                                    border border-white/20
                                    flex items-center justify-center
                                    text-2xl
                                    shadow-lg
                                ">
                                    🧺
                                </div>

                                <span className="text-xl font-bold tracking-tight">
                                    WashGo
                                </span>
                            </div>

                            <h2 className="text-4xl font-black leading-tight">
                                Laundry made
                                <br />
                                <span className="text-cyan-200">
                                    simple.
                                </span>
                            </h2>

                            <p className="mt-6 text-blue-100 leading-relaxed max-w-sm">
                                ระบบรับส่งผ้าที่ช่วยให้การจัดการซักรีด
                                ง่ายขึ้น รวดเร็วขึ้น และสะดวกกว่าเดิม
                            </p>
                        </div>

                        {/* 3D washing machine */}
                        <div className="relative z-10 flex justify-center items-center">

                            <div className="
                                relative
                                w-64 h-64
                                rounded-[40px]
                                bg-white/10
                                backdrop-blur-md
                                border border-white/20
                                shadow-[0_30px_60px_rgba(0,0,0,0.2)]
                                flex items-center justify-center
                                rotate-[-4deg]
                                hover:rotate-0
                                hover:scale-105
                                transition-all
                                duration-700
                            ">

                                <div className="
                                    w-40 h-40
                                    rounded-full
                                    bg-gradient-to-br from-slate-100 to-slate-300
                                    shadow-[inset_0_5px_15px_rgba(255,255,255,0.8),0_15px_30px_rgba(0,0,0,0.2)]
                                    flex items-center justify-center
                                ">

                                    <div className="
                                        w-28 h-28
                                        rounded-full
                                        bg-gradient-to-br from-blue-400 to-indigo-600
                                        shadow-[inset_0_5px_20px_rgba(255,255,255,0.4)]
                                        flex items-center justify-center
                                        animate-[spin_12s_linear_infinite]
                                    ">
                                        <div className="text-4xl">
                                            🫧
                                        </div>
                                    </div>

                                </div>

                                {/* Floating bubble */}
                                <div className="
                                    absolute -top-5 -right-5
                                    w-12 h-12
                                    rounded-full
                                    bg-white/30
                                    backdrop-blur-md
                                    border border-white/30
                                    animate-bounce
                                " />

                                <div className="
                                    absolute -bottom-3 -left-5
                                    w-8 h-8
                                    rounded-full
                                    bg-cyan-200/40
                                    backdrop-blur-md
                                    animate-pulse
                                " />

                            </div>
                        </div>

                        <p className="relative z-10 text-sm text-blue-200">
                            Fast • Simple • Reliable
                        </p>

                    </div>

                    {/* RIGHT SIDE */}
                    <div className="relative flex items-center justify-center p-6 sm:p-10 lg:p-14">

                        <div className="w-full max-w-md">

                            {/* Mobile Logo */}
                            <div className="lg:hidden text-center mb-8">
                                <div className="
                                    inline-flex
                                    w-16 h-16
                                    items-center justify-center
                                    rounded-2xl
                                    bg-gradient-to-br from-blue-500 to-indigo-600
                                    text-3xl
                                    shadow-xl
                                    shadow-blue-500/20
                                    mb-4
                                ">
                                    🧺
                                </div>

                                <h1 className="text-2xl font-black text-slate-800">
                                    WashGo
                                </h1>
                            </div>

                            {/* Header */}
                            <div
                                key={mode}
                                className="
                                    animate-[fadeSlide_0.45s_ease-out]
                                "
                            >
                                <p className="text-sm font-medium text-blue-600 mb-2">
                                    {isLogin
                                        ? 'ยินดีต้อนรับกลับ 👋'
                                        : 'เริ่มต้นใช้งาน WashGo ✨'}
                                </p>

                                <h1 className="text-3xl sm:text-4xl font-black text-slate-900">
                                    {isLogin
                                        ? 'เข้าสู่ระบบ'
                                        : 'สร้างบัญชีใหม่'}
                                </h1>

                                <p className="mt-3 text-slate-500">
                                    {isLogin
                                        ? 'เข้าสู่ระบบเพื่อจัดการรายการซักรีดของคุณ'
                                        : 'สมัครสมาชิกเพื่อเริ่มใช้งานบริการของเรา'}
                                </p>
                            </div>

                            {/* Form */}
                            <form
                                onSubmit={submit}
                                className="
                                    mt-8
                                    space-y-4
                                "
                            >

                                {/* Register fields */}
                                <div
                                    className={`
                                        overflow-hidden
                                        transition-all
                                        duration-500
                                        ease-out
                                        ${isLogin
                                            ? 'max-h-0 opacity-0 -translate-y-4'
                                            : 'max-h-[300px] opacity-100 translate-y-0'
                                        }
                                    `}
                                >
                                    <div className="space-y-4 pb-1">

                                        {/* Name */}
                                        <div className="relative group">
                                            <span className="
                                                absolute left-4 top-1/2 -translate-y-1/2
                                                text-lg
                                                transition-transform
                                                group-focus-within:scale-110
                                            ">
                                                👤
                                            </span>

                                            <input
                                                type="text"
                                                placeholder="ชื่อ-นามสกุล"
                                                maxLength={100}
                                                value={form.fullName}
                                                onChange={set('fullName')}
                                                required={!isLogin}
                                                className="
                                                    w-full
                                                    h-14
                                                    pl-12 pr-4
                                                    rounded-2xl
                                                    bg-slate-50
                                                    border border-slate-200
                                                    outline-none
                                                    text-slate-800
                                                    placeholder:text-slate-400
                                                    transition-all
                                                    duration-300
                                                    focus:bg-white
                                                    focus:border-blue-500
                                                    focus:ring-4
                                                    focus:ring-blue-500/10
                                                    focus:shadow-lg
                                                    focus:shadow-blue-500/10
                                                "
                                            />
                                        </div>

                                        {/* Phone */}
                                        <div className="relative group">
                                            <span className="
                                                absolute left-4 top-1/2 -translate-y-1/2
                                                text-lg
                                            ">
                                                📱
                                            </span>

                                            <input
                                                type="text"
                                                placeholder="เบอร์โทร (ไม่บังคับ)"
                                                maxLength={20}
                                                value={form.phone}
                                                onChange={set('phone')}
                                                className="
                                                    w-full h-14
                                                    pl-12 pr-4
                                                    rounded-2xl
                                                    bg-slate-50
                                                    border border-slate-200
                                                    outline-none
                                                    transition-all
                                                    duration-300
                                                    focus:bg-white
                                                    focus:border-blue-500
                                                    focus:ring-4
                                                    focus:ring-blue-500/10
                                                "
                                            />
                                        </div>

                                        {/* Role */}
                                        <div className="relative">
                                            <span className="
                                                absolute left-4 top-1/2 -translate-y-1/2
                                                text-lg
                                                pointer-events-none
                                            ">
                                                🎯
                                            </span>

                                            <select
                                                value={form.role}
                                                onChange={set('role')}
                                                className="
                                                    appearance-none
                                                    w-full h-14
                                                    pl-12 pr-4
                                                    rounded-2xl
                                                    bg-slate-50
                                                    border border-slate-200
                                                    outline-none
                                                    text-slate-700
                                                    transition-all
                                                    focus:bg-white
                                                    focus:border-blue-500
                                                    focus:ring-4
                                                    focus:ring-blue-500/10
                                                "
                                            >
                                                <option value="Customer">
                                                    ลูกค้า
                                                </option>

                                                <option value="Rider">
                                                    ไรเดอร์
                                                </option>
                                            </select>
                                        </div>

                                    </div>
                                </div>

                                {/* Email */}
                                <div className="relative group">
                                    <span className="
                                        absolute left-4 top-1/2 -translate-y-1/2
                                        text-lg
                                        transition-transform
                                        group-focus-within:scale-110
                                    ">
                                        ✉️
                                    </span>

                                    <input
                                        type="email"
                                        placeholder="อีเมล"
                                        value={form.email}
                                        onChange={set('email')}
                                        required
                                        className="
                                            w-full h-14
                                            pl-12 pr-4
                                            rounded-2xl
                                            bg-slate-50
                                            border border-slate-200
                                            outline-none
                                            text-slate-800
                                            placeholder:text-slate-400
                                            transition-all
                                            duration-300
                                            focus:bg-white
                                            focus:border-blue-500
                                            focus:ring-4
                                            focus:ring-blue-500/10
                                            focus:shadow-lg
                                            focus:shadow-blue-500/10
                                        "
                                    />
                                </div>

                                {/* Password */}
                                <div className="relative group">
                                    <span className="
                                        absolute left-4 top-1/2 -translate-y-1/2
                                        text-lg
                                        transition-transform
                                        group-focus-within:scale-110
                                    ">
                                        🔒
                                    </span>

                                    <input
                                        type="password"
                                        placeholder="รหัสผ่าน (อย่างน้อย 8 ตัว)"
                                        maxLength={100}
                                        value={form.password}
                                        onChange={set('password')}
                                        required
                                        className="
                                            w-full h-14
                                            pl-12 pr-4
                                            rounded-2xl
                                            bg-slate-50
                                            border border-slate-200
                                            outline-none
                                            text-slate-800
                                            placeholder:text-slate-400
                                            transition-all
                                            duration-300
                                            focus:bg-white
                                            focus:border-blue-500
                                            focus:ring-4
                                            focus:ring-blue-500/10
                                            focus:shadow-lg
                                            focus:shadow-blue-500/10
                                        "
                                    />
                                </div>

                                {/* Error */}
                                {error && (
                                    <div className="
                                        flex items-start gap-3
                                        p-4
                                        rounded-2xl
                                        bg-red-50
                                        border border-red-100
                                        text-red-600
                                        text-sm
                                        animate-[shake_0.3s_ease-in-out]
                                    ">
                                        <span>⚠️</span>
                                        <span>{error}</span>
                                    </div>
                                )}

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={busy}
                                    className="
                                        relative
                                        w-full h-14
                                        mt-2
                                        overflow-hidden
                                        rounded-2xl
                                        bg-gradient-to-r
                                        from-blue-600
                                        to-indigo-600
                                        text-white
                                        font-bold
                                        shadow-lg
                                        shadow-blue-500/25
                                        transition-all
                                        duration-300
                                        hover:-translate-y-1
                                        hover:shadow-xl
                                        hover:shadow-blue-500/30
                                        active:translate-y-0
                                        disabled:opacity-60
                                        disabled:cursor-not-allowed
                                        disabled:hover:translate-y-0
                                        group
                                    "
                                >
                                    {/* shine */}
                                    <span className="
                                        absolute inset-0
                                        -translate-x-full
                                        group-hover:translate-x-full
                                        transition-transform
                                        duration-700
                                        bg-gradient-to-r
                                        from-transparent
                                        via-white/20
                                        to-transparent
                                    " />

                                    <span className="relative z-10">
                                        {busy
                                            ? 'กำลังดำเนินการ...'
                                            : isLogin
                                                ? 'เข้าสู่ระบบ →'
                                                : 'สร้างบัญชี →'}
                                    </span>
                                </button>

                            </form>

                            {/* Switch */}
                            <div className="mt-7 text-center">

                                <p className="text-sm text-slate-500">
                                    {isLogin
                                        ? 'ยังไม่มีบัญชี?'
                                        : 'มีบัญชีอยู่แล้ว?'}
                                </p>

                                <button
                                    type="button"
                                    onClick={switchMode}
                                    className="
                                        mt-2
                                        text-blue-600
                                        font-bold
                                        hover:text-indigo-600
                                        transition-colors
                                        relative
                                        group
                                    "
                                >
                                    {isLogin
                                        ? 'สมัครสมาชิก'
                                        : 'เข้าสู่ระบบ'}

                                    <span className="
                                        absolute
                                        left-0
                                        -bottom-1
                                        w-0
                                        h-0.5
                                        bg-blue-600
                                        transition-all
                                        duration-300
                                        group-hover:w-full
                                    " />
                                </button>

                            </div>

                            <p className="
                                mt-8
                                text-center
                                text-xs
                                text-slate-400
                            ">
                                © 2026 WashGo. All rights reserved.
                            </p>

                        </div>

                    </div>

                </div>
            </div>
        </main>
    )
}