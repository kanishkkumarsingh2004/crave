'use client'

import CraveLogo from '@/components/CraveLogo'

interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'crave' | 'white' | 'dark' | 'emerald'
  className?: string
}

export function CraveSpinner({ size = 'md', variant = 'crave', className = '' }: SpinnerProps) {
  const sizeMap = {
    xs: 'size-3.5',
    sm: 'size-4',
    md: 'size-5',
    lg: 'size-7',
    xl: 'size-10',
  }

  const borderSizeMap = {
    xs: 'border-[1.5px]',
    sm: 'border-2',
    md: 'border-2',
    lg: 'border-[2.5px]',
    xl: 'border-3',
  }

  const variantColors = {
    crave: {
      track: 'border-[#d9f447]/20',
      spin: 'border-t-[#d9f447] border-r-[#d9f447]',
      glow: 'shadow-[0_0_12px_rgba(217,244,71,0.4)]',
    },
    white: {
      track: 'border-white/20',
      spin: 'border-t-white border-r-white',
      glow: 'shadow-[0_0_10px_rgba(255,255,255,0.3)]',
    },
    dark: {
      track: 'border-[#121815]/20',
      spin: 'border-t-[#121815] border-r-[#121815]',
      glow: 'shadow-[0_0_8px_rgba(18,24,21,0.2)]',
    },
    emerald: {
      track: 'border-emerald-500/20',
      spin: 'border-t-emerald-400 border-r-emerald-400',
      glow: 'shadow-[0_0_12px_rgba(52,211,153,0.4)]',
    },
  }

  const currentVariant = variantColors[variant] || variantColors.crave

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${sizeMap[size]} ${className}`}
    >
      {/* Outer Glow Halo */}
      <div
        className={`absolute inset-0 rounded-full ${currentVariant.glow} opacity-60 animate-pulse`}
      />
      {/* Background Track */}
      <div
        className={`absolute inset-0 rounded-full ${borderSizeMap[size]} ${currentVariant.track}`}
      />
      {/* High-speed Rotating Arc */}
      <div
        className={`absolute inset-0 rounded-full ${borderSizeMap[size]} border-transparent ${currentVariant.spin} animate-spin`}
        style={{ animationDuration: '0.75s' }}
      />
      {/* Subtle Inner Counter-Rotating Accent */}
      <div
        className="absolute inset-[25%] rounded-full opacity-40 bg-current animate-ping"
        style={{ animationDuration: '1.5s' }}
      />
    </div>
  )
}

interface ButtonLoaderProps {
  label: string
  sublabel?: string
  variant?: 'crave' | 'white' | 'dark' | 'emerald'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function CraveButtonLoader({
  label,
  sublabel,
  variant = 'dark',
  size = 'md',
  className = '',
}: ButtonLoaderProps) {
  return (
    <div
      className={`inline-flex items-center justify-center gap-2.5 font-bold tracking-tight select-none ${className}`}
    >
      <CraveSpinner size={size === 'sm' ? 'xs' : size === 'lg' ? 'md' : 'sm'} variant={variant} />
      <div className="flex flex-col text-left">
        <span className="animate-pulse flex items-center gap-1">{label}</span>
        {sublabel && (
          <span className="text-[10px] font-normal opacity-70 tracking-normal leading-tight">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  )
}

interface PagePreloaderProps {
  title?: string
  subtitle?: string
  minHeight?: string
}

export function CravePagePreloader({
  title = 'Loading crave...',
  subtitle = 'Fetching freshest menus & live stores',
  minHeight = 'min-h-[60vh]',
}: PagePreloaderProps) {
  return (
    <div
      className={`w-full ${minHeight} flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300 relative select-none`}
    >
      <div className="relative flex items-center justify-center">
        {/* Ambient Radial Neon Aura */}
        <div className="absolute size-44 rounded-full bg-[#d9f447]/15 blur-3xl animate-pulse" />

        {/* Outer Orbital Glowing Track */}
        <div className="relative size-24 flex items-center justify-center">
          {/* Subtle Outer Boundary Ring */}
          <div className="absolute inset-0 rounded-3xl border border-black/5 dark:border-white/10" />

          {/* High-Precision Rotating Neon Orbit SVG */}
          <svg
            className="absolute inset-0 size-full animate-spin"
            viewBox="0 0 96 96"
            style={{ animationDuration: '2.2s' }}
          >
            <circle
              cx="48"
              cy="48"
              r="42"
              stroke="currentColor"
              strokeWidth="2"
              className="text-black/[0.04] dark:text-white/[0.06] fill-none"
            />
            <circle
              cx="48"
              cy="48"
              r="42"
              stroke="#d9f447"
              strokeWidth="2.5"
              strokeDasharray="60 200"
              strokeLinecap="round"
              className="fill-none drop-shadow-[0_0_10px_#d9f447]"
            />
          </svg>

          {/* Central Frosted Glass Emblem */}
          <div className="relative size-16 rounded-2xl bg-white/90 dark:bg-[#121815]/90 border border-black/10 dark:border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_48px_rgba(0,0,0,0.6)] backdrop-blur-2xl flex items-center justify-center overflow-hidden">
            <CraveLogo variant="small" size="lg" className="relative z-10 transition-transform" />
          </div>
        </div>
      </div>

      {/* Modern Shimmering Brand Typography */}
      <div className="mt-6 max-w-sm space-y-1.5 px-4">
        <h4 className="text-sm sm:text-base font-black tracking-tight text-[#18201c] dark:text-white flex items-center justify-center gap-2">
          <span>{title}</span>
        </h4>
        <p className="text-xs text-stone-500 dark:text-stone-400 font-medium leading-relaxed">
          {subtitle}
        </p>
      </div>

      {/* Modern High-End Shimmer Progress Bar */}
      <div className="mt-5 w-40 sm:w-48 h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden relative backdrop-blur-md">
        <div
          className="absolute inset-y-0 w-2/5 rounded-full bg-gradient-to-r from-transparent via-[#d9f447] to-[#d9f447] shadow-[0_0_10px_#d9f447]"
          style={{
            animation: 'craveShimmer 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite',
          }}
        />
      </div>
    </div>
  )
}

