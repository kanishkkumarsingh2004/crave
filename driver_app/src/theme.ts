import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

export type ThemeMode = 'light' | 'dark' | 'system'

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
