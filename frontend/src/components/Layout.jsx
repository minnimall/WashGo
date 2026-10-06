import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function Layout() {
    const { user, logout } = useAuth()
    const isCustomer = user.roles.includes('Customer')
    const isRider = user.roles.includes('Rider')
    const isAdmin = user.roles.includes('Admin')

    const navClass = ({ isActive }) =>
    `px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-300 ${
        isActive
            ? 'text-blue-600 font-semibold'
            : 'text-slate-500 hover:text-blue-600'
    }`

    // รวมเมนูตามสิทธิ์ไว้ที่เดียว ใช้ทั้ง desktop และ mobile
    const navLinks = [
        ...(isCustomer
            ? [
                  { to: '/orders/new', label: 'สั่งซักผ้า' },
                  { to: '/orders', label: 'ออเดอร์ของฉัน', end: true },
                  { to: '/locations', label: 'ที่อยู่ของฉัน' },
              ]
            : []),
        ...(isRider
            ? [
                  { to: '/rider/jobs', label: 'งาน' },
                  { to: '/rider', label: 'บัญชี Rider', end: true },
              ]
            : []),
        ...(isAdmin ? [{ to: '/admin/riders', label: 'ตรวจสอบ Rider' }] : []),
    ]

    const hasNav = navLinks.length > 0

    // ป้ายบทบาทที่แสดงใต้ชื่อผู้ใช้
    const roleLabel = isAdmin ? 'Admin' : isRider ? 'Rider' : isCustomer ? 'Customer' : 'User'

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
                    <div className="flex items-center ">

                        {/* Logo */}
                        <NavLink to="/" className="flex items-center gap-3 shrink-0 group">
                            <img
                                src="/images/WashGo-logo.png"
                                alt="WashGo"
                                className="h-30 w-30 object-contain transition-all duration-300 group-hover:-translate-y-0.5 group-hover:scale-105"
                            />
                        </NavLink>

                        {/* Navigation */}
                        {hasNav && (
                            <nav className="hidden md:flex items-center gap-1">
                                {renderLinks()}
                            </nav>
                        )}
                    </div>

                    {/* User */}
                    <div className="flex items-center gap-3 shrink-0">

                        {/* User info */}
                        <div className="hidden sm:flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-sm font-bold text-blue-600  border-white shadow-sm">
                                {user.fullName?.charAt(0)?.toUpperCase()}
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

                        {/* Logout */}
                        <button
                            onClick={logout}
                            className="h-10 px-4 rounded-xl border border-slate-200 bg-white/80 text-sm font-medium text-slate-600 transition-all duration-300 hover:bg-red-50 hover:border-red-100 hover:text-red-500 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
                        >
                            <span className="hidden sm:inline">
                                ออกจากระบบ
                            </span>
                            <span className="sm:hidden">
                                ออก
                            </span>
                        </button>
                    </div>
                </div>

                {/* Mobile Navigation */}
                {hasNav && (
                    <nav className="md:hidden flex gap-5 overflow-x-auto px-4 pb-3 border-t border-slate-100">
                        {renderLinks()}
                    </nav>
                )}
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Outlet />
            </main>
        </div>
    )
}