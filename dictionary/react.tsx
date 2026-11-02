/**
 * React bindings for the translation dictionary.
 *
 * The web app uses `lib/contexts/language-context.tsx`, which also talks to
 * the API to persist the choice on the user row. The mobile apps share this
 * lighter version: it reads the same `dictionary/` folder and keeps the choice
 * in localStorage.
 *
 * It is a store rather than a context so the apps do not have to wrap every
 * screen in a provider — any component can simply call `useLanguage()`.
 *
 * Usage:
 *   const { t, locale, setLocale } = useLanguage()
 *   <p>{t.customer.placeOrder}</p>
 */

import { useCallback, useSyncExternalStore } from 'react'
import { DEFAULT_LOCALE, getDictionary, isSupportedLocale, SUPPORTED_LANGUAGES } from './index'
import type { Dictionary, SupportedLocale } from './index'

const LS_KEY = 'crave_locale'

let currentLocale: SupportedLocale | null = null
const listeners = new Set<() => void>()

function readStoredLocale(): SupportedLocale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE
  try {
    const stored = localStorage.getItem(LS_KEY)
    if (stored && isSupportedLocale(stored)) return stored
  } catch {
    // localStorage can be blocked (private browsing) — fall back silently.
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

function getSnapshot(): SupportedLocale {
  if (currentLocale === null) currentLocale = readStoredLocale()
  return currentLocale
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function notify() {
  for (const listener of listeners) listener()
}

export interface LanguageState {
  /** Active locale code, e.g. 'en' | 'kn' */
  locale: SupportedLocale
  /** The full dictionary for the active locale */
  t: Dictionary
  /** Every language the dictionary ships with */
  languages: typeof SUPPORTED_LANGUAGES
  /** Change the active locale, persisting it on the device and (optionally) the account */
  setLocale: (locale: SupportedLocale, token?: string | null) => Promise<void>
}

/**
 * Change the active locale.
 *
 * Exported so the apps can set the language before they render (for example
 * from the profile returned by the API).
 */
export async function setLocale(next: SupportedLocale, token?: string | null): Promise<void> {
  currentLocale = next
  writeStoredLocale(next)
  notify()

  if (token) {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token !== 'cookie-session') headers.Authorization = `Bearer ${token}`
      await fetch('/api/user/language', {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({ locale: next }),
      })
    } catch {
      // The choice is already on the device, so it survives the failure.
      console.warn('[i18n] Could not persist the locale to the account.')
    }
  }
}

export function useLanguage(): LanguageState {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const change = useCallback(
    (next: SupportedLocale, token?: string | null) => setLocale(next, token),
    []
  )
  return {
    locale,
    t: getDictionary(locale),
    languages: SUPPORTED_LANGUAGES,
    setLocale: change,
  }
}

export { SUPPORTED_LANGUAGES, DEFAULT_LOCALE }
export type { Dictionary, SupportedLocale }
