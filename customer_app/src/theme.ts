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
    '--line-strong': '#cbd4c9',
    '--input-bg': '#ffffff',
    '--input-text': '#101712',
    '--input-placeholder': '#6f776f',
    '--input-focus-border': '#7b9518',
    '--input-focus-ring': '#dff33f55',
    '--chrome-bg': 'rgb(255 255 255 / 94%)',
    '--overlay-bg': 'rgb(6 16 9 / 60%)',
    '--accent': '#eaff3f',
    '--accent-strong': '#5f7400',
    '--accent-soft': '#f1f8cc',
    '--on-accent': '#172014',
    '--success': '#267448',
    '--success-bg': '#edf8e9',
    '--success-border': '#bfe1bf',
    '--danger': '#b33a43',
    '--danger-bg': '#fff0f1',
    '--danger-border': '#f2b9bd',
    '--warning': '#9a6400',
    '--warning-bg': '#fff5d9',
    '--chip-bg': '#ffffff',
    '--chip-text': '#101712',
    '--chip-active-bg': '#142119',
    '--chip-active-text': '#ffffff',
    '--nav-active-bg': '#edff77',
    '--nav-active-text': '#264713',
    '--icon-surface': '#eff3e6',
    '--icon-accent': '#4d6500',
    '--media-placeholder-bg': '#e8ebdf',
    '--cart-header-bg': '#eaf2df',
    '--cart-header-text': '#101712',
    '--cart-header-muted': '#728072',
    '--status-bg': '#f1f4eb',
    '--status-text': '#101712',
    '--status-pending': '#e4a22a',
    '--status-success': '#38a367',
    '--status-danger': '#d3515c',
    '--profile-bg': 'linear-gradient(130deg, #102c1c, #1d4b2e)',
    '--profile-text': '#ffffff',
    '--profile-muted': '#bfd0c3',
    '--auth-art-start': '#dcefc3',
    '--auth-art-end': '#a8c97d',
    '--auth-grid': 'rgba(16, 23, 18, 0.08)',
    '--auth-card-bg': 'rgb(255 255 255 / 72%)',
    '--auth-card-border': 'rgb(16 23 18 / 14%)',
    '--auth-card-text': '#52604f',
    '--auth-card-strong': '#172014',
    '--auth-orb-bg': '#f1ead5',
    '--promo-bg': 'linear-gradient(120deg, #edf7d5, #d6e9a5)',
    '--promo-text': '#172014',
    '--promo-muted': '#52604f',
    '--promo-shadow': 'rgb(18 52 30 / 14%)',
    '--hero-fallback': '#14231a',
    '--hero-overlay-strong': 'rgba(5, 12, 8, 0.88)',
    '--hero-overlay-soft': 'rgba(5, 12, 8, 0.08)',
    '--sheet-handle': '#c8cec6',
    '--restaurant-fallback-1': '#f4ff52',
    '--restaurant-fallback-2': '#ffb86b',
    '--restaurant-fallback-3': '#b8d8ff',
    '--restaurant-fallback-4': '#e6cbff',
    '--restaurant-fallback-5': '#a9efcf',
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
    '--line-strong': '#405247',
    '--input-bg': '#0b140f',
    '--input-text': '#f5f8f5',
    '--input-placeholder': '#8c9a90',
    '--input-focus-border': '#b7d43c',
    '--input-focus-ring': '#d9f44733',
    '--chrome-bg': 'rgb(8 17 12 / 94%)',
    '--overlay-bg': 'rgb(2 7 4 / 78%)',
    '--accent': '#d9f447',
    '--accent-strong': '#d9f447',
    '--accent-soft': '#283d10',
    '--on-accent': '#172014',
    '--success': '#73dda2',
    '--success-bg': '#153321',
    '--success-border': '#295b3b',
    '--danger': '#ff8995',
    '--danger-bg': '#36191f',
    '--danger-border': '#71313b',
    '--warning': '#f2c45c',
    '--warning-bg': '#3b2d13',
    '--chip-bg': '#17231c',
    '--chip-text': '#f5f8f5',
    '--chip-active-bg': '#283d10',
    '--chip-active-text': '#d9f447',
    '--nav-active-bg': '#283d10',
    '--nav-active-text': '#d9f447',
    '--icon-surface': '#223228',
    '--icon-accent': '#d9f447',
    '--media-placeholder-bg': '#1c2922',
    '--cart-header-bg': '#1c3023',
    '--cart-header-text': '#f5f8f5',
    '--cart-header-muted': '#8c9a90',
    '--status-bg': '#17231c',
    '--status-text': '#f5f8f5',
    '--status-pending': '#f2c45c',
    '--status-success': '#73dda2',
    '--status-danger': '#ff8995',
    '--profile-bg': 'linear-gradient(130deg, #102c1c, #1d4b2e)',
    '--profile-text': '#ffffff',
    '--profile-muted': '#b8cbbd',
    '--auth-art-start': '#28492c',
    '--auth-art-end': '#09120d',
    '--auth-grid': 'rgba(255, 255, 255, 0.025)',
    '--auth-card-bg': 'rgb(20 32 25 / 85%)',
    '--auth-card-border': 'rgb(255 255 255 / 12%)',
    '--auth-card-text': '#bdc5bd',
    '--auth-card-strong': '#ffffff',
    '--auth-orb-bg': '#f1ead5',
    '--promo-bg': 'linear-gradient(120deg, #092d1a, #174d2f)',
    '--promo-text': '#ffffff',
    '--promo-muted': '#c3d1c7',
    '--promo-shadow': 'rgb(0 0 0 / 32%)',
    '--hero-fallback': '#102019',
    '--hero-overlay-strong': 'rgba(2, 7, 4, 0.92)',
    '--hero-overlay-soft': 'rgba(2, 7, 4, 0.12)',
    '--sheet-handle': '#53645a',
    '--restaurant-fallback-1': '#3c4a16',
    '--restaurant-fallback-2': '#4b3320',
    '--restaurant-fallback-3': '#20394e',
    '--restaurant-fallback-4': '#3b2c4d',
    '--restaurant-fallback-5': '#1e4434',
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
