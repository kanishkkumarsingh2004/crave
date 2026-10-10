'use client'

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
      className={`w-full ${minHeight} flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300`}
    >
      <div className="relative flex items-center justify-center">
        {/* Ambient Radial Neon Glow */}
        <div className="absolute size-36 rounded-full bg-[#d9f447]/15 blur-2xl animate-pulse" />

        {/* Pulsing Outer Rings */}
        <div
          className="absolute size-24 rounded-full border border-[#d9f447]/20 animate-ping opacity-30"
          style={{ animationDuration: '2s' }}
        />
        <div className="absolute size-20 rounded-full border border-[#d9f447]/30 animate-pulse" />

        {/* Central Brand Spinner Container */}
        <div className="relative size-16 rounded-2xl bg-[#121815] border border-[#27342d] shadow-2xl flex items-center justify-center overflow-hidden">
          {/* Rotating Perimeter Line */}
          <div
            className="absolute inset-0 border-2 border-transparent border-t-[#d9f447] border-l-[#d9f447]/60 rounded-2xl animate-spin"
            style={{ animationDuration: '1.2s' }}
          />

          {/* Crave Dot Icon */}
          <div className="size-4 rounded-full bg-[#d9f447] shadow-[0_0_12px_#d9f447] animate-pulse" />
        </div>
      </div>

      {/* Modern Shimmering Typography */}
      <div className="mt-6 max-w-xs space-y-1">
        <h4 className="text-sm font-black uppercase tracking-wider text-[#18201c] dark:text-white flex items-center justify-center gap-1.5">
          {title}
        </h4>
        <p className="text-xs text-[#5f7466] dark:text-[#9eb3a4] font-medium leading-relaxed">
          {subtitle}
        </p>
      </div>

      {/* Modern Slim Shimmer Progress Bar */}
      <div className="mt-5 w-36 h-1 rounded-full bg-[#eaefe5] dark:bg-[#25332a] overflow-hidden relative">
        <div
          className="absolute inset-y-0 w-1/2 rounded-full bg-[#d9f447] shadow-[0_0_8px_#d9f447]"
          style={{
            animation: 'craveShimmer 1.4s ease-in-out infinite alternate',
          }}
        />
      </div>
    </div>
  )
}
