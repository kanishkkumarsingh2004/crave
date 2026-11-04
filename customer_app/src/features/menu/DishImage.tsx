import { useState } from 'react'

interface DishImageProps {
  src?: string
  name: string
}

export function DishImage({ src, name }: DishImageProps) {
  const [failed, setFailed] = useState(false)
  const hasImage = Boolean(src && !failed)

  return (
    <div className={`dish-image${hasImage ? '' : ' dish-image-placeholder'}`}>
      {hasImage ? (
        <img src={src} alt={`${name} dish`} loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <svg
          className="dish-placeholder"
          viewBox="0 0 48 48"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="24" cy="24" r="9" />
          <path d="M9 7v11a3 3 0 0 0 6 0V7" />
          <path d="M12 18v23" />
          <path d="M39 7c-2.6 3-2.6 13 0 15v19" />
        </svg>
      )}
    </div>
  )
}