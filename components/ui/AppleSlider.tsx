'use client'

import {
  GripVertical,
  IndianRupee,
  Navigation,
  Percent,
} from 'lucide-react'
import React, { useId } from 'react'

export interface AppleSliderProps {
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  label?: string
  unit?: string
  iconVariant?: 'percent' | 'distance' | 'currency' | 'grip'
  customThumbIcon?: React.ReactNode
  accentColor?: 'emerald' | 'lime' | 'blue' | 'purple' | 'amber'
  minLabel?: string
  maxLabel?: string
  className?: string
  disabled?: boolean
  ariaLabel?: string
}

const ACCENT_STYLES = {
  emerald: {
    fill: 'bg-gradient-to-r from-emerald-500 via-[#34c759] to-[#30d158]',
    badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    thumbIconColor: 'text-emerald-600',
    glow: 'shadow-[0_0_12px_rgba(52,199,89,0.35)]',
  },
  lime: {
    fill: 'bg-gradient-to-r from-[#8fa71c] via-[#b5de28] to-[#d9f447]',
    badgeBg: 'bg-[#d9f447]/15 text-[#6a8014] dark:text-[#d9f447] border-[#d9f447]/30',
    thumbIconColor: 'text-[#6a8014] dark:text-[#18201c]',
    glow: 'shadow-[0_0_12px_rgba(217,244,71,0.35)]',
  },
  blue: {
    fill: 'bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600',
    badgeBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    thumbIconColor: 'text-blue-600',
    glow: 'shadow-[0_0_12px_rgba(37,99,235,0.35)]',
  },
  purple: {
    fill: 'bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600',
    badgeBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    thumbIconColor: 'text-purple-600',
    glow: 'shadow-[0_0_12px_rgba(168,85,247,0.35)]',
  },
  amber: {
    fill: 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600',
    badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    thumbIconColor: 'text-amber-600',
    glow: 'shadow-[0_0_12px_rgba(245,158,11,0.35)]',
  },
}

export default function AppleSlider({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  unit = '',
  iconVariant = 'percent',
  customThumbIcon,
  accentColor = 'emerald',
  minLabel,
  maxLabel,
  className = '',
  disabled = false,
  ariaLabel,
}: AppleSliderProps) {
  const inputId = useId()
  const accent = ACCENT_STYLES[accentColor]

  // Safe percentage calculation bounded [0, 100]
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))

  function renderThumbGraphic() {
    if (customThumbIcon) return customThumbIcon

    switch (iconVariant) {
      case 'percent':
        return <Percent className={`size-3 stroke-[2.5] ${accent.thumbIconColor}`} />
      case 'distance':
        return (
          <Navigation
            className="size-3 fill-current stroke-[2] text-blue-600 -rotate-45"
          />
        )
      case 'currency':
        return <IndianRupee className="size-3 stroke-[2.5] text-amber-600" />
      case 'grip':
      default:
        return (
          <div className="flex items-center gap-0.5">
            <span className="h-2 w-0.5 rounded-full bg-gray-400 dark:bg-gray-500" />
            <span className="h-2 w-0.5 rounded-full bg-gray-400 dark:bg-gray-500" />
            <span className="h-2 w-0.5 rounded-full bg-gray-400 dark:bg-gray-500" />
          </div>
        )
    }
  }

  return (
    <div
      className={`space-y-2 select-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {/* Top Header: Label & Live Styled Graphic Value Badge */}
      {(label || value !== undefined) && (
        <div className="flex items-center justify-between font-bold text-xs sm:text-sm">
          {label && (
            <label
              htmlFor={inputId}
              className="text-gray-700 dark:text-gray-200 flex items-center gap-1.5 cursor-pointer"
            >
              <span>{label}</span>
            </label>
          )}

          <div
            className={`
              inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono text-xs font-black
              border ${accent.badgeBg} shadow-xs
            `}
          >
            <span>{value}</span>
            {unit && <span className="text-[10px] opacity-80">{unit}</span>}
          </div>
        </div>
      )}

      {/* Slider Track Container */}
      <div className="relative py-2 flex items-center">
        {/* Recessed Apple Groove Track */}
        <div className="relative w-full h-3 sm:h-3.5 rounded-full bg-[#e5e5ea] dark:bg-[#202923] border border-black/5 dark:border-white/10 shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.12)] overflow-hidden">
          {/* Active Gradient Fill with Smooth Glow */}
          <div
            className={`h-full rounded-full transition-[width] duration-75 ${accent.fill} ${accent.glow}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Glossy Apple Tactile Thumb */}
        <div
          className="pointer-events-none absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-[left] duration-75"
          style={{ left: `${pct}%` }}
        >
          <div
            className={`
              grid size-7 sm:size-7.5 place-items-center rounded-full bg-white dark:bg-white
              border border-black/10 dark:border-white/20
              shadow-[0_3px_8px_rgba(0,0,0,0.22),0_1px_2px_rgba(0,0,0,0.1)]
              transition-transform duration-150 active:scale-110
            `}
          >
            {renderThumbGraphic()}
          </div>
        </div>

        {/* Native Transparent Slider for 100% Touch, Keyboard & Mouse Accessibility */}
        <input
          id={inputId}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          aria-label={ariaLabel || label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
        />
      </div>

      {/* Endpoint Range Guides (Min / Max) */}
      {(minLabel || maxLabel || min !== undefined) && (
        <div className="flex items-center justify-between text-[10px] font-semibold text-gray-500 dark:text-gray-400 px-0.5">
          <span>{minLabel ?? `${min}${unit}`}</span>
          <span>{maxLabel ?? `${max}${unit}`}</span>
        </div>
      )}
    </div>
  )
}
