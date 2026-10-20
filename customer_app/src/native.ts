import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Preferences } from '@capacitor/preferences'

const CHANNEL = 'customer-orders'
const PREF = 'crave_customer_notifications_enabled'
const idFor = (value: string) =>
  Math.max(1, [...value].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0) & 0x7fffffff)

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
export async function enableNotifications(enabled: boolean) {
  let final = enabled
  if (enabled) {
    final = Capacitor.isNativePlatform()
      ? (await LocalNotifications.requestPermissions()).display === 'granted'
      : typeof Notification !== 'undefined' &&
        (await Notification.requestPermission()) === 'granted'
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
          id: idFor(`${id}-${title}`),
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
        id: idFor('crave-app-update'),
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
