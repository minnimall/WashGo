import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'
import Layout from './components/Layout'
import RequireRole from './components/RequireRole'
import LoginPage from './pages/LoginPage'
import LocationsPage from './pages/LocationsPage'
import NewOrderPage from './pages/NewOrderPage'
import OrdersPage from './pages/OrdersPage'
import OrderDetailPage from './pages/OrderDetailPage'

function Home() {
  const { user } = useAuth()
  if (user.roles.includes('Customer')) return <Navigate to="/orders" replace />

  return (
    <div className="card">
      <h2>สวัสดี {user.fullName}</h2>
      <p className="muted">หน้าสำหรับ {user.roles.join(', ')} อยู่ระหว่างพัฒนา</p>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<RequireRole><Layout /></RequireRole>}>
            <Route path="/" element={<Home />} />
            <Route path="/orders" element={<RequireRole role="Customer"><OrdersPage /></RequireRole>} />
            <Route path="/orders/new" element={<RequireRole role="Customer"><NewOrderPage /></RequireRole>} />
            <Route path="/orders/:id" element={<RequireRole role="Customer"><OrderDetailPage /></RequireRole>} />
            <Route path="/locations" element={<RequireRole role="Customer"><LocationsPage /></RequireRole>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}