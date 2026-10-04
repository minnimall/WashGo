import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,                            // ส่ง cookie ไปกับ request
  headers: { 'X-Requested-With': 'XMLHttpRequest' }, // ต้องมีตามที่ backend บังคับ
})

// ถ้า cookie หมดอายุกลางทาง (API ตอบ 401) ให้แจ้งแอปให้กลับไปหน้า login
api.interceptors.response.use(
    (res) => res,
    (err) => {
        const url = err.config?.url ?? ''
        if (err.response?.status === 401 && !url.startsWith('/auth/')) {
        window.dispatchEvent(new Event('auth-expired'))
        }
        return Promise.reject(err)
    },
)

export default api