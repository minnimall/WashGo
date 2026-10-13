import { NavLink } from 'react-router-dom'

/* เลือกไอคอนจาก path ของเมนู */
function iconFor(to) {
    if (to === '/') return 'home'
    if (to.startsWith('/orders/new')) return 'plus'
    if (to.startsWith('/orders')) return 'list'
    if (to.startsWith('/locations')) return 'pin'
    if (to.startsWith('/rider/jobs')) return 'list'
    return 'user'
}

function Icon({ name }) {
    const p = {
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        viewBox: '0 0 24 24',
        className: 'h-[22px] w-[22px]',
    }

    switch (name) {
        case 'home':
            return (
                <svg {...p}>
                    <path d="M3 11l9-8 9 8" />
                    <path d="M5 10v10h14V10" />
                </svg>
            )
        case 'plus':
            return (
                <svg {...p}>
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <path d="M12 8v8M8 12h8" />
                </svg>
            )
        case 'list':
            return (
                <svg {...p}>
                    <path d="M8 6h13M8 12h13M8 18h13" />
                    <circle cx="4" cy="6" r="1" />
                    <circle cx="4" cy="12" r="1" />
                    <circle cx="4" cy="18" r="1" />
                </svg>
            )
        case 'pin':
            return (
                <svg {...p}>
                    <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" />
                    <circle cx="12" cy="9.5" r="2.5" />
                </svg>
            )
        default:
            return (
                <svg {...p}>
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21a8 8 0 0 1 16 0" />
                </svg>
            )
    }
}

/**
 * แถบเมนูล่างแบบแอป — แสดงเฉพาะต่ำกว่า md
 * รับ links = [{ to, label, end }] (ใช้ navLinks ตัวเดียวกับ navbar)
 * ไม่มีปุ่มออกจากระบบ (ยังอยู่ใน dropdown ของ avatar)
 */
export default function MobileTabBar({ links = [] }) {
    if (links.length === 0) return null

    return (
        <nav
            aria-label="เมนูหลัก"
            className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/70 bg-white/95 shadow-[0_-4px_20px_rgba(15,23,42,0.06)] backdrop-blur-xl md:hidden"
        >
            <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
                {links.slice(0, 5).map(({ to, label, end }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={end || to === '/'}
                        className="flex min-w-0 flex-1 flex-col items-center gap-1"
                    >
                        {({ isActive }) => (
                            <>
                                <span
                                    className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-200 ${
                                        isActive
                                            ? 'text-blue-600'
                                            : 'text-slate-400'
                                    }`}
                                >
                                    <Icon name={iconFor(to)} />
                                </span>
                                <span
                                    className={`w-full truncate text-center text-[11px] leading-none ${
                                        isActive
                                            ? 'font-semibold text-blue-600'
                                            : 'font-medium text-slate-400'
                                    }`}
                                >
                                    {label}
                                </span>
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </nav>
    )
}