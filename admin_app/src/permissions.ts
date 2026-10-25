import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Preferences } from '@capacitor/preferences'
import { AppUpdate } from './update'

/**
 * The permissions the admin app can ask for, and what each one is for.
 * The first-run sheet walks this list; every entry can be asked for again
 * from Settings.
 */

const SEEN_KEY = 'crave_admin_permissions_seen'

export type PermissionId = 'location' | 'notifications' | 'updates'
export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unavailable'

export interface PermissionRequest {
  id: PermissionId
  title: string
  reason: string
  icon: 'pin' | 'bell' | 'download'
}

export const PERMISSION_REQUESTS: PermissionRequest[] = [
  {
    id: 'location',
    title: 'Location',
    reason: 'View driver and order locations on the map for dispatch management.',
    icon: 'pin',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    reason: 'Receive admin alerts, system events, and critical order updates.',
    icon: 'bell',
  },
  {
    id: 'updates',
    title: 'App updates',
    reason: 'Let CRAVE install new builds so you always run the latest app.',
    icon: 'download',
  },
]

/** Whether the first-run sheet has already been shown. */
export async function hasSeenPermissionSheet(): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      return (await Preferences.get({ key: SEEN_KEY })).value === 'true'
    }
    return localStorage.getItem(SEEN_KEY) === 'true'
  } catch {
    return true
  }
}

export async function markPermissionSheetSeen(): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key: SEEN_KEY, value: 'true' })
    } else {
      localStorage.setItem(SEEN_KEY, 'true')
    }
  } catch {
    // ignore
  }
}

/** The current state of one permission. */
export async function permissionState(id: PermissionId): Promise<PermissionState> {
  if (id === 'location') {
    if (!Capacitor.isNativePlatform()) {
      if (typeof navigator === 'undefined' || !navigator.permissions) return 'unavailable'
      try {
        const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName })
        return status.state === 'granted'
          ? 'granted'
          : status.state === 'denied'
            ? 'denied'
            : 'prompt'
      } catch {
        return 'unavailable'
      }
    }
    const status = await Geolocation.checkPermissions()
    return status.location === 'granted'
      ? 'granted'
      : status.location === 'denied'
        ? 'denied'
        : 'prompt'
  }

  if (id === 'notifications') {
    if (!Capacitor.isNativePlatform()) {
      if (typeof Notification === 'undefined') return 'unavailable'
      return Notification.permission === 'granted'
        ? 'granted'
        : Notification.permission === 'denied'
          ? 'denied'
          : 'prompt'
    }
    const status = await LocalNotifications.checkPermissions()
    return status.display === 'granted'
      ? 'granted'
      : status.display === 'denied'
        ? 'denied'
        : 'prompt'
  }

  // Installing an update needs "unknown sources" to be allowed, which is a
  // device setting rather than a runtime dialog.
  if (!Capacitor.isNativePlatform()) return 'unavailable'
  try {
    const result = await (AppUpdate as unknown as AppUpdateBridgePlugin).canInstallPackages()
    return result?.allowed ? 'granted' : 'prompt'
  } catch {
    return 'unavailable'
  }
}

/**
 * Asks for one permission. Returns the state afterwards so the sheet can show
 * what happened.
 */
export async function requestPermission(id: PermissionId): Promise<PermissionState> {
  if (id === 'location') {
    if (!Capacitor.isNativePlatform()) {
      if (typeof navigator === 'undefined' || !navigator.geolocation) return 'unavailable'
      return new Promise<PermissionState>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve('granted'),
          () => resolve('denied'),
          { enableHighAccuracy: false, timeout: 10000 }
        )
      })
    }
    const status = await Geolocation.requestPermissions({
      permissions: ['coarseLocation', 'location'],
    })
    return status.location === 'granted'
      ? 'granted'
      : status.location === 'denied'
        ? 'denied'
        : 'prompt'
  }

  if (id === 'notifications') {
    if (!Capacitor.isNativePlatform()) {
      if (typeof Notification === 'undefined') return 'unavailable'
      return (await Notification.requestPermission()) === 'granted' ? 'granted' : 'denied'
    }
    const status = await LocalNotifications.requestPermissions()
    return status.display === 'granted' ? 'granted' : 'denied'
  }

  if (!Capacitor.isNativePlatform()) return 'unavailable'
  try {
    await (AppUpdate as unknown as AppUpdateBridgePlugin).openInstallSettings()
    return 'prompt'
  } catch {
    return 'unavailable'
  }
}

/** Sends the admin to the device settings for this app. */
export async function openAppSettings(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    await (AppUpdate as unknown as AppUpdateBridgePlugin).openAppSettings()
  } catch {
    // ignore
  }
}

/* ── The native bridge for "install unknown apps" ─────────────────────────── */

interface AppUpdateBridgePlugin {
  canInstallPackages(): Promise<{ allowed: boolean }>
  openInstallSettings(): Promise<void>
  openAppSettings(): Promise<void>
}
