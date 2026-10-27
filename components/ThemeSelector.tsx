'use client'

import { Theme, useTheme } from '@/lib/theme-context'
import { CheckCircle2, Monitor, Moon, Sun } from 'lucide-react'
import React from 'react'

export interface ThemeSelectorProps {
  className?: string
  variant?: 'cards' | 'pills'
}

export default function ThemeSelector({ className = '', variant = 'cards' }: ThemeSelectorProps) {
  const { theme, setTheme } = useTheme()

  const options: Array<{
    id: Theme
    label: string
    description: string
    icon: React.ElementType
  }> = [
    {
      id: 'light',
      label: 'Light Mode',
      description: 'Clean & vibrant bright theme',
      icon: Sun,
    },
    {
      id: 'dark',
      label: 'Dark Mode',
      description: 'Sleek dark interface for low-light',
      icon: Moon,
    },
    {
      id: 'system',
      label: 'System Preference',
      description: 'Auto-sync with your device settings',
      icon: Monitor,
    },
  ]

  if (variant === 'pills') {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {options.map((opt) => {
          const Icon = opt.icon
          const isSelected = theme === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setTheme(opt.id)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#1D1D1F] text-white dark:bg-white dark:text-[#1D1D1F] shadow-xs'
                  : 'bg-stone-100 dark:bg-white/[0.06] text-stone-700 dark:text-stone-300 border border-black/[0.06] dark:border-white/[0.06] hover:bg-stone-200 dark:hover:bg-white/10'
              }`}
            >
              <Icon
                className={`size-4 ${isSelected ? 'text-white dark:text-[#1D1D1F]' : 'text-stone-500 dark:text-stone-400'}`}
              />
              <span>{opt.label}</span>
              {isSelected && <CheckCircle2 className="size-3.5 text-white dark:text-[#1D1D1F]" />}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 ${className}`}>
      {options.map((opt) => {
        const Icon = opt.icon
        const isSelected = theme === opt.id
        return (
          <div
            key={opt.id}
            onClick={() => setTheme(opt.id)}
            className={`relative flex flex-col justify-between rounded-3xl p-4 cursor-pointer border transition-all duration-200 ${
              isSelected
                ? 'border-black dark:border-white bg-white dark:bg-[#161617] text-[#1D1D1F] dark:text-white shadow-md ring-2 ring-black/10 dark:ring-white/20 scale-[1.02]'
                : 'border-black/[0.08] dark:border-white/[0.08] bg-white/70 dark:bg-[#161617] text-[#1D1D1F] dark:text-white hover:border-black/20 dark:hover:border-white/20 hover:bg-white shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className={`grid size-10 place-items-center rounded-2xl transition ${
                  isSelected
                    ? 'bg-[#1D1D1F] text-white dark:bg-white dark:text-[#1D1D1F] shadow-xs font-bold'
                    : 'bg-stone-100 dark:bg-white/10 text-stone-700 dark:text-stone-300'
                }`}
              >
                <Icon className="size-5" />
              </div>
              {isSelected ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-3 text-emerald-500" /> Active
                </span>
              ) : (
                <span className="size-4 rounded-full border border-gray-300 dark:border-[#27342d]" />
              )}
            </div>

            <div>
              <h4 className="font-extrabold text-sm tracking-tight text-[#18201c] dark:text-white">
                {opt.label}
              </h4>
              <p className="text-[11px] mt-0.5 text-gray-500 dark:text-gray-400">
                {opt.description}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
