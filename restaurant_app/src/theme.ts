import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { StatusBar, Style } from '@capacitor/status-bar'

export type ThemeMode = 'light' | 'dark' | 'system'
type ResolvedTheme = Exclude<ThemeMode, 'system'>

export const THEME_DICTIONARY: Record<ResolvedTheme, Record<string, string>> = {
  light: {
    '--app-bg': '#f3f5ef',
    '--surface': '#ffffff',
    '--surface-2': '#edf2ec',
    '--surface-3': '#e2e9e2',
    '--ink': '#152019',
    '--muted': '#68756d',
    '--line': '#d9e0d9',
    '--input-bg': '#f8faf7',
    '--input-text': '#152019',
    '--accent': '#d9f447',
    '--chrome-bg': 'rgb(255 255 255 / 94%)',
    '--overlay-bg': 'rgb(8 16 11 / 58%)',
    '--on-accent': '#101710',
    '--success': '#197a49',
    '--warning': '#916611',
    '--danger': '#c94055',
    '--shadow-color': 'rgb(16 32 22 / 13%)',
  },
  dark: {
    '--app-bg': '#0a0f0d',
    '--surface': '#131a16',
    '--surface-2': '#18221c',
    '--surface-3': '#202c25',
    '--ink': '#f7faf7',
    '--muted': '#91a097',
    '--line': '#29372f',
    '--input-bg': '#0e1511',
    '--input-text': '#f7faf7',
    '--accent': '#d9f447',
    '--chrome-bg': 'rgb(10 15 13 / 94%)',
    '--overlay-bg': 'rgb(0 0 0 / 58%)',
    '--on-accent': '#101710',
    '--success': '#73dda2',
    '--warning': '#f1d47d',
    '--danger': '#ff6b77',
    '--shadow-color': 'rgb(0 0 0 / 42%)',
  },
}

const KEY = 'crave_restaurant_theme'

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
