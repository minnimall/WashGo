import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'
import Layout from './components/Layout'
import RequireRole from './components/RequireRole'
import LoginPage from './pages/LoginPage'
import LocationsPage from './pages/LocationsPage'
import NewOrderPage from './pages/NewOrderPage'
import OrdersPage from './pages/OrdersPage'
import OrderDetailPage from './pages/OrderDetailPage'
import RiderDashboardPage from './pages/RiderDashboardPage'
import RiderVerificationPage from './pages/RiderVerificationPage'
import RiderJobsPage from './pages/RiderJobsPage'
import RiderJobDetailPage from './pages/RiderJobDetailPage'
import AdminRidersPage from './pages/AdminRidersPage'

function Home() {
  const { user } = useAuth()
    if (user.roles.includes('Customer')) return <Navigate to="/orders" replace />
    if (user.roles.includes('Rider')) return <Navigate to="/rider" replace />
    if (user.roles.includes('Admin')) return <Navigate to="/admin/riders" replace />

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

            <Route path="/rider" element={<RequireRole role="Rider"><RiderDashboardPage /></RequireRole>} />
            <Route path="/rider/verify" element={<RequireRole role="Rider"><RiderVerificationPage /></RequireRole>} />
            <Route path="/rider/jobs" element={<RequireRole role="Rider"><RiderJobsPage /></RequireRole>} />
            <Route path="/rider/jobs/:id" element={<RequireRole role="Rider"><RiderJobDetailPage /></RequireRole>} />
            <Route path="/admin/riders" element={<RequireRole role="Admin"><AdminRidersPage /></RequireRole>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}