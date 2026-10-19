import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { StatusBar, Style } from '@capacitor/status-bar'

export type ThemeMode = 'light' | 'dark' | 'system'
type ResolvedTheme = Exclude<ThemeMode, 'system'>

export const THEME_DICTIONARY: Record<ResolvedTheme, Record<string, string>> = {
  light: {
    '--app-bg': '#f7f7f2',
    '--surface': '#ffffff',
    '--surface-2': '#f1f4ed',
    '--surface-3': '#e7ece5',
    '--ink': '#101712',
    '--muted': '#6f776f',
    '--line': '#dfe3dc',
    '--input-bg': '#ffffff',
    '--input-text': '#101712',
    '--chrome-bg': 'rgb(255 255 255 / 94%)',
    '--overlay-bg': 'rgb(6 16 9 / 60%)',
    '--on-accent': '#172014',
    '--success': '#267448',
    '--danger': '#b33a43',
    '--shadow-color': 'rgb(17 32 25 / 13%)',
  },
  dark: {
    '--app-bg': '#07100b',
    '--surface': '#111a15',
    '--surface-2': '#17231c',
    '--surface-3': '#202e25',
    '--ink': '#f5f8f5',
    '--muted': '#8c9a90',
    '--line': '#29372f',
    '--input-bg': '#0b140f',
    '--input-text': '#f5f8f5',
    '--chrome-bg': 'rgb(8 17 12 / 94%)',
    '--overlay-bg': 'rgb(2 7 4 / 78%)',
    '--on-accent': '#172014',
    '--success': '#73dda2',
    '--danger': '#ff8995',
    '--shadow-color': 'rgb(0 0 0 / 38%)',
  },
}

const KEY = 'crave_customer_theme'

export function applyTheme(mode: ThemeMode) {
  const resolved =
    mode === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : mode
  document.documentElement.dataset.theme = resolved
  document.documentElement.dataset.themeMode = mode
  document.documentElement.style.colorScheme = resolved
  for (const [token, value] of Object.entries(THEME_DICTIONARY[resolved])) {
    document.documentElement.style.setProperty(token, value)
  }
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_DICTIONARY[resolved]['--app-bg'])
  if (Capacitor.isNativePlatform()) {
    void StatusBar.setStyle({ style: resolved === 'dark' ? Style.Light : Style.Dark }).catch(
      () => undefined
    )
    void StatusBar.setBackgroundColor({
      color: THEME_DICTIONARY[resolved]['--app-bg'],
    }).catch(() => undefined)
  }
}

export async function loadTheme(): Promise<ThemeMode> {
  const stored = Capacitor.isNativePlatform()
    ? (await Preferences.get({ key: KEY })).value
    : localStorage.getItem(KEY)
  const mode: ThemeMode = stored === 'light' || stored === 'dark' ? stored : 'system'
  applyTheme(mode)
  return mode
}

export async function saveTheme(mode: ThemeMode) {
  applyTheme(mode)
  if (Capacitor.isNativePlatform()) await Preferences.set({ key: KEY, value: mode })
  else localStorage.setItem(KEY, mode)
}
