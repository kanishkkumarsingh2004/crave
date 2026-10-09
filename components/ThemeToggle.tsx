'use client'

import { useTheme } from '@/lib/theme-context'
import { Moon, Sun } from 'lucide-react'
import React, { useEffect, useState } from 'react'

export interface ThemeToggleProps {
  className?: string
  variant?: 'icon' | 'pill'
}

export default function ThemeToggle({ className = '', variant = 'icon' }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    const next = resolvedTheme === 'dark' ? 'light' : 'dark'
    setTheme(next)
  }

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Toggle theme"
        className={`grid size-9 place-items-center rounded-xl border border-gray-200 dark:border-[#27342d] bg-white dark:bg-[#18201c] text-gray-500 opacity-60 ${className}`}
        disabled
      >
        <Sun className="size-4" />
      </button>
    )
  }

  const isDark = resolvedTheme === 'dark'

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold border transition-all duration-200 active:scale-95 ${
          isDark
            ? 'bg-[#18201c] text-[#d9f447] border-[#27342d] hover:bg-[#202b25]'
            : 'bg-white text-[#18201c] border-gray-200 hover:bg-gray-100 shadow-xs'
        } ${className}`}
      >
        {isDark ? (
          <>
            <Sun className="size-3.5 text-[#d9f447]" />
            <span>Light Mode</span>
          </>
        ) : (
          <>
            <Moon className="size-3.5 text-[#18201c]" />
            <span>Dark Mode</span>
          </>
        )}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
      className={`relative grid size-9 place-items-center rounded-xl border transition-all duration-200 active:scale-95 ${
        isDark
          ? 'border-[#27342d] bg-[#18201c] text-[#d9f447] hover:border-[#384a40] hover:bg-[#202b25] shadow-sm'
          : 'border-gray-200 bg-white text-[#18201c] hover:border-gray-300 hover:bg-gray-100 shadow-xs'
      } ${className}`}
    >
      {isDark ? (
        <Sun className="size-4 text-[#d9f447] transition-transform duration-200 hover:rotate-45" />
      ) : (
        <Moon className="size-4 text-[#18201c] transition-transform duration-200 hover:-rotate-12" />
      )}
    </button>
  )
}
