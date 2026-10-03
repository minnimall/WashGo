import { useState } from 'react'
import { AuthProvider, useAuth } from './AuthContext'

function errorText(err) {
  const d = err.response?.data
  if (!d) return 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้'
  if (d.error) return d.error
  if (Array.isArray(d.errors)) return d.errors.join(', ')
  if (d.errors) return Object.values(d.errors).flat().join(', ')
  return 'เกิดข้อผิดพลาด'
}

function AuthForm() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', phone: '', role: 'Customer',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'login') await login(form.email, form.password)
      else await register(form)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  const input = { display: 'block', width: '100%', padding: 8, marginBottom: 10 }

  return (
    <form onSubmit={submit} style={{ maxWidth: 360, margin: '48px auto' }}>
      <h2>{mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}</h2>

      {mode === 'register' && (
        <>
          <input style={input} placeholder="ชื่อ-นามสกุล" value={form.fullName} onChange={set('fullName')} required />
          <input style={input} placeholder="เบอร์โทร (ไม่บังคับ)" value={form.phone} onChange={set('phone')} />
          <select style={input} value={form.role} onChange={set('role')}>
            <option value="Customer">ลูกค้า</option>
            <option value="Rider">ไรเดอร์</option>
          </select>
        </>
      )}

      <input style={input} type="email" placeholder="อีเมล" value={form.email} onChange={set('email')} required />
      <input style={input} type="password" placeholder="รหัสผ่าน (อย่างน้อย 8 ตัว)" value={form.password} onChange={set('password')} required />

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <button type="submit" disabled={busy} style={{ padding: '8px 16px' }}>
        {busy ? 'กำลังดำเนินการ...' : mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัคร'}
      </button>

      <p>
        <a href="#" onClick={(e) => { e.preventDefault(); setError(''); setMode(mode === 'login' ? 'register' : 'login') }}>
          {mode === 'login' ? 'ยังไม่มีบัญชี? สมัครสมาชิก' : 'มีบัญชีแล้ว? เข้าสู่ระบบ'}
        </a>
      </p>
    </form>
  )
}

function Main() {
  const { user, loading, logout } = useAuth()

  if (loading) return <p style={{ padding: 24 }}>กำลังโหลด...</p>
  if (!user) return <AuthForm />

  return (
    <div style={{ padding: 24 }}>
      <h1>WashGo</h1>
      <p>สวัสดี {user.fullName} ({user.email})</p>
      <p>Role: {user.roles.join(', ')}</p>
      <button onClick={logout}>ออกจากระบบ</button>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Main />
    </AuthProvider>
  )
}