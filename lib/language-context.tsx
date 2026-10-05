'use client'

/**
 * Language Context
 * ─────────────────────────────────────────────────────────────
 * Provides the active dictionary and a setLocale() function to
 * every component in the tree.
 *
 * Persistence strategy (in priority order):
 *  1. DB  — saved on the user row via PATCH /api/user/language
 *           so the preference follows the user across devices.
 *  2. localStorage — instant restore on mount before the API
 *           round-trip, also works while logged out.
 *  3. DEFAULT_LOCALE ('en') — fallback.
 *
 * Usage:
 *   const { t, locale, setLocale } = useLanguage()
 *   <p>{t.common.loading}</p>
 */

import { DEFAULT_LOCALE, getDictionary, isSupportedLocale } from '@/dictionary'
import type { Dictionary, SupportedLocale } from '@/dictionary'
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'

// ── Context shape ─────────────────────────────────────────────

interface LanguageContextType {
  /** Active locale code, e.g. 'en' | 'kn' */
  locale: SupportedLocale
  /** Full translation dictionary for the active locale */
  t: Dictionary
  /**
   * Change the active locale.
   * - Updates state immediately (optimistic).
   * - Persists to localStorage.
   * - If `token` is provided, also persists to the DB via the API.
   */
  setLocale: (locale: SupportedLocale, token?: string | null) => Promise<void>
  /** True while the initial locale is being resolved */
  isLocaleLoading: boolean
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

// ── localStorage key ──────────────────────────────────────────

const LS_KEY = 'crave_locale'

function readStoredLocale(): SupportedLocale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE
  try {
    const stored = localStorage.getItem(LS_KEY)
    if (stored && isSupportedLocale(stored)) return stored
  } catch {
    // localStorage blocked (private browsing, etc.)
  }
  return DEFAULT_LOCALE
}

function writeStoredLocale(locale: SupportedLocale) {
  try {
    localStorage.setItem(LS_KEY, locale)
  } catch {
    // ignore
  }
}

// ── Provider ──────────────────────────────────────────────────

interface LanguageProviderProps {
  children: React.ReactNode
  /**
   * Optional server-resolved initial locale — pass the value
   * stored on the user profile so there's no flash of wrong
   * language on first load.
   */
  initialLocale?: string | null
}

export function LanguageProvider({ children, initialLocale }: LanguageProviderProps) {
  const [locale, setLocaleState] = useState<SupportedLocale>(() => {
    // Always start with server initialLocale or DEFAULT_LOCALE to match SSR during hydration
    if (initialLocale && isSupportedLocale(initialLocale)) return initialLocale
    return DEFAULT_LOCALE
  })

  const [isLocaleLoading, setIsLocaleLoading] = useState(true)

  // On mount: reconcile localStorage with any server-provided initial locale.
  useEffect(() => {
    const stored = readStoredLocale()
    const resolved = initialLocale && isSupportedLocale(initialLocale) ? initialLocale : stored

    if (resolved !== locale) {
      setLocaleState(resolved)
    }
    writeStoredLocale(resolved)
    setIsLocaleLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLocale])

  const setLocale = useCallback(async (newLocale: SupportedLocale, token?: string | null) => {
    // 1. Optimistic update — UI reacts instantly.
    setLocaleState(newLocale)
    writeStoredLocale(newLocale)

    // 2. Persist to DB if the user is authenticated.
    if (token) {
      try {
        await fetch('/api/user/language', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ locale: newLocale }),
        })
      } catch {
        // Network error — localStorage already has the value, so the
        // user won't lose their choice on this device. The next time
        // they open settings they can re-save.
        console.warn('[LanguageContext] Failed to persist locale to DB.')
      }
    }
  }, [])

  const t = getDictionary(locale)

  return (
    <LanguageContext.Provider value={{ locale, t, setLocale, isLocaleLoading }}>
      {children}
    </LanguageContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────

export function useLanguage(): LanguageContextType {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    return {
      locale: DEFAULT_LOCALE,
      t: getDictionary(DEFAULT_LOCALE),
      setLocale: async () => {},
      isLocaleLoading: false,
    }
  }
  return ctx
}
