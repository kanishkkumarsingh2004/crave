/**
 * Dictionary index — language registry
 * ─────────────────────────────────────────────────────────────
 * HOW TO ADD A NEW LANGUAGE
 * ─────────────────────────────────────────────────────────────
 * 1. Create `dictionary/<code>.ts`  (e.g. dictionary/hi.ts)
 *    and implement every key from the `Dictionary` type exported
 *    by en.ts.  The meta.languageCode must match the file name.
 *
 * 2. Import the new file here and add it to `dictionaries` and
 *    `SUPPORTED_LANGUAGES`.
 *
 * 3. Add the language code to the `SupportedLocale` union.
 *
 * 4. Run `pnpm build` to confirm type coverage — TypeScript will
 *    error on any missing keys because kn.ts is typed as `Dictionary`.
 * ─────────────────────────────────────────────────────────────
 */

import type { Dictionary } from './en'
import en from './en'
import kn from './kn'

// ── Supported locale codes ────────────────────────────────────
export type SupportedLocale = 'en' | 'kn'

export const DEFAULT_LOCALE: SupportedLocale = 'en'

// ── Language metadata shown in the switcher ───────────────────
export interface LanguageMeta {
  code: SupportedLocale
  name: string // English display name
  nativeName: string // Name in its own script
  direction: 'ltr' | 'rtl'
  flag: string // Emoji flag or abbreviation
}

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
    flag: '🇬🇧',
  },
  {
    code: 'kn',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    direction: 'ltr',
    flag: '🇮🇳',
  },
  // ── Add new languages below ──────────────────────────────────
  // {
  //   code: 'hi',
  //   name: 'Hindi',
  //   nativeName: 'हिन्दी',
  //   direction: 'ltr',
  //   flag: '🇮🇳',
  // },
]

// ── Dictionary map ────────────────────────────────────────────
const dictionaries: Record<SupportedLocale, Dictionary> = {
  en,
  kn,
  // hi, ← add new languages here
}

/**
 * Returns the full dictionary for a given locale.
 * Falls back to English for any unsupported/unknown codes.
 */
export function getDictionary(locale: string): Dictionary {
  return dictionaries[locale as SupportedLocale] ?? en
}

/**
 * Returns whether a locale string is a supported locale.
 */
export function isSupportedLocale(locale: string): locale is SupportedLocale {
  return locale in dictionaries
}

export type { Dictionary }
export { en, kn }
export default dictionaries
