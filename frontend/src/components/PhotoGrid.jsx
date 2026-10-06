import { IMAGE_LABELS, dateTime } from '../utils'
import { ui } from '../ui'

export default function PhotoGrid({ images }) {
    if (!images?.length) return <p className={ui.muted}>ยังไม่มีรูป</p>

    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {images.map((img) => {
            const src = `/api/files/order-images/${img.id}`
            const label = IMAGE_LABELS[img.type] ?? img.type
            return (
            <a key={img.id} href={src} target="_blank" rel="noopener noreferrer" className="block text-xs text-gray-700">
                <img
                src={src}
                alt={label}
                loading="lazy"
                className="aspect-square w-full rounded-lg border border-gray-200 bg-gray-100 object-cover"
                />
                <span className="mt-1 block font-medium">{label}</span>
                <span className="text-gray-400">{dateTime(img.createdAt)}</span>
            </a>
            )
        })}
        </div>
    )
}