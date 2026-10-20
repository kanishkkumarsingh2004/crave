import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'
import { Device } from '@capacitor/device'
import { Geolocation, type Position } from '@capacitor/geolocation'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Preferences } from '@capacitor/preferences'
import { PushNotifications } from '@capacitor/push-notifications'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar } from '@capacitor/status-bar'
import { apiRequest, getApiOrigin } from './api'

const CHANNEL_ID = 'driver-orders'
const NOTIFICATION_KEY = 'crave_driver_notifications_enabled'
const DUTY_KEY = 'crave_driver_duty_online'
const PUSH_TOKEN_KEY = 'crave_driver_push_token'
const BACKGROUND_DRIVER_ID_KEY = 'crave_driver_background_driver_id'
const BACKGROUND_API_ORIGIN_KEY = 'crave_driver_background_api_origin'
const BACKGROUND_ORDER_ID_KEY = 'crave_driver_background_order_id'
const BACKGROUND_VEHICLE_TYPE_KEY = 'crave_driver_background_vehicle_type'
// Firebase registration is unsafe on Android until the packaged app contains a
// valid google-services.json. Local notifications remain available without it.
const REMOTE_PUSH_ENABLED = import.meta.env.VITE_FIREBASE_PUSH_ENABLED === 'true'

interface DriverLocationPlugin {
  start(options: BackgroundLocationOptions): Promise<{ active: boolean }>
  update(options: BackgroundLocationOptions): Promise<{ active: boolean }>
  stop(): Promise<void>
}

interface BackgroundLocationOptions {
  token: string
  driverId: string
  apiBaseUrl: string
  activeOrderId?: string
  vehicleType: string
}

const DriverLocation = registerPlugin<DriverLocationPlugin>('DriverLocation')

function notificationId(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0
  }
  return Math.max(1, hash & 0x7fffffff)
}

export async function initializeNativeAppearance(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await StatusBar.hide().catch(() => undefined)
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Delivery offers',
      description: 'New delivery offers and active trip updates',
      importance: 5,
      visibility: 1,
      vibration: true,
      lights: true,
      lightColor: '#D9F447',
    }).catch(() => undefined)
  }
  await SplashScreen.hide().catch(() => undefined)
}

export async function getStoredDutyStatus(): Promise<boolean> {
  const value = Capacitor.isNativePlatform()
    ? (await Preferences.get({ key: DUTY_KEY })).value
    : localStorage.getItem(DUTY_KEY)
  return value === 'true'
}

export async function setStoredDutyStatus(online: boolean): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Preferences.set({ key: DUTY_KEY, value: String(online) })
  } else {
    localStorage.setItem(DUTY_KEY, String(online))
  }
}

export async function getNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return typeof Notification !== 'undefined' && Notification.permission === 'granted'
  }
  return (await LocalNotifications.checkPermissions()).display === 'granted'
}

export async function getNotificationPreference(): Promise<boolean> {
  const stored = Capacitor.isNativePlatform()
    ? (await Preferences.get({ key: NOTIFICATION_KEY })).value
    : localStorage.getItem(NOTIFICATION_KEY)
  return stored !== 'false' && (await getNotificationPermission())
}

export async function setNotificationPreference(enabled: boolean): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Preferences.set({ key: NOTIFICATION_KEY, value: String(enabled) })
  } else {
    localStorage.setItem(NOTIFICATION_KEY, String(enabled))
  }
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

export async function registerDriverPushNotifications(
  onOpen?: (data: Record<string, unknown>) => void
): Promise<() => void> {
  const handles: PluginListenerHandle[] = []
  if (!Capacitor.isNativePlatform() || !REMOTE_PUSH_ENABLED) return () => undefined

  try {
    const permission = await PushNotifications.checkPermissions()
    if (permission.receive !== 'granted') return () => undefined

    const addHandle = async (promise: Promise<PluginListenerHandle>) => handles.push(await promise)

    await addHandle(
      PushNotifications.addListener('registration', (registration) => {
        void (async () => {
          const device = await Device.getId()
          await Preferences.set({ key: PUSH_TOKEN_KEY, value: registration.value })
          await apiRequest('/api/driver/push-token', {
            method: 'POST',
            body: {
              token: registration.value,
              platform: Capacitor.getPlatform(),
              deviceId: device.identifier,
            },
          }).catch(() => undefined)
        })()
      })
    )
    await addHandle(PushNotifications.addListener('registrationError', () => undefined))
    await addHandle(
      PushNotifications.addListener('pushNotificationReceived', () => {
        void Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => undefined)
      })
    )
    await addHandle(
      PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        const data = (action.notification.data || {}) as Record<string, unknown>
        onOpen?.(data)
      })
    )
    await PushNotifications.register()
  } catch (error) {
    console.warn('Remote push registration is unavailable', error)
    handles.forEach((handle) => void handle.remove())
    return () => undefined
  }

  return () => {
    handles.forEach((handle) => void handle.remove())
  }
}

export async function unregisterDriverPushNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  const token = (await Preferences.get({ key: PUSH_TOKEN_KEY })).value
  if (token) {
    await apiRequest('/api/driver/push-token', {
      method: 'DELETE',
      body: { token },
    }).catch(() => undefined)
  }
  await Preferences.remove({ key: PUSH_TOKEN_KEY })
  if (REMOTE_PUSH_ENABLED) await PushNotifications.unregister().catch(() => undefined)
}

async function storeBackgroundLocationOptions(options: BackgroundLocationOptions): Promise<void> {
  await Promise.all([
    Preferences.set({ key: BACKGROUND_DRIVER_ID_KEY, value: options.driverId }),
    Preferences.set({ key: BACKGROUND_API_ORIGIN_KEY, value: options.apiBaseUrl }),
    Preferences.set({ key: BACKGROUND_ORDER_ID_KEY, value: options.activeOrderId || '' }),
    Preferences.set({ key: BACKGROUND_VEHICLE_TYPE_KEY, value: options.vehicleType }),
  ])
}

export async function startBackgroundDriverLocation(input: {
  driverId: string
  token: string
  activeOrderId?: string
  vehicleType?: string
}): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  const options: BackgroundLocationOptions = {
    token: input.token,
    driverId: input.driverId,
    apiBaseUrl: getApiOrigin(),
    activeOrderId: input.activeOrderId,
    vehicleType: input.vehicleType || 'EV_SCOOTER',
  }
  await storeBackgroundLocationOptions(options)
  if (Capacitor.getPlatform() === 'android') await DriverLocation.start(options)
}

export async function updateBackgroundDriverLocation(input: {
  driverId: string
  token: string
  activeOrderId?: string
  vehicleType?: string
}): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  const options: BackgroundLocationOptions = {
    token: input.token,
    driverId: input.driverId,
    apiBaseUrl: getApiOrigin(),
    activeOrderId: input.activeOrderId,
    vehicleType: input.vehicleType || 'EV_SCOOTER',
  }
  await storeBackgroundLocationOptions(options)
  if (Capacitor.getPlatform() === 'android') await DriverLocation.update(options)
}

export async function stopBackgroundDriverLocation(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  await Promise.all([
    Preferences.remove({ key: BACKGROUND_DRIVER_ID_KEY }),
    Preferences.remove({ key: BACKGROUND_API_ORIGIN_KEY }),
    Preferences.remove({ key: BACKGROUND_ORDER_ID_KEY }),
    Preferences.remove({ key: BACKGROUND_VEHICLE_TYPE_KEY }),
  ])
  if (Capacitor.getPlatform() === 'android') await DriverLocation.stop().catch(() => undefined)
}

export async function showDriverNotification(input: {
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
          extra: { tab: 'home', orderId: input.id },
        },
      ],
    })
  } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification(input.title, { body: input.body, tag: input.id })
  }
}

/**
 * App-update notice. Bypasses the driver's notification preference on purpose: an
 * update prompt is an app-level event, not a dispatch event, so it must reach the
 * device even when order notifications are muted.
 */
export async function notifyDriverAppUpdate(title: string, body: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted')
      new Notification(title, { body, tag: 'crave-driver-app-update' })
    return
  }
  await LocalNotifications.schedule({
    notifications: [
      {
        id: notificationId('crave-driver-app-update'),
        title,
        body,
        channelId: CHANNEL_ID,
        extra: { tab: 'account', kind: 'app-update' },
      },
    ],
  }).catch(() => undefined)
}

export async function requestCurrentPosition(): Promise<Position> {
  if (Capacitor.isNativePlatform()) {
    const permission = await Geolocation.requestPermissions({ permissions: ['location'] })
    if (permission.location !== 'granted') throw new Error('Location permission is required')
  }
  return Geolocation.getCurrentPosition({
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 2000,
  })
}

export async function watchDriverPosition(
  onPosition: (position: Position) => void,
  onError: (message: string) => void
): Promise<() => void> {
  if (Capacitor.isNativePlatform()) {
    const permission = await Geolocation.requestPermissions({ permissions: ['location'] })
    if (permission.location !== 'granted') {
      onError('Location permission is required while you are online')
      return () => undefined
    }
  }

  const id = await Geolocation.watchPosition(
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 2000,
      minimumUpdateInterval: 5000,
    },
    (position, error) => {
      if (error) onError(error.message || 'Unable to read your location')
      else if (position) onPosition(position)
    }
  )
  return () => void Geolocation.clearWatch({ id })
}

export function openNavigation(latitude?: number, longitude?: number, address?: string): void {
  const destination =
    typeof latitude === 'number' && typeof longitude === 'number'
      ? `${latitude},${longitude}`
      : address || ''
  if (!destination) return
  window.open(
    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`,
    '_blank'
  )
}
