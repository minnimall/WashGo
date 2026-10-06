import { useRef, useState } from 'react'
import { errorText, resizeImage } from '../utils'
import { btn, ui } from '../ui'

// เลือก/ถ่ายรูป → ย่อในเบราว์เซอร์ → ส่งขึ้นเซิร์ฟเวอร์ผ่าน onUpload(file)
export default function PhotoUpload({ label, onUpload, disabled }) {
    const input = useRef(null)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')

    const pick = async (e) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file) return
        setError('')
        setBusy(true)
        try {
        const blob = await resizeImage(file)
        await onUpload(new File([blob], 'photo.jpg', { type: 'image/jpeg' }))
        } catch (err) {
        setError(err.response ? errorText(err) : 'อ่านรูปไม่ได้ กรุณาใช้ไฟล์ JPG หรือ PNG')
        } finally {
        setBusy(false)
        }
    }

    return (
        <div>
        <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={pick} />
        <button
            type="button"
            className={btn('default', 'sm')}
            disabled={busy || disabled}
            onClick={() => input.current.click()}
        >
            {busy ? 'กำลังอัปโหลด...' : `📷 ${label}`}
        </button>
        {error && <div className={ui.error}>{error}</div>}
        </div>
    )
}