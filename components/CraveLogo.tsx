interface CraveLogoProps {
  className?: string
  variant?: 'full' | 'small' | 'cravexp' // 'full' = crave. | 'small' = c. | 'cravexp' = craveXP.
  theme?: 'dark' | 'light' // dark text vs light/white text
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export default function CraveLogo({
  className = '',
  variant = 'full',
  theme = 'dark',
  size = 'md',
}: CraveLogoProps) {
  const textColor = theme === 'light' ? 'text-white' : 'text-[#18201c] dark:text-white'
  const dotColor = theme === 'light' ? 'bg-[#d9f447]' : 'bg-[#849e16] dark:bg-[#d9f447]'
  const xpColor = theme === 'light' ? 'text-[#d9f447]' : 'text-[#7d9518] dark:text-[#d9f447]'

  const sizeStyles = {
    sm: { text: 'text-lg font-black tracking-tight', dot: 'size-1.5 ml-[1px]' },
    md: { text: 'text-2xl font-black tracking-tight', dot: 'size-2 ml-[1.5px]' },
    lg: { text: 'text-3xl font-black tracking-tight', dot: 'size-2.5 ml-[2px]' },
    xl: { text: 'text-4xl font-black tracking-tight', dot: 'size-3 ml-[2px]' },
  }[size]

  return (
    <span
      className={`inline-flex items-baseline select-none ${textColor} ${className}`}
      aria-label={variant === 'cravexp' ? 'craveXP. logo' : 'crave. logo'}
    >
      {variant === 'small' ? (
        <span className={sizeStyles.text}>c</span>
      ) : variant === 'cravexp' ? (
        <span className={sizeStyles.text}>
          crave<span className={xpColor}>XP</span>
        </span>
      ) : (
        <span className={sizeStyles.text}>crave</span>
      )}
      {/* Square full stop period placed immediately after 'e' or 'XP' at baseline */}
      <span
        className={`inline-block shrink-0 rounded-[1px] ${dotColor} ${sizeStyles.dot}`}
        aria-hidden="true"
      />
    </span>
  )
}
