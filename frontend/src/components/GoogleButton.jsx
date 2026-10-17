import { useEffect, useRef } from 'react'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const HEIGHT = 48     // ความสูงปุ่มที่เห็น (px) = ช่องกรอก h-12
const GSI_HEIGHT = 40 // ความสูงจริงของปุ่ม Google ขนาด large

let scriptPromise
function loadGsi() {
    if (window.google?.accounts?.id) return Promise.resolve()
    scriptPromise ??= new Promise((resolve, reject) => {
        const s = document.createElement('script')
        s.src = 'https://accounts.google.com/gsi/client'
        s.async = true
        s.onload = resolve
        s.onerror = () => {
            scriptPromise = null
            reject(new Error('gsi load failed'))
        }
        document.head.appendChild(s)
    })
    return scriptPromise
}

function GoogleLogo() {
    return (
        <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
    )
}

// ปุ่มหน้าตาของเราเอง + ปุ่มจริงของ Google ซ่อนโปร่งใสวางทับ (คลิกถูกปุ่ม Google จริง)
export default function GoogleButton({ onCredential, onError, label = 'ดำเนินการต่อด้วย Google' }) {
    const wrap = useRef(null)
    const slot = useRef(null)
    const handlers = useRef({ onCredential, onError })

    useEffect(() => {
        handlers.current = { onCredential, onError }
    })

    useEffect(() => {
        if (!CLIENT_ID) return
        let cancelled = false

        loadGsi()
            .then(() => {
                if (cancelled || !slot.current || !wrap.current) return
                const w = wrap.current.offsetWidth || 320
                const gw = Math.min(400, w) // Google จำกัดความกว้างสูงสุด 400

                window.google.accounts.id.initialize({
                    client_id: CLIENT_ID,
                    callback: (res) => handlers.current.onCredential(res.credential),
                })
                window.google.accounts.id.renderButton(slot.current, {
                    type: 'standard',
                    theme: 'outline',
                    size: 'large',
                    text: 'continue_with',
                    shape: 'rectangular',
                    width: gw,
                })
                // ยืดปุ่มที่ซ่อนอยู่ให้เต็มพื้นที่ปุ่มของเรา (กันมีขอบที่กดไม่โดน)
                slot.current.style.width = `${gw}px`
                slot.current.style.transform = `scale(${w / gw}, ${HEIGHT / GSI_HEIGHT})`
            })
            .catch(() => handlers.current.onError?.('โหลดปุ่ม Google ไม่สำเร็จ'))

        return () => {
            cancelled = true
        }
    }, [])

    if (!CLIENT_ID) return null

    return (
        <div ref={wrap} className="group relative h-12 w-full">
            <div
                aria-hidden="true"
                className="pointer-events-none flex h-full w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white text-sm font-normal text-slate-700 shadow-sm transition group-hover:border-violet-300 group-hover:bg-violet-50/50 group-hover:shadow-md"
            >
                <GoogleLogo />
                <span>{label}</span>
            </div>
            <div className="absolute inset-0 overflow-hidden rounded-xl opacity-[0.01]">
                <div ref={slot} className="h-10 origin-top-left" />
            </div>
        </div>
    )
}