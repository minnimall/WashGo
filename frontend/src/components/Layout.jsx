import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function Layout() {
    const { user, logout } = useAuth()
    const isCustomer = user.roles.includes('Customer')

    const navClass = ({ isActive }) =>
    `px-3 py-2 text-sm font-medium transition-colors duration-300 ${
        isActive
            ? 'text-blue-600 font-semibold'
            : 'text-slate-500 hover:text-blue-600'
    }`

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

                            {/* <div className="hidden sm:block">
                                <h1 className="text-lg font-black tracking-tight text-slate-800">
                                    Wash<span className="text-blue-600">Go</span>
                                </h1>
                                <p className="text-[10px] font-medium tracking-wider text-slate-400">
                                    LAUNDRY SERVICE
                                </p>
                            </div> */}
                        </NavLink>

                        {/* Navigation */}
                        {isCustomer && (
                            <nav className="hidden md:flex items-center gap-1">
                                <NavLink to="/orders/new" className={navClass}>
                                    สั่งซักผ้า
                                </NavLink>

                                <NavLink to="/orders" end className={navClass}>
                                    ออเดอร์ของฉัน
                                </NavLink>

                                <NavLink to="/locations" className={navClass}>
                                    ที่อยู่ของฉัน
                                </NavLink>
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
                                    {isCustomer ? 'Customer' : 'User'}
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
                {isCustomer && (
                    <nav className="md:hidden flex gap-5 overflow-x-auto px-4 pb-3 border-t border-slate-100">
                        <NavLink to="/orders/new" className={navClass}>
                            สั่งซักผ้า
                        </NavLink>

                        <NavLink to="/orders" end className={navClass}>
                            ออเดอร์ของฉัน
                        </NavLink>

                        <NavLink to="/locations" className={navClass}>
                            ที่อยู่ของฉัน
                        </NavLink>
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