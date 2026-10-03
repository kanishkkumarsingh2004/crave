import React from 'react'

interface CraveLogoProps {
  className?: string
  variant?: 'full' | 'small' // 'full' = crave. | 'small' = c.
  theme?: 'dark' | 'light' // dark text vs light/white text
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export default function CraveLogo({
  className = '',
  variant = 'full',
  theme = 'dark',
  size = 'md',
}: CraveLogoProps) {
  const textColor = theme === 'light' ? 'text-white' : 'text-[#18201c]'
  const dotColor = theme === 'light' ? 'bg-[#d9f447]' : 'bg-[#849e16]'

  const sizeStyles = {
    sm: { text: 'text-lg font-black tracking-tight', dot: 'size-1.5 ml-[1px]' },
    md: { text: 'text-2xl font-black tracking-tight', dot: 'size-2 ml-[1.5px]' },
    lg: { text: 'text-3xl font-black tracking-tight', dot: 'size-2.5 ml-[2px]' },
    xl: { text: 'text-4xl font-black tracking-tight', dot: 'size-3 ml-[2px]' },
  }[size]

  return (
    <span
      className={`inline-flex items-baseline select-none ${textColor} ${className}`}
      aria-label="crave. logo"
    >
      <span className={sizeStyles.text}>
        {variant === 'small' ? 'c' : 'crave'}
      </span>
      {/* Square full stop period placed immediately after 'e' at baseline */}
      <span
        className={`inline-block shrink-0 rounded-[1px] ${dotColor} ${sizeStyles.dot}`}
        aria-hidden="true"
      />
    </span>
  )
}
