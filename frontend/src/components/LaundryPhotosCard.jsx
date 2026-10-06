import { useState } from 'react'
import api from '../api'
import { dateTime, errorText, resizeImage } from '../utils'
import { btn, ui } from '../ui'

const EDITABLE = ['Pending', 'Accepted', 'GoingToPickup']
const MAX = 3

export default function LaundryPhotosCard({ orderId, status, images, onChanged }) {
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')

    const mine = (images ?? []).filter((i) => i.type === 'CustomerLaundry')
    const editable = EDITABLE.includes(status)
    if (!editable && mine.length === 0) return null

    const add = async (e) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file) return
        setError('')
        setBusy(true)
        try {
        const blob = await resizeImage(file)
        const fd = new FormData()
        fd.append('file', new File([blob], 'laundry.jpg', { type: 'image/jpeg' }))
        await api.post(`/orders/${orderId}/photos`, fd)
        await onChanged?.()
        } catch (err) {
        setError(err.response ? errorText(err) : 'อ่านรูปไม่ได้ กรุณาใช้ไฟล์ JPG หรือ PNG')
        } finally {
        setBusy(false)
        }
    }

    const remove = async (img) => {
        if (!window.confirm('ลบรูปนี้?')) return
        setError('')
        setBusy(true)
        try {
        await api.delete(`/orders/${orderId}/photos/${img.id}`)
        await onChanged?.()
        } catch (err) {
        setError(errorText(err))
        } finally {
        setBusy(false)
        }
    }

    return (
        <div className={ui.card}>
        <h2 className={ui.h2}>รูปผ้า/ตะกร้าของฉัน</h2>
        <p className={`${ui.muted} mb-3`}>
            ถ่ายรูปถุงหรือตะกร้าผ้าของคุณให้เห็นชัด เพื่อให้ Rider ยืนยันได้ว่าเป็นของคุณ (ไม่เกิน {MAX} รูป)
            รูปนี้จะเห็นเฉพาะ Rider ที่รับงานและผู้ดูแลระบบ
        </p>

        {error && <div className={ui.error}>{error}</div>}

        {mine.length > 0 && (
            <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {mine.map((img) => {
                const src = `/api/files/order-images/${img.id}`
                return (
                <div key={img.id} className="relative text-xs text-gray-500">
                    <a href={src} target="_blank" rel="noopener noreferrer">
                    <img
                        src={src}
                        alt="รูปผ้าของฉัน"
                        loading="lazy"
                        className="aspect-square w-full rounded-lg border border-gray-200 bg-gray-100 object-cover"
                    />
                    </a>
                    <span className="mt-1 block">{dateTime(img.createdAt)}</span>
                    {editable && (
                    <button
                        type="button"
                        onClick={() => remove(img)}
                        disabled={busy}
                        aria-label="ลบรูป"
                        className="absolute right-1 top-1 cursor-pointer rounded-full bg-black/60 px-2 text-sm text-white hover:bg-black/80 disabled:opacity-50"
                    >
                        ×
                    </button>
                    )}
                </div>
                )
            })}
            </div>
        )}

        {editable && mine.length < MAX && (
            <label className={`${btn('default')} ${busy ? 'pointer-events-none opacity-50' : ''}`}>
            {busy ? 'กำลังอัปโหลด...' : '📷 เพิ่มรูปผ้า'}
            <input type="file" accept="image/*" className="hidden" onChange={add} disabled={busy} />
            </label>
        )}
        </div>
    )
}