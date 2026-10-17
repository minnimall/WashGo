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
import CustomerHomePage from './pages/CustomerHomePage'
import RiderHomePage from './pages/RiderHomePage'
import RiderEarningsPage from './pages/RiderEarningsPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminUsersPage from './pages/AdminUsersPage'
import AdminPricingPage from './pages/AdminPricingPage'
import ProfilePage from './pages/ProfilePage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import VerifyEmailPage from './pages/VerifyEmailPage'

function Home() {
  const { user } = useAuth()
      if (user.roles.includes('Customer')) return <CustomerHomePage />
      if (user.roles.includes('Rider')) return <RiderHomePage />
      if (user.roles.includes('Admin')) return <AdminDashboardPage />

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
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />

          <Route element={<RequireRole><Layout /></RequireRole>}>
            <Route path="/" element={<Home />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/orders" element={<RequireRole role="Customer"><OrdersPage /></RequireRole>} />
            <Route path="/orders/new" element={<RequireRole role="Customer"><NewOrderPage /></RequireRole>} />
            <Route path="/orders/:id" element={<RequireRole role="Customer"><OrderDetailPage /></RequireRole>} />
            <Route path="/locations" element={<RequireRole role="Customer"><LocationsPage /></RequireRole>} />

            <Route path="/rider" element={<RequireRole role="Rider"><RiderDashboardPage /></RequireRole>} />
            <Route path="/rider/verify" element={<RequireRole role="Rider"><RiderVerificationPage /></RequireRole>} />
            <Route path="/rider/jobs" element={<RequireRole role="Rider"><RiderJobsPage /></RequireRole>} />
            <Route path="/rider/jobs/:id" element={<RequireRole role="Rider"><RiderJobDetailPage /></RequireRole>} />
            <Route path="/rider/earnings" element={<RequireRole role="Rider"><RiderEarningsPage /></RequireRole>} />
            <Route path="/admin/users" element={<RequireRole role="Admin"><AdminUsersPage /></RequireRole>} />
            <Route path="/admin/pricing" element={<RequireRole role="Admin"><AdminPricingPage /></RequireRole>} />
            <Route path="/admin/riders" element={<RequireRole role="Admin"><AdminRidersPage /></RequireRole>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}