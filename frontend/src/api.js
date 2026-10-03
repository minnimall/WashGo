import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,                            // ส่ง cookie ไปกับ request
  headers: { 'X-Requested-With': 'XMLHttpRequest' }, // ต้องมีตามที่ backend บังคับ
})

export default api