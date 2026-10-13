import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import MobileTabBar from '../components/MobileTabBar'

export default function Layout() {
    const { user, logout } = useAuth()
    const location = useLocation()

    const [userOpen, setUserOpen] = useState(false) // dropdown ผู้ใช้บนมือถือ
    const userRef = useRef(null)

    const isCustomer = user.roles.includes('Customer')
    const isRider = user.roles.includes('Rider')
    const isAdmin = user.roles.includes('Admin')

    // ลิงก์บน desktop
    const navClass = ({ isActive }) =>
        `px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-300 ${
            isActive
                ? 'text-blue-600 font-semibold'
                : 'text-slate-500 hover:text-blue-600'
        }`

    // ลิงก์ใน dropdown บนมือถือ
    const dropdownNavClass = ({ isActive }) =>
        `flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
            isActive
                ? 'bg-blue-50 text-blue-600 font-semibold'
                : 'text-slate-600 hover:bg-slate-50'
        }`

    // รวมเมนูตามสิทธิ์ไว้ที่เดียว ใช้ทั้ง desktop และ mobile
    const navLinks = [
        ...(isCustomer
            ? [
                { to: "/" , label: 'หน้าหลัก' },
                { to: '/orders/new', label: 'สั่งซักผ้า' },
                { to: '/orders', label: 'ออเดอร์ของฉัน', end: true },
                { to: '/locations', label: 'ที่อยู่ของฉัน' },
            ]
            : []),
        ...(isRider
            ? [
                { to: '/', label: 'หน้าหลัก', end: true },
                { to: '/rider/jobs', label: 'งาน' },
                { to: '/rider/earnings', label: 'รายได้' },
                { to: '/rider', label: 'บัญชี Rider', end: true },
            ]
            : []),
        ...(isAdmin ? [{ to: '/admin/riders', label: 'ตรวจสอบ Rider' }] : []),
    ]

    const hasNav = navLinks.length > 0

    // ป้ายบทบาทที่แสดงใต้ชื่อผู้ใช้
    const roleLabel = isAdmin ? 'Admin' : isRider ? 'Rider' : isCustomer ? 'Customer' : 'User'

    const initial = user.fullName?.charAt(0)?.toUpperCase() || '?'

    // ปิด dropdown ทุกครั้งที่เปลี่ยนหน้า
    useEffect(() => {
        setUserOpen(false)
    }, [location.pathname])

    // คลิกนอก dropdown / กด Esc เพื่อปิด
    useEffect(() => {
        if (!userOpen) return

        const onPointerDown = (e) => {
            if (userRef.current && !userRef.current.contains(e.target)) {
                setUserOpen(false)
            }
        }
        const onKey = (e) => {
            if (e.key === 'Escape') setUserOpen(false)
        }

        document.addEventListener('pointerdown', onPointerDown)
        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('pointerdown', onPointerDown)
            document.removeEventListener('keydown', onKey)
        }
    }, [userOpen])

    const renderLinks = () =>
        navLinks.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} className={navClass}>
                {label}
            </NavLink>
        ))

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">

            {/* Navbar */}
            <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/75 backdrop-blur-xl shadow-[0_4px_25px_rgba(15,23,42,0.04)]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">

                    {/* Left */}
                    <div className="flex items-center">

                        {/* Logo */}
                        <NavLink to="/" className="flex items-center gap-3 shrink-0 group">
                            <img
                                src="/images/logowashgo.png"
                                alt="WashGo"
                                className="h-20 w-20 object-contain transition-all duration-300 group-hover:-translate-y-0.5 group-hover:scale-105"
                            />
                        </NavLink>

                        {/* Navigation (desktop) */}
                        {hasNav && (
                            <nav className="hidden md:flex items-center gap-1">
                                {renderLinks()}
                            </nav>
                        )}
                    </div>

                    {/* Right */}
                    <div className="flex items-center gap-3 shrink-0">

                        {/* User info (desktop) */}
                        <div className="hidden md:flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-sm font-bold text-blue-600 shadow-sm">
                                {initial}
                            </div>

                            <div className="max-w-[140px]">
                                <p className="text-sm font-semibold text-slate-700 truncate">
                                    {user.fullName}
                                </p>

                                <p className="text-[11px] text-slate-400">
                                    {roleLabel}
                                </p>
                            </div>
                        </div>

                        {/* Logout (desktop) */}
                        <button
                            type="button"
                            onClick={logout}
                            className="hidden md:block h-10 px-4 rounded-xl border border-slate-200 bg-white/80 text-sm font-medium text-slate-600 transition-all duration-300 hover:bg-red-50 hover:border-red-100 hover:text-red-500 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
                        >
                            ออกจากระบบ
                        </button>

                        {/* Avatar + dropdown (มือถือ / tablet) */}
                        <div ref={userRef} className="relative md:hidden">
                            <button
                                type="button"
                                onClick={() => setUserOpen((v) => !v)}
                                aria-label="เมนูผู้ใช้"
                                aria-expanded={userOpen}
                                className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-sm font-bold text-blue-600 shadow-sm ring-2 transition active:scale-95 ${
                                    userOpen ? 'ring-blue-300' : 'ring-white'
                                }`}
                            >
                                {initial}
                            </button>

                            {userOpen && (
                                <div className="absolute right-0 top-full mt-3 w-64 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl shadow-slate-900/10">

                                    {/* ข้อมูลผู้ใช้ */}
                                    <div className="flex items-center gap-3 px-3 py-3">
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-base font-bold text-blue-600">
                                            {initial}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-slate-800">
                                                {user.fullName}
                                            </p>
                                            <p className="text-xs text-slate-400">{roleLabel}</p>
                                        </div>
                                    </div>

                                    {/* เมนูนำทาง (อยู่เหนือปุ่มออกจากระบบ) */}
                                    {hasNav && (
                                        <>
                                            <div className="my-1 h-px bg-slate-100" />

                                            <div className="flex flex-col gap-0.5 py-1">
                                                {navLinks.map(({ to, label, end }) => (
                                                    <NavLink
                                                        key={to}
                                                        to={to}
                                                        end={end}
                                                        className={dropdownNavClass}
                                                    >
                                                        {({ isActive }) => (
                                                            <>
                                                                <span>{label}</span>
                                                                <svg
                                                                    viewBox="0 0 24 24"
                                                                    className={`h-4 w-4 ${isActive ? 'text-blue-500' : 'text-slate-300'}`}
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    strokeWidth="2"
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                >
                                                                    <path d="M9 6l6 6-6 6" />
                                                                </svg>
                                                            </>
                                                        )}
                                                    </NavLink>
                                                ))}
                                            </div>
                                        </>
                                    )}

                                    <div className="my-1 h-px bg-slate-100" />

                                    {/* ออกจากระบบ */}
                                    <button
                                        type="button"
                                        onClick={logout}
                                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-500 transition hover:bg-red-50"
                                    >
                                        <svg
                                            viewBox="0 0 24 24"
                                            className="h-5 w-5"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                            <path d="M16 17l5-5-5-5M21 12H9" />
                                        </svg>
                                        ออกจากระบบ
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Outlet />
            </main>

            <MobileTabBar links={navLinks} />
        </div>
    )
}