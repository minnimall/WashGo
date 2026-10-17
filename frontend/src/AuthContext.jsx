import { createContext, useContext, useEffect, useState } from 'react'
import api from './api'
import OfflineScreen from './components/OfflineScreen'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

// /auth/me และ /auth/login ไม่ส่ง avatarVersion มา จึงไปดึงจาก /profile แล้วรวมเข้า user
// ถ้าดึงไม่สำเร็จจะถือว่าไม่มีรูป (แสดงตัวอักษรย่อ) ไม่ให้ล็อกอินพังเพราะเรื่องนี้
async function withAvatar(u) {
    try {
        const { data } = await api.get('/profile')
        return { ...u, avatarVersion: data.avatarVersion ?? null }
    } catch {
        return { ...u, avatarVersion: null }
    }
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [offline, setOffline] = useState(false)

    // เปิดเว็บ: ถาม backend ว่า cookie ที่มีอยู่ยังใช้ได้ไหม
    useEffect(() => {
        localStorage.removeItem('token') // เก็บกวาด token เก่าจากเวอร์ชันก่อน (ลบบรรทัดนี้ได้ภายหลัง)

        const init = async () => {
            try {
                const res = await api.get('/auth/me')
                setUser(await withAvatar(res.data))
            } catch (err) {
                setUser(null)
                if (!err.response) setOffline(true) // ไม่มี response = ติดต่อเซิร์ฟเวอร์ไม่ได้
            } finally {
                setLoading(false)
            }
        }
        init()
    }, [])

    useEffect(() => {
        const onExpired = () => setUser(null)
        window.addEventListener('auth-expired', onExpired)
        return () => window.removeEventListener('auth-expired', onExpired)
    }, [])

    const login = async (email, password) => {
        const res = await api.post('/auth/login', { email, password })
        setUser(await withAvatar(res.data.user))
    }

    // สมัครแล้วยังไม่ล็อกอิน ต้องยืนยันอีเมลก่อน
    const register = async (form) => (await api.post('/auth/register', form)).data

    const loginWithGoogle = async (credential) => {
        const res = await api.post('/auth/google', { credential })
        setUser(await withAvatar(res.data.user))
    }

    const logout = async () => {
        try {
            await api.post('/auth/logout')
        } finally {
            setUser(null)
        }
    }

    // อัปเดตบางฟิลด์ของ user ทันที เช่น patchUser({ avatarVersion: 123 }) หรือ patchUser({ fullName: 'ชื่อใหม่' })
    const patchUser = (partial) =>
        setUser((u) => (u ? { ...u, ...partial } : u))

    if (offline) return <OfflineScreen />

    return (
        <AuthContext.Provider
            value={{ user, loading, login, register, loginWithGoogle, logout, patchUser }}
        >
            {children}
        </AuthContext.Provider>
    )
}