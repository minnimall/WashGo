import { useEffect, useState } from 'react'

// เก็บ event ติดตั้งไว้ระดับโมดูล เพราะ Chrome ยิง beforeinstallprompt ครั้งเดียวตั้งแต่โหลดหน้า
// ซึ่งมักเกิดก่อนที่ component นี้จะ mount (รอ login เสร็จ)
let deferredPrompt = null
const listeners = new Set()
const notify = () => listeners.forEach((fn) => fn())

if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault()
        deferredPrompt = e
        notify()
    })
    window.addEventListener('appinstalled', () => {
        deferredPrompt = null
        notify()
    })
}

const KEY = 'washgo-install-dismissed'
const SNOOZE_DAYS = 14

function dismissedRecently() {
    try {
        const t = Number(localStorage.getItem(KEY))
        return Boolean(t) && Date.now() - t < SNOOZE_DAYS * 864e5
    } catch {
        return false
    }
}

const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true

// iPhone/iPad ไม่มี beforeinstallprompt ต้องบอกผู้ใช้ให้กด Share เอง
const isIos = () =>
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

export default function InstallPrompt() {
    const [, rerender] = useState(0)
    const [hidden, setHidden] = useState(dismissedRecently)

    useEffect(() => {
        const fn = () => rerender((n) => n + 1)
        listeners.add(fn)
        return () => listeners.delete(fn)
    }, [])

    if (hidden || isStandalone()) return null

    const ios = isIos()
    if (!deferredPrompt && !ios) return null

    const dismiss = () => {
        try {
            localStorage.setItem(KEY, String(Date.now()))
        } catch {
            /* ใช้ localStorage ไม่ได้ก็ข้าม */
        }
        setHidden(true)
    }

    const install = async () => {
        const p = deferredPrompt
        if (!p) return
        p.prompt()
        await p.userChoice
        deferredPrompt = null
        setHidden(true)
    }

    return (
        <div
            role="dialog"
            aria-label="ติดตั้งแอป WashGo"
            className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_40px_rgba(76,61,145,0.22)] lg:inset-x-auto lg:bottom-6 lg:right-6 lg:mx-0 lg:w-80"
        >
            <div className="flex items-start gap-3">
                <img src="/icons/icon-192.png" alt="" className="h-11 w-11 shrink-0 rounded-xl border border-slate-100" />
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800">ติดตั้ง WashGo ลงเครื่อง</p>
                    {ios && !deferredPrompt ? (
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                            แตะปุ่ม <span className="font-semibold text-slate-700">แชร์</span> (สี่เหลี่ยมมีลูกศรขึ้น) ที่แถบด้านล่างของ Safari
                            แล้วเลือก <span className="font-semibold text-slate-700">เพิ่มไปยังหน้าจอโฮม</span>
                        </p>
                    ) : (
                        <p className="mt-1 text-xs leading-5 text-slate-500">เปิดใช้จากไอคอนเหมือนแอปทั่วไป เร็วขึ้นและเต็มจอ</p>
                    )}
                </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
                <button
                    type="button"
                    onClick={dismiss}
                    className="h-9 rounded-xl px-3 text-xs font-semibold text-slate-500 transition hover:bg-slate-50"
                >
                    ไว้ทีหลัง
                </button>
                {deferredPrompt && (
                    <button
                        type="button"
                        onClick={install}
                        className="h-9 rounded-xl bg-violet-500 px-4 text-xs font-semibold text-white shadow-md shadow-violet-500/20 transition hover:bg-violet-600"
                    >
                        ติดตั้ง
                    </button>
                )}
            </div>
        </div>
    )
}