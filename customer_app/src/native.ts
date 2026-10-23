import { Capacitor } from '@capacitor/core'
import { Device } from '@capacitor/device'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Preferences } from '@capacitor/preferences'
import { PushNotifications } from '@capacitor/push-notifications'

const CHANNEL = 'customer-orders'
const PREF = 'crave_customer_notifications_enabled'
const PUSH_TOKEN_KEY = 'crave_customer_push_token'
// Firebase registration is unsafe on Android until the packaged app contains a
// valid google-services.json. Local notifications remain available without it.
const REMOTE_PUSH_ENABLED = import.meta.env.VITE_FIREBASE_PUSH_ENABLED === 'true'

function notificationId(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0
  }
  return Math.max(1, hash & 0x7fffffff)
}

export async function initializeNative() {
  if (!Capacitor.isNativePlatform()) return
  await LocalNotifications.createChannel({
    id: CHANNEL,
    name: 'Order updates',
    description: 'Live payment and delivery updates',
    importance: 5,
    visibility: 1,
    vibration: true,
    lights: true,
    lightColor: '#F4FF52',
  }).catch(() => undefined)
  // Register for remote push notifications if enabled
  if (REMOTE_PUSH_ENABLED) {
    try {
      const permission = await PushNotifications.checkPermissions()
      if (permission.receive === 'granted') {
        await PushNotifications.addListener('registration', async (registration) => {
          await Preferences.set({ key: PUSH_TOKEN_KEY, value: registration.value })
          const device = await Device.getId()
          const { apiRequest } = await import('./api')
          await apiRequest('/api/customer/push-token', {
            method: 'POST',
            body: {
              token: registration.value,
              platform: Capacitor.getPlatform(),
              deviceId: device.identifier,
            },
          }).catch(() => undefined)
        })
        await PushNotifications.addListener('registrationError', () => undefined)
        await PushNotifications.addListener('pushNotificationReceived', () => {
          void Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => undefined)
        })
        await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          const data = (action.notification.data || {}) as Record<string, unknown>
          // Could deep-link based on data here
        })
        await PushNotifications.register()
      }
    } catch (error) {
      console.warn('Remote push registration unavailable', error)
    }
  }
}
export async function notificationEnabled() {
  const stored = Capacitor.isNativePlatform()
    ? (await Preferences.get({ key: PREF })).value
    : localStorage.getItem(PREF)
  if (stored === 'false') return false
  if (!Capacitor.isNativePlatform())
    return typeof Notification !== 'undefined' && Notification.permission === 'granted'
  return (await LocalNotifications.checkPermissions()).display === 'granted'
}

export async function getNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return typeof Notification !== 'undefined' && Notification.permission === 'granted'
  }
  return (await LocalNotifications.checkPermissions()).display === 'granted'
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    if (typeof Notification === 'undefined') return false
    return (await Notification.requestPermission()) === 'granted'
  }
  try {
    const localPermission = await LocalNotifications.requestPermissions()
    if (localPermission.display !== 'granted') return false
    if (!REMOTE_PUSH_ENABLED) return true

    const pushPermission = await PushNotifications.requestPermissions()
    return pushPermission.receive === 'granted'
  } catch (error) {
    console.warn('Unable to request notification permission', error)
    return false
  }
}

export async function enableNotifications(enabled: boolean) {
  let final = enabled
  if (enabled) {
    final = await requestNotificationPermission()
  }
  if (Capacitor.isNativePlatform()) await Preferences.set({ key: PREF, value: String(final) })
  else localStorage.setItem(PREF, String(final))
  return final
}

export async function notifyOrder(id: string, title: string, body: string) {
  await Haptics.impact({ style: ImpactStyle.Medium }).catch(() => undefined)
  if (!(await notificationEnabled())) return
  if (Capacitor.isNativePlatform())
    await LocalNotifications.schedule({
      notifications: [
        {
          id: notificationId(`${id}-${title}`),
          title,
          body,
          channelId: CHANNEL,
          extra: { tab: 'orders', orderId: id },
        },
      ],
    })
  else if (Notification.permission === 'granted') new Notification(title, { body, tag: id })
}

/**
 * App-update notice. Bypasses the order-preference gate on purpose: an update prompt
 * is an app-level event the user is asking for, so it must reach the device even when
 * order notifications are muted.
 */
export async function notifyAppUpdate(title: string, body: string) {
  if (!Capacitor.isNativePlatform()) {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted')
      new Notification(title, { body, tag: 'crave-app-update' })
    return
  }
  await LocalNotifications.schedule({
    notifications: [
      {
        id: notificationId('crave-app-update'),
        title,
        body,
        channelId: CHANNEL,
        extra: { tab: 'settings', kind: 'app-update' },
      },
    ],
  }).catch(() => undefined)
}
export async function tap() {
  await Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined)
}
