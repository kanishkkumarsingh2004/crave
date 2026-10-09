'use client'

import { Theme, useTheme } from '@/lib/theme-context'
import { CheckCircle2, Monitor, Moon, Sun } from 'lucide-react'
import React from 'react'

export interface ThemeSelectorProps {
  className?: string
  variant?: 'cards' | 'pills'
}

export default function ThemeSelector({ className = '', variant = 'cards' }: ThemeSelectorProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()

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
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                isSelected
                  ? 'bg-[#d9f447] text-[#121815] shadow-xs ring-2 ring-[#86a018]/40 dark:ring-[#d9f447]/60'
                  : 'bg-white dark:bg-[#18201c] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[#27342d] hover:bg-gray-50 dark:hover:bg-[#202923]'
              }`}
            >
              <Icon
                className={`size-4 ${isSelected ? 'text-[#121815]' : 'text-gray-500 dark:text-gray-400'}`}
              />
              <span>{opt.label}</span>
              {isSelected && (
                <CheckCircle2 className="size-3.5 text-[#121815]" />
              )}
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
            className={`relative flex flex-col justify-between rounded-2xl p-4 cursor-pointer border transition-all duration-200 ${
              isSelected
                ? 'border-[#86a018] dark:border-[#d9f447] bg-white dark:bg-[#141d18] text-[#18201c] dark:text-white shadow-md ring-2 ring-[#86a018]/30 dark:ring-[#d9f447]/60 scale-[1.02]'
                : 'border-gray-200 dark:border-[#27342d] bg-white/70 dark:bg-[#18201c] text-[#18201c] dark:text-white hover:border-gray-300 dark:hover:border-[#384a40] hover:bg-white dark:hover:bg-[#202923] shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className={`grid size-10 place-items-center rounded-xl transition ${
                  isSelected
                    ? 'bg-[#d9f447] text-[#121815] shadow-xs font-bold'
                    : 'bg-gray-100 dark:bg-[#121815] text-gray-700 dark:text-gray-300 border border-transparent dark:border-[#27342d]'
                }`}
              >
                <Icon className="size-5" />
              </div>
              {isSelected ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#d9f447] px-2.5 py-0.5 text-[10px] font-black uppercase text-[#121815] shadow-xs">
                  <CheckCircle2 className="size-3 text-[#121815]" /> Active
                </span>
              ) : (
                <span className="size-4 rounded-full border border-gray-300 dark:border-[#27342d]" />
              )}
            </div>

            <div>
              <h4 className="font-extrabold text-sm tracking-tight text-[#18201c] dark:text-white">{opt.label}</h4>
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
