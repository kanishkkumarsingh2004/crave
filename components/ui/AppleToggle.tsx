'use client'

import {
  Bell,
  BellOff,
  Check,
  CloudRain,
  Lock,
  Moon,
  Power,
  ShieldAlert,
  ShieldCheck,
  Truck,
  Unlock,
  Volume2,
  VolumeX,
} from 'lucide-react'
import React from 'react'

export interface AppleToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  activeColor?: string
  iconVariant?:
    | 'check'
    | 'power'
    | 'rain'
    | 'moon'
    | 'sound'
    | 'shield'
    | 'lock'
    | 'bell'
    | 'truck'
    | 'none'
  customActiveIcon?: React.ReactNode
  customInactiveIcon?: React.ReactNode
  showTrackGlyphs?: boolean
  className?: string
  ariaLabel?: string
}

export default function AppleToggle({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  activeColor = 'bg-[#34c759]',
  iconVariant = 'check',
  customActiveIcon,
  customInactiveIcon,
  showTrackGlyphs = true,
  className = '',
  ariaLabel,
}: AppleToggleProps) {
  // Size configurations matching Apple's Human Interface Guidelines
  const sizeConfig = {
    sm: {
      track: 'w-[44px] h-[26px]',
      thumb: 'size-[22px]',
      translate: 'translate-x-[18px]',
      glyphLeft: 'left-2 text-[9px]',
      glyphRight: 'right-2 text-[9px]',
    },
    md: {
      track: 'w-[52px] h-[32px]',
      thumb: 'size-[26px]',
      translate: 'translate-x-5',
      glyphLeft: 'left-2.5 text-[10px]',
      glyphRight: 'right-2.5 text-[10px]',
    },
    lg: {
      track: 'w-[60px] h-[36px]',
      thumb: 'size-[30px]',
      translate: 'translate-x-6',
      glyphLeft: 'left-3 text-xs',
      glyphRight: 'right-3 text-xs',
    },
  }[size]

  // Render graphic inside the thumb based on variant
  function renderThumbGraphic() {
    if (customActiveIcon && checked) return customActiveIcon
    if (customInactiveIcon && !checked) return customInactiveIcon

    switch (iconVariant) {
      case 'check':
        return checked ? (
          <Check className="size-3.5 stroke-[3] text-[#34c759] transition-transform duration-200" />
        ) : (
          <span className="size-1.5 rounded-full bg-gray-400 transition-colors" />
        )

      case 'power':
        return checked ? (
          <Power className="size-3 stroke-[2.5] text-amber-600 transition-transform duration-200" />
        ) : (
          <Power className="size-3 stroke-[2] text-gray-400 transition-colors" />
        )

      case 'rain':
        return checked ? (
          <CloudRain className="size-3.5 text-blue-600 stroke-[2.5] transition-transform duration-200" />
        ) : (
          <span className="size-1.5 rounded-full bg-gray-400 transition-colors" />
        )

      case 'moon':
        return checked ? (
          <Moon className="size-3 text-purple-600 fill-purple-600/30 stroke-[2] transition-transform duration-200" />
        ) : (
          <span className="size-1.5 rounded-full bg-gray-400 transition-colors" />
        )

      case 'sound':
        return checked ? (
          <Volume2 className="size-3.5 text-emerald-600 stroke-[2.5] transition-transform duration-200" />
        ) : (
          <VolumeX className="size-3 text-gray-400 transition-colors" />
        )

      case 'shield':
        return checked ? (
          <ShieldCheck className="size-3.5 text-blue-600 stroke-[2.5] transition-transform duration-200" />
        ) : (
          <ShieldAlert className="size-3 text-gray-400 transition-colors" />
        )

      case 'lock':
        return checked ? (
          <Lock className="size-3 text-blue-600 stroke-[2.5] transition-transform duration-200" />
        ) : (
          <Unlock className="size-3 text-gray-400 transition-colors" />
        )

      case 'bell':
        return checked ? (
          <Bell className="size-3.5 text-purple-600 stroke-[2.5] transition-transform duration-200" />
        ) : (
          <BellOff className="size-3 text-gray-400 transition-colors" />
        )

      case 'truck':
        return checked ? (
          <Truck className="size-3.5 text-blue-600 stroke-[2.5] transition-transform duration-200" />
        ) : (
          <span className="size-1.5 rounded-full bg-gray-400 transition-colors" />
        )

      case 'none':
      default:
        return null
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`
        relative inline-flex items-center shrink-0 cursor-pointer rounded-full p-0.5
        transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[#34c759]/50
        select-none active:scale-95
        ${sizeConfig.track}
        ${
          checked
            ? `${activeColor} shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)]`
            : 'bg-[#e5e5ea] dark:bg-[#39393d] border border-black/5 dark:border-white/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed active:scale-100' : ''}
        ${className}
      `}
    >
      {/* Subtle Inset Track Glyphs (Apple Accessibility On/Off markers) */}
      {showTrackGlyphs && (
        <>
          <span
            className={`pointer-events-none absolute font-black select-none text-white transition-opacity duration-200 ${sizeConfig.glyphLeft} ${
              checked ? 'opacity-70' : 'opacity-0'
            }`}
          >
            |
          </span>
          <span
            className={`pointer-events-none absolute font-bold select-none text-gray-400 dark:text-gray-500 transition-opacity duration-200 ${sizeConfig.glyphRight} ${
              checked ? 'opacity-0' : 'opacity-70'
            }`}
          >
            ○
          </span>
        </>
      )}

      {/* Glossy White Tactile Thumb */}
      <span
        aria-hidden="true"
        className={`
          pointer-events-none grid place-items-center rounded-full bg-white dark:bg-white
          shadow-[0_3px_8px_rgba(0,0,0,0.18),0_1px_2px_rgba(0,0,0,0.08)]
          transform transition-all duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)]
          ${sizeConfig.thumb}
          ${checked ? sizeConfig.translate : 'translate-x-0'}
        `}
      >
        {renderThumbGraphic()}
      </span>
    </button>
  )
}
