import { createContext, useContext, useEffect, useState } from 'react'
import api from './api'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    // เปิดเว็บ: ถาม backend ว่า cookie ที่มีอยู่ยังใช้ได้ไหม
    useEffect(() => {
        localStorage.removeItem('token') // เก็บกวาด token เก่าจากเวอร์ชันก่อน (ลบบรรทัดนี้ได้ภายหลัง)
        api.get('/auth/me')
        .then((res) => setUser(res.data))
        .catch(() => setUser(null))
        .finally(() => setLoading(false))
    }, [])

    useEffect(() => {
        const onExpired = () => setUser(null)
        window.addEventListener('auth-expired', onExpired)
        return () => window.removeEventListener('auth-expired', onExpired)
    }, [])

    const login = async (email, password) =>
        setUser((await api.post('/auth/login', { email, password })).data.user)

    const register = async (form) =>
        setUser((await api.post('/auth/register', form)).data.user)

    const logout = async () => {
        try {
        await api.post('/auth/logout')
        } finally {
        setUser(null)
        }
    }

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
        {children}
        </AuthContext.Provider>
    )
}