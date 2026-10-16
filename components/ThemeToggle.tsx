'use client'

import { useTheme } from '@/lib/theme-context'
import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

export interface ThemeToggleProps {
  className?: string
  variant?: 'icon' | 'pill'
}

const SunIcon =
  Sun ||
  function DefaultSun(props: any) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
    )
  }

const MoonIcon =
  Moon ||
  function DefaultMoon(props: any) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </svg>
    )
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
        <SunIcon className="size-4" />
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
            <SunIcon className="size-3.5 text-[#d9f447]" />
            <span>Light Mode</span>
          </>
        ) : (
          <>
            <MoonIcon className="size-3.5 text-[#18201c]" />
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
        <SunIcon className="size-4 text-[#d9f447] transition-transform duration-200 hover:rotate-45" />
      ) : (
        <MoonIcon className="size-4 text-[#18201c] transition-transform duration-200 hover:-rotate-12" />
      )}
    </button>
  )
}
