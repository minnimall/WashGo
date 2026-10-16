import { NavLink } from 'react-router-dom'

const svg = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    viewBox: '0 0 24 24',
}

function TabIcon({ name, className = 'h-6 w-6' }) {
    switch (name) {
        case 'wallet':
            return (
                <svg {...svg} className={className}>
                    <rect x="3" y="7" width="18" height="13" rx="2.5" />
                    <path d="M3 10V7.5A2.5 2.5 0 0 1 5.5 5H17" />
                    <circle cx="16.5" cy="13.5" r="1" />
                </svg>
            )
        case 'jobs':
        case 'list':
            return (
                <svg {...svg} className={className}>
                    <path d="M8 6h13M8 12h13M8 18h13" />
                    <circle cx="4" cy="6" r="1" />
                    <circle cx="4" cy="12" r="1" />
                    <circle cx="4" cy="18" r="1" />
                </svg>
            )
        case 'plus':
            return (
                <svg {...svg} className={className}>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 8v8M8 12h8" />
                </svg>
            )
        case 'pin':
            return (
                <svg {...svg} className={className}>
                    <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
                    <circle cx="12" cy="10" r="2.5" />
                </svg>
            )
        case 'users':
            return (
                <svg {...svg} className={className}>
                    <circle cx="9" cy="8" r="3.5" />
                    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
                    <circle cx="17" cy="9" r="2.5" />
                    <path d="M17.5 14.2A5 5 0 0 1 21.5 19" />
                </svg>
            )
        case 'tag':
            return (
                <svg {...svg} className={className}>
                    <path d="M3 12V4h8l10 10-8 8L3 12Z" />
                    <circle cx="7.5" cy="8.5" r="1" />
                </svg>
            )
        case 'shield':
            return (
                <svg {...svg} className={className}>
                    <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" />
                    <path d="m9 12 2 2 4-4" />
                </svg>
            )
        case 'user':
            return (
                <svg {...svg} className={className}>
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21a8 8 0 0 1 16 0" />
                </svg>
            )
        case 'home':
        default:
            return (
                <svg {...svg} className={className}>
                    <path d="M3 11.5 12 4l9 7.5" />
                    <path d="M5 10v10h14V10" />
                    <path d="M10 20v-6h4v6" />
                </svg>
            )
    }
}

export default function MobileTabBar({ links = [] }) {
    const tabs = links.filter((l) => !l.hideInTabBar)
    if (tabs.length === 0) return null

    return (
        <nav
            aria-label="เมนูหลัก"
            className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        >
            <ul className="mx-auto flex h-[4.25rem] max-w-md items-stretch justify-around">
                {tabs.map(({ to, label, icon, end }) => (
                    <li key={to} className="min-w-0 flex-1">
                        <NavLink
                            to={to}
                            end={end}
                            className={({ isActive }) =>
                                `flex h-full flex-col items-center justify-center gap-1 px-1 text-[11px] transition-colors ${
                                    isActive
                                        ? 'font-bold text-blue-600'
                                        : 'font-medium text-slate-400 hover:text-slate-600'
                                }`
                            }
                        >
                            <TabIcon name={icon} />
                            <span className="max-w-full truncate">{label}</span>
                        </NavLink>
                    </li>
                ))}
            </ul>
        </nav>
    )
}