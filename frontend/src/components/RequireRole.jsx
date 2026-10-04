import { Navigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

// ไม่ใส่ role = แค่ต้องล็อกอิน / ใส่ role = ต้องมี role นั้นด้วย
// (นี่คือแค่ซ่อนหน้าให้ผู้ใช้ ความปลอดภัยจริงอยู่ที่ [Authorize] ฝั่ง backend)
export default function RequireRole({ role, children }) {
    const { user, loading } = useAuth()

    if (loading) return <p className="container muted">กำลังโหลด...</p>
    if (!user) return <Navigate to="/login" replace />
    if (role && !user.roles.includes(role)) return <Navigate to="/" replace />
    return children
}