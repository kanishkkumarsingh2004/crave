import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { StatusBar, Style } from '@capacitor/status-bar'

export type ThemeMode = 'light' | 'dark' | 'system'
type ResolvedTheme = Exclude<ThemeMode, 'system'>

export const THEME_DICTIONARY: Record<ResolvedTheme, Record<string, string>> = {
  light: {
    '--app-bg': '#f3f5ef',
    '--surface': '#ffffff',
    '--raised': '#edf2ec',
    '--surface-3': '#e2e9e2',
    '--ink': '#152019',
    '--muted': '#68756c',
    '--line': '#d9e0d9',
    '--input-bg': '#f8faf7',
    '--input-text': '#152019',
    '--input-border': '#cfd8d0',
    '--chrome-bg': 'rgb(255 255 255 / 94%)',
    '--overlay-bg': 'rgb(8 16 11 / 58%)',
    '--on-accent': '#ffffff',
    '--green': '#197a49',
    '--red': '#c94055',
    '--shadow-color': 'rgb(16 32 22 / 13%)',
  },
  dark: {
    '--app-bg': '#09100c',
    '--surface': '#111a15',
    '--raised': '#17231c',
    '--surface-3': '#202e25',
    '--ink': '#f4f7f2',
    '--muted': '#89958d',
    '--line': '#29382f',
    '--input-bg': '#0b130f',
    '--input-text': '#f4f7f2',
    '--input-border': '#304137',
    '--chrome-bg': 'rgb(9 16 12 / 94%)',
    '--overlay-bg': 'rgb(3 8 5 / 76%)',
    '--on-accent': '#101712',
    '--green': '#53e08c',
    '--red': '#ff8995',
    '--shadow-color': 'rgb(0 0 0 / 38%)',
  },
}

const KEY = 'crave_driver_theme'

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

export function getStoredTheme(): ThemeMode {
  const stored = localStorage.getItem(KEY)
  return stored === 'light' || stored === 'dark' ? stored : 'system'
}
