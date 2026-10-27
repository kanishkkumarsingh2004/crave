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
  title: _title = 'Loading...',
  subtitle: _subtitle,
  minHeight = 'min-h-[60vh]',
}: PagePreloaderProps) {
  return (
    <div className={`w-full ${minHeight} space-y-6 animate-pulse select-none`}>
      {/* Top Banner Skeleton */}
      <div className="h-44 sm:h-64 w-full rounded-3xl bg-stone-200/80 dark:bg-white/[0.06]" />

      {/* Row of Category Pills Skeleton */}
      <div className="flex items-center gap-3 overflow-hidden">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex flex-col items-center gap-2 shrink-0">
            <div className="size-16 rounded-full bg-stone-200/80 dark:bg-white/[0.06]" />
            <div className="h-3 w-12 rounded bg-stone-200/80 dark:bg-white/[0.06]" />
          </div>
        ))}
      </div>

      {/* Food Cards Grid Skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((card) => (
          <div
            key={card}
            className="rounded-3xl border border-stone-200/70 dark:border-white/5 bg-white dark:bg-[#131b15] p-4 space-y-3"
          >
            <div className="h-40 w-full rounded-2xl bg-stone-200/80 dark:bg-white/[0.06]" />
            <div className="h-4 w-3/4 rounded bg-stone-200/80 dark:bg-white/[0.06]" />
            <div className="h-3 w-1/2 rounded bg-stone-200/80 dark:bg-white/[0.06]" />
          </div>
        ))}
      </div>
    </div>
  )
}
