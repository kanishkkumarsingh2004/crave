interface CraveLogoProps {
  className?: string
  variant?: 'full' | 'small' | 'cravexp' // 'full' = crave. | 'small' = c. | 'cravexp' = craveXP.
  theme?: 'dark' | 'light' | 'auto' // dark text (#18201c) vs light/white text (#ffffff) vs auto (currentColor)
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export default function CraveLogo({
  className = '',
  variant = 'full',
  theme = 'auto',
  size = 'md',
}: CraveLogoProps) {
  // Theme color resolution:
  // 'light' => crisp white (#ffffff) for dark backgrounds (e.g. hero banners, dark footer)
  // 'dark'  => obsidian black (#18201c) for light backgrounds
  // 'auto'  => inherits currentColor with automatic light/dark mode support
  const craveColor = theme === 'light' ? '#ffffff' : theme === 'dark' ? '#18201c' : 'currentColor'

  const xpColor = theme === 'light' ? '#d9f447' : '#86a018'
  const dotColor = '#86a018'

  const sizeClasses = {
    sm: 'h-5 w-auto',
    md: 'h-6 sm:h-[26px] w-auto',
    lg: 'h-8 sm:h-[34px] w-auto',
    xl: 'h-10 sm:h-11 w-auto',
  }[size]

  const wrapperTextClass = theme === 'auto' ? 'text-[#18201c] dark:text-white' : ''

  if (variant === 'small') {
    return (
      <svg
        viewBox="0 0 28 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`inline-block select-none overflow-visible align-middle ${wrapperTextClass} ${sizeClasses} ${className}`}
        role="img"
        aria-label="crave logo"
      >
        <text
          x="0"
          y="24"
          fontFamily="var(--font-sans), 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontWeight="700"
          fontSize="28"
          letterSpacing="-0.035em"
          fill={craveColor}
        >
          c<tspan fill={dotColor} dx="1">.</tspan>
        </text>
      </svg>
    )
  }

  if (variant === 'cravexp') {
    return (
      <svg
        viewBox="0 0 138 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`inline-block select-none overflow-visible align-middle ${wrapperTextClass} ${sizeClasses} ${className}`}
        role="img"
        aria-label="craveXP logo"
      >
        <text
          x="0"
          y="24"
          fontFamily="var(--font-sans), 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontWeight="700"
          fontSize="28"
          letterSpacing="-0.035em"
        >
          <tspan fill={craveColor}>crave</tspan>
          <tspan fill={xpColor}>XP</tspan>
          <tspan fill={dotColor} dx="1">.</tspan>
        </text>
      </svg>
    )
  }

  // Default 'full' variant: "crave."
  return (
    <svg
      viewBox="0 0 92 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block select-none overflow-visible align-middle ${wrapperTextClass} ${sizeClasses} ${className}`}
      role="img"
      aria-label="crave logo"
    >
      <text
        x="0"
        y="24"
        fontFamily="var(--font-sans), 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontWeight="700"
        fontSize="28"
        letterSpacing="-0.035em"
        fill={craveColor}
      >
        crave<tspan fill={dotColor} dx="1">.</tspan>
      </text>
    </svg>
  )
}
