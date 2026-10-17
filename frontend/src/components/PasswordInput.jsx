import { useState } from 'react'

export default function PasswordInput({ className = 'h-12', ...props }) {
    const [show, setShow] = useState(false)

    return (
        <div className="relative">
            <input
                {...props}
                type={show ? 'text' : 'password'}
                className={`w-full px-4 pr-11 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:bg-white focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 ${className}`}
            />
            <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-violet-500 transition"
            >
                {show ? (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 3l18 18" />
                        <path d="M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 8.5 4 9.5 6a12.8 12.8 0 0 1-2.3 3M6.6 6.7C4.5 8 3 10.2 2.5 12c1 2 4.5 6 9.5 6 1.5 0 2.8-.4 4-.9" />
                        <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
                    </svg>
                ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2.5 12C3.5 10 7 6 12 6s8.5 4 9.5 6c-1 2-4.5 6-9.5 6s-8.5-4-9.5-6Z" />
                        <circle cx="12" cy="12" r="3" />
                    </svg>
                )}
            </button>
        </div>
    )
}