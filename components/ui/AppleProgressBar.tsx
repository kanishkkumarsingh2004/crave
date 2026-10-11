'use client'

import React from 'react'

export interface AppleProgressBarProps {
  value: number
  max?: number
  label?: string
  sublabel?: string
  color?: 'emerald' | 'lime' | 'amber' | 'blue' | 'purple' | 'rose'
  icon?: React.ReactNode
  showValue?: boolean
  showStripes?: boolean
  height?: 'sm' | 'md' | 'lg'
  className?: string
}

const COLOR_MAP = {
  emerald: {
    fill: 'bg-gradient-to-r from-emerald-500 to-[#34c759]',
    glow: 'shadow-[0_0_10px_rgba(52,199,89,0.3)]',
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  lime: {
    fill: 'bg-gradient-to-r from-[#8fa71c] to-[#d9f447]',
    glow: 'shadow-[0_0_10px_rgba(217,244,71,0.3)]',
    badge: 'bg-[#d9f447]/15 text-[#6a8014] dark:text-[#d9f447] border-[#d9f447]/30',
  },
  amber: {
    fill: 'bg-gradient-to-r from-amber-500 to-orange-500',
    glow: 'shadow-[0_0_10px_rgba(245,158,11,0.3)]',
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  blue: {
    fill: 'bg-gradient-to-r from-blue-500 to-indigo-600',
    glow: 'shadow-[0_0_10px_rgba(59,130,246,0.3)]',
    badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  purple: {
    fill: 'bg-gradient-to-r from-purple-500 to-pink-500',
    glow: 'shadow-[0_0_10px_rgba(168,85,247,0.3)]',
    badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  },
  rose: {
    fill: 'bg-gradient-to-r from-rose-500 to-red-500',
    glow: 'shadow-[0_0_10px_rgba(244,63,94,0.3)]',
    badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  },
}

const HEIGHT_MAP = {
  sm: 'h-2',
  md: 'h-3',
  lg: 'h-4',
}

export default function AppleProgressBar({
  value,
  max = 100,
  label,
  sublabel,
  color = 'emerald',
  icon,
  showValue = true,
  showStripes = false,
  height = 'md',
  className = '',
}: AppleProgressBarProps) {
  const percentage = Math.max(0, Math.min(100, Math.round((value / max) * 100)))
  const colorConfig = COLOR_MAP[color]

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Label and Badge Header */}
      {(label || showValue) && (
        <div className="flex items-center justify-between text-xs font-bold">
          <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-200">
            {icon && <span className="shrink-0">{icon}</span>}
            {label && <span>{label}</span>}
            {sublabel && <span className="text-[10px] font-normal text-gray-400">({sublabel})</span>}
          </div>

          {showValue && (
            <span
              className={`px-2 py-0.5 rounded-full font-mono text-[11px] font-black border ${colorConfig.badge}`}
            >
              {percentage}%
            </span>
          )}
        </div>
      )}

      {/* Progress Track */}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className={`w-full overflow-hidden rounded-full bg-[#e5e5ea] dark:bg-[#202923] border border-black/5 dark:border-white/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] ${HEIGHT_MAP[height]}`}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${colorConfig.fill} ${colorConfig.glow} ${
            showStripes ? 'bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem]' : ''
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
