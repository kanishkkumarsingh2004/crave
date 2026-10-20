import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Preferences } from '@capacitor/preferences'
import { StatusBar } from '@capacitor/status-bar'
import { getApiOrigin } from './api'

const CHANNEL_ID = 'admin-notifications'
const NOTIFICATION_PREFERENCE_KEY = 'crave_admin_notifications_enabled'

function notificationId(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0
  }
  return Math.max(1, hash & 0x7fffffff)
}

export async function initializeNativeAppearance(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  await StatusBar.hide().catch(() => undefined)
  await LocalNotifications.createChannel({
    id: CHANNEL_ID,
    name: 'Admin alerts',
    description: 'Admin dashboard alerts and system events',
    importance: 5,
    visibility: 1,
    vibration: true,
    lights: true,
    lightColor: '#D9F447',
  }).catch(() => undefined)
}

export async function getNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return typeof Notification !== 'undefined' && Notification.permission === 'granted'
  }
  const permission = await LocalNotifications.checkPermissions()
  return permission.display === 'granted'
}

export async function getNotificationPreference(): Promise<boolean> {
  const stored = Capacitor.isNativePlatform()
    ? (await Preferences.get({ key: NOTIFICATION_PREFERENCE_KEY })).value
    : localStorage.getItem(NOTIFICATION_PREFERENCE_KEY)
  return stored !== 'false' && (await getNotificationPermission())
}

export async function setNotificationPreference(enabled: boolean): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Preferences.set({ key: NOTIFICATION_PREFERENCE_KEY, value: String(enabled) })
  } else {
    localStorage.setItem(NOTIFICATION_PREFERENCE_KEY, String(enabled))
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    if (typeof Notification === 'undefined') return false
    return (await Notification.requestPermission()) === 'granted'
  }
  const permission = await LocalNotifications.requestPermissions()
  return permission.display === 'granted'
}

export async function showAdminNotification(input: {
  id: string
  title: string
  body: string
}): Promise<void> {
  await Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => undefined)
  if (!(await getNotificationPreference())) return

  if (Capacitor.isNativePlatform()) {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: notificationId(input.id),
          title: input.title,
          body: input.body,
          channelId: CHANNEL_ID,
          smallIcon: 'ic_stat_crave_notification',
          iconColor: '#D9F447',
          largeIcon: 'ic_launcher',
          extra: { tab: 'overview', notificationId: input.id },
        },
      ],
    })
    return
  }

  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification(input.title, { body: input.body, tag: input.id })
  }
}

export async function sendTestNotification(): Promise<void> {
  const permission = await requestNotificationPermission()
  if (!permission) {
    throw new Error('Notifications permission denied')
  }
  await showAdminNotification({
    id: 'admin-test',
    title: 'Crave Admin',
    body: `Test notification from the admin app at ${new Date().toLocaleTimeString()}`,
  })
}

/**
 * App-update notice. Bypasses the admin's notification preference on purpose: an
 * update prompt is an app-level event, not a support event, so it must reach the
 * device even when notifications are muted.
 */
export async function notifyAdminAppUpdate(title: string, body: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted')
      new Notification(title, { body, tag: 'crave-admin-app-update' })
    return
  }
  await LocalNotifications.schedule({
    notifications: [
      {
        id: notificationId('crave-admin-app-update'),
        title,
        body,
        channelId: CHANNEL_ID,
        smallIcon: 'ic_stat_crave_notification',
        iconColor: '#D9F447',
        largeIcon: 'ic_launcher',
        extra: { tab: 'settings', kind: 'app-update' },
      },
    ],
  }).catch(() => undefined)
}

export function getApiOriginAdmin(): string {
  return getApiOrigin()
}
