import { useEffect, useState } from 'react'

/* ย่อรูปเป็นสี่เหลี่ยมจัตุรัส 192px ในเบราว์เซอร์ก่อนอัปโหลด (ตัด EXIF และลดขนาดไฟล์) */
export async function resizeToAvatar(file, size = 192) {
    const bmp = await createImageBitmap(file)
    const side = Math.min(bmp.width, bmp.height)

    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    canvas
        .getContext('2d')
        .drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, size, size)
    bmp.close?.()

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8))
    if (!blob) throw new Error('แปลงรูปไม่สำเร็จ')
    return new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
}

export default function Avatar({ name = '', version, size = 'size-20', text = 'text-2xl', className = '' }) {
    const [failed, setFailed] = useState(false)

    useEffect(() => {
        setFailed(false)
    }, [version])

    if (version && !failed) {
        return (
            <img
                src={`/api/profile/avatar?v=${version}`}
                alt={name}
                onError={() => setFailed(true)}
                className={`${size} shrink-0 rounded-full object-cover ring-2 ring-white ${className}`}
            />
        )
    }

    return (
        <div
            className={`flex ${size} ${text} shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 font-black text-white ring-2 ring-white ${className}`}
        >
            {name.trim().charAt(0).toUpperCase() || '?'}
        </div>
    )
}