import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { errorText, resizeImage } from '../utils'
import { btn, ui } from '../ui'

const MAX_MB = 6

// 1234567890123 -> 1-2345-67890-12-3
const formatNationalId = (d) =>
  [d.slice(0, 1), d.slice(1, 5), d.slice(5, 10), d.slice(10, 12), d.slice(12, 13)]
    .filter(Boolean)
    .join('-')

// สูตรตรวจหลักที่ 13 ของบัตรประชาชนไทย
const isValidThaiId = (d) => {
  if (!/^\d{13}$/.test(d)) return false
  let sum = 0
  for (let i = 0; i < 12; i++) sum += Number(d[i]) * (13 - i)
  return (11 - (sum % 11)) % 10 === Number(d[12])
}

const sizeText = (bytes) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : `${Math.round(bytes / 1024)} KB`

function PhotoSlot({ label, hint, file, hasExisting, onPick }) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])

  return (
    <div className="mb-5 last:mb-0">
      <label className={ui.label}>{label}</label>
      <div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-300 bg-gray-50">
        {url ? (
          <img src={url} alt={label} className="h-full w-full object-contain" />
        ) : (
          <span className="px-4 text-center text-sm text-gray-400">
            {hasExisting ? 'มีรูปเดิมอยู่แล้ว (ไม่เลือกใหม่ก็ได้)' : 'ยังไม่ได้เลือกรูป'}
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <label className={`${btn('default', 'sm')}`}>
          {file || hasExisting ? 'เปลี่ยนรูป' : 'เลือกรูป'}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPick} />
        </label>
        {file && <span className="text-xs text-green-700">✓ {sizeText(file.size)}</span>}
      </div>
      <p className={`${ui.muted} mt-1`}>{hint}</p>
    </div>
  )
}

export default function RiderVerificationPage() {
  const navigate = useNavigate()
  const [me, setMe] = useState(null)
  const [form, setForm] = useState({
    legalName: '', nationalId: '', promptPayId: '',
    vehicleType: 'มอเตอร์ไซค์', vehicleModel: '', plate: '',
  })
  const [idCard, setIdCard] = useState(null)
  const [selfie, setSelfie] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.get('/rider/me')
      .then((res) => {
        const m = res.data
        // ส่งได้เฉพาะตอนยังไม่เคยส่งหรือถูกปฏิเสธ
        if (m.status !== 'Registered' && m.status !== 'Rejected') {
          navigate('/rider', { replace: true })
          return
        }
        setMe(m)
        setForm((f) => ({ ...f, legalName: m.legalName || '' }))
      })
      .catch((err) => setError(errorText(err)))
  }, [navigate])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const setNationalId = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 13)
    setForm((f) => ({ ...f, nationalId: digits }))
  }

  const pickFile = (setter) => async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    try {
      const blob = await resizeImage(file)
      if (blob.size > MAX_MB * 1024 * 1024) {
        setError(`รูปใหญ่เกิน ${MAX_MB} MB แม้ย่อแล้ว กรุณาเลือกรูปอื่น`)
        return
      }
      setter(new File([blob], 'photo.jpg', { type: 'image/jpeg' }))
    } catch {
      setError('อ่านรูปไม่ได้ กรุณาใช้ไฟล์ JPG, PNG หรือ WebP')
    }
  }

  const idValid = isValidThaiId(form.nationalId)

  const submit = async (e) => {
    e.preventDefault()
    setError('')

    if (!idValid) {
      setError('เลขบัตรประชาชนไม่ถูกต้อง (ต้อง 13 หลักและผ่านการตรวจหลักสุดท้าย)')
      return
    }
    if ((!idCard && !me.hasIdCard) || (!selfie && !me.hasSelfie)) {
      setError('กรุณาแนบรูปบัตรประชาชนและรูปถ่ายคู่บัตรให้ครบ')
      return
    }

    setBusy(true)
    try {
      const vehicle = `${form.vehicleType.trim()} ${form.vehicleModel.trim()} ทะเบียน ${form.plate.trim()}`
      const fd = new FormData()
      fd.append('legalName', form.legalName.trim())
      fd.append('nationalId', form.nationalId)               // ส่งเฉพาะตัวเลข
      fd.append('vehicle', vehicle)
      if (form.promptPayId.trim()) fd.append('promptPayId', form.promptPayId.replace(/\D/g, ''))
      if (idCard) fd.append('idCard', idCard)
      if (selfie) fd.append('selfie', selfie)

      await api.post('/rider/verification', fd)
      navigate('/rider')
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  if (!me) {
    return error ? <div className={ui.error}>{error}</div> : <p className={ui.muted}>กำลังโหลด...</p>
  }

  return (
    <form onSubmit={submit}>
      <h1 className={ui.h1}>ส่งเอกสารยืนยันตัวตน</h1>
      {me.status === 'Rejected' && me.rejectReason && (
        <div className={ui.error}>ครั้งก่อนถูกปฏิเสธเพราะ: {me.rejectReason}</div>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-2">
        {/* ซ้าย: ข้อมูล */}
        <div className={ui.card}>
          <h2 className={ui.h2}>ข้อมูลส่วนตัว</h2>

          <div className={ui.field}>
            <label className={ui.label}>ชื่อ-นามสกุลตามบัตรประชาชน *</label>
            <input className={ui.input} type="text" maxLength={100} required
              value={form.legalName} onChange={set('legalName')} />
          </div>

          <div className={ui.field}>
            <label className={ui.label}>เลขบัตรประชาชน 13 หลัก *</label>
            <input className={ui.input} type="text" inputMode="numeric" autoComplete="off"
              placeholder="X-XXXX-XXXXX-XX-X" required
              value={formatNationalId(form.nationalId)} onChange={setNationalId} />
            {form.nationalId.length === 13 && (
              <p className={`mt-1 text-xs ${idValid ? 'text-green-600' : 'text-red-600'}`}>
                {idValid ? '✓ เลขบัตรถูกต้อง' : '✗ เลขบัตรไม่ผ่านการตรวจหลักสุดท้าย'}
              </p>
            )}
          </div>

          <h2 className={`${ui.h2} mt-6`}>พาหนะ</h2>
          {me.vehicle && <p className={`${ui.muted} mb-3`}>ข้อมูลเดิม: {me.vehicle}</p>}

          <div className={ui.field}>
            <label className={ui.label}>ประเภทรถ *</label>
            <select className={ui.input} value={form.vehicleType} onChange={set('vehicleType')} required>
              <option>มอเตอร์ไซค์</option>
              <option>รถยนต์</option>
              <option>รถตู้/กระบะ</option>
            </select>
          </div>
          <div className={ui.field}>
            <label className={ui.label}>ยี่ห้อ / รุ่นรถ * (เช่น Honda PCX 160)</label>
            <input className={ui.input} type="text" maxLength={40} required
              value={form.vehicleModel} onChange={set('vehicleModel')} />
          </div>
          <div className={ui.field}>
            <label className={ui.label}>เลขทะเบียน * (เช่น 1กก 1234 กรุงเทพ)</label>
            <input className={ui.input} type="text" maxLength={15} required
              value={form.plate} onChange={set('plate')} />
          </div>

          <h2 className={`${ui.h2} mt-6`}>รับเงิน</h2>
          <div>
            <label className={ui.label}>PromptPay (เบอร์โทร 10 หลัก หรือเลขบัตร 13 หลัก ไม่บังคับ)</label>
            <input className={ui.input} type="text" inputMode="numeric" autoComplete="off" maxLength={17}
              value={form.promptPayId} onChange={set('promptPayId')} />
          </div>
        </div>

        {/* ขวา: รูปถ่าย */}
        <div className={ui.card}>
          <h2 className={ui.h2}>รูปถ่าย</h2>
          <p className={`${ui.muted} mb-4`}>
            ไฟล์ JPG / PNG / WebP ขนาดไม่เกิน {MAX_MB} MB ต่อรูป ระบบย่อรูปให้อัตโนมัติก่อนส่ง
          </p>

          <PhotoSlot
            label="รูปบัตรประชาชน (ด้านหน้า) *"
            hint="ถ่ายให้เห็นข้อความและเลขบัตรชัดเจน ไม่สะท้อนแสง"
            file={idCard} hasExisting={me.hasIdCard} onPick={pickFile(setIdCard)} />
          <PhotoSlot
            label="รูปถ่ายคู่บัตรประชาชน *"
            hint="ถือบัตรข้างใบหน้า เห็นหน้าและบัตรในรูปเดียวกัน"
            file={selfie} hasExisting={me.hasSelfie} onPick={pickFile(setSelfie)} />

          <p className={`${ui.muted} mt-4`}>
            เอกสารเก็บแบบไม่เปิดสาธารณะ มีเฉพาะ Admin ที่ตรวจสอบเท่านั้นที่เปิดดูได้ (ระบบบันทึกทุกครั้งที่เปิดดู)
          </p>
        </div>
      </div>

      {error && <div className={ui.error}>{error}</div>}
      <button type="submit" className={`${btn('primary')} mt-2 w-full sm:w-auto`} disabled={busy}>
        {busy ? 'กำลังส่ง...' : 'ส่งให้ Admin ตรวจสอบ'}
      </button>
    </form>
  )
}