import { useState } from 'react'
import ImageModal from './ImageModal'
import { IMAGE_LABELS, dateTime } from '../utils'
import { ui } from '../ui'

export default function PhotoGrid({ images }) {
    const [openIndex, setOpenIndex] = useState(null)

    if (!images?.length) return <p className={ui.muted}>ยังไม่มีรูป</p>

    const items = images.map((img) => ({
        src: `/api/files/order-images/${img.id}`,
        title: IMAGE_LABELS[img.type] ?? img.type,
        caption: dateTime(img.createdAt),
    }))

    return (
        <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {images.map((img, i) => {
                    const item = items[i]
                    return (
                        <button
                            key={img.id}
                            type="button"
                            onClick={() => setOpenIndex(i)}
                            className="block w-full cursor-zoom-in rounded-lg text-left text-xs text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                            <img
                                src={item.src}
                                alt={item.title}
                                loading="lazy"
                                className="aspect-square w-full rounded-lg border border-gray-200 bg-gray-100 object-cover"
                            />
                            <span className="mt-1 block font-medium">{item.title}</span>
                            <span className="text-gray-400">{item.caption}</span>
                        </button>
                    )
                })}
            </div>

            {openIndex !== null && (
                <ImageModal images={items} startIndex={openIndex} onClose={() => setOpenIndex(null)} />
            )}
        </>
    )
}