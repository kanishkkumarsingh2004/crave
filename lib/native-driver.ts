'use client'

import type { BroadcastOrderOffer } from '@/lib/driver-context'

export interface DriverPosition {
  timestamp: number
  coords: {
    latitude: number
    longitude: number
    accuracy: number
    altitude: number | null
    altitudeAccuracy?: number | null
    heading: number | null
    speed: number | null
  }
}

type PositionSuccess = (position: DriverPosition) => void
type PositionFailure = (error: GeolocationPositionError | Error) => void

export interface NativeDriverBridgeOptions {
  driverId?: string
}

function routeFromNotificationData(data?: Record<string, unknown>): string {
  const route = typeof data?.route === 'string' ? data.route : '/driver/dashboard'
  return route.startsWith('/driver/') ? route : '/driver/dashboard'
}

function numericNotificationId(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0
  }
  return Math.max(1, hash & 0x7fffffff)
}

export async function isNativeDriverApp(): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core')
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

export async function getDriverLocationPermission(): Promise<
  'granted' | 'prompt' | 'denied' | 'unknown'
> {
  if (!(await isNativeDriverApp())) return 'unknown'

  try {
    const { Geolocation } = await import('@capacitor/geolocation')
    const permission = await Geolocation.checkPermissions()
    const state = permission.location
    if (state === 'granted' || state === 'prompt' || state === 'denied') return state
    return 'unknown'
  } catch {
    return 'unknown'
  }
}

export async function requestCurrentDriverPosition(
  onSuccess: PositionSuccess,
  onError: PositionFailure
): Promise<boolean> {
  if (!(await isNativeDriverApp())) return false

  try {
    const { Geolocation } = await import('@capacitor/geolocation')
    const permission = await Geolocation.requestPermissions({ permissions: ['location'] })
    if (permission.location !== 'granted') {
      onError(new Error('Location permission denied'))
      return true
    }
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    })
    onSuccess(position)
  } catch (error) {
    onError(error instanceof Error ? error : new Error('Unable to acquire native GPS location'))
  }
  return true
}

export async function subscribeToDriverPosition(
  onSuccess: PositionSuccess,
  onError: PositionFailure
): Promise<(() => void) | null> {
  if (!(await isNativeDriverApp())) return null

  try {
    const { Geolocation } = await import('@capacitor/geolocation')
    const permission = await Geolocation.requestPermissions({ permissions: ['location'] })
    if (permission.location !== 'granted') {
      onError(new Error('Location permission denied'))
      return () => undefined
    }

    const id = await Geolocation.watchPosition(
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 2000,
        interval: 3000,
        minimumUpdateInterval: 3000,
      },
      (position, error) => {
        if (error) {
          onError(new Error(error.message || 'Native GPS watch failed'))
        } else if (position) {
          onSuccess(position)
        }
      }
    )

    return () => {
      void Geolocation.clearWatch({ id })
    }
  } catch (error) {
    onError(error instanceof Error ? error : new Error('Unable to start native GPS watch'))
    return () => undefined
  }
}

export async function initializeNativeDriverBridge(
  options: NativeDriverBridgeOptions
): Promise<() => void> {
  if (!(await isNativeDriverApp())) return () => undefined

  document.documentElement.dataset.nativeApp = 'true'

  const [
    { App },
    { Device },
    { Haptics, ImpactStyle },
    { LocalNotifications },
    { Network },
    { Preferences },
    { PushNotifications },
    { SplashScreen },
    { StatusBar, Style },
  ] = await Promise.all([
    import('@capacitor/app'),
    import('@capacitor/device'),
    import('@capacitor/haptics'),
    import('@capacitor/local-notifications'),
    import('@capacitor/network'),
    import('@capacitor/preferences'),
    import('@capacitor/push-notifications'),
    import('@capacitor/splash-screen'),
    import('@capacitor/status-bar'),
  ])

  const listenerHandles: Array<{ remove: () => Promise<void> }> = []
  const navigate = (route: string) => {
    if (window.location.pathname !== route) window.location.assign(route)
  }

  try {
    await StatusBar.setStyle({ style: Style.Light })
    await StatusBar.setBackgroundColor({ color: '#121815' })
    await StatusBar.setOverlaysWebView({ overlay: false })
  } catch {}

  try {
    await LocalNotifications.createChannel({
      id: 'driver-orders',
      name: 'Delivery offers',
      description: 'New delivery offers and active trip updates',
      importance: 5,
      visibility: 1,
      vibration: true,
      lights: true,
      lightColor: '#D9F447',
    })
  } catch {}

  try {
    const localPermission = await LocalNotifications.checkPermissions()
    if (localPermission.display === 'prompt') await LocalNotifications.requestPermissions()
  } catch {}

  try {
    const pushPermission = await PushNotifications.checkPermissions()
    const resolvedPermission =
      pushPermission.receive === 'prompt'
        ? await PushNotifications.requestPermissions()
        : pushPermission

    if (resolvedPermission.receive === 'granted') {
      const info = await Device.getInfo()
      const deviceId = await Device.getId()

      listenerHandles.push(
        await PushNotifications.addListener('registration', async ({ value: pushToken }) => {
          await Preferences.set({ key: 'crave_driver_push_token', value: pushToken })
          await fetch('/api/driver/push-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: pushToken,
              platform: info.platform,
              deviceId: deviceId.identifier,
              driverId: options.driverId,
            }),
          }).catch(() => undefined)
        })
      )
      listenerHandles.push(
        await PushNotifications.addListener('registrationError', (error) => {
          console.error('[native] Push registration failed:', error)
        })
      )
      listenerHandles.push(
        await PushNotifications.addListener('pushNotificationReceived', async () => {
          await Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => undefined)
        })
      )
      listenerHandles.push(
        await PushNotifications.addListener(
          'pushNotificationActionPerformed',
          ({ notification }) => {
            navigate(routeFromNotificationData(notification.data))
          }
        )
      )
      await PushNotifications.register()
    }
  } catch (error) {
    console.warn('[native] Push notifications are not configured yet:', error)
  }

  listenerHandles.push(
    await LocalNotifications.addListener('localNotificationActionPerformed', ({ notification }) => {
      navigate(routeFromNotificationData(notification.extra))
    })
  )
  listenerHandles.push(
    await App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) window.history.back()
      else void App.minimizeApp()
    })
  )
  listenerHandles.push(
    await App.addListener('appUrlOpen', ({ url }) => {
      try {
        const route = new URL(url).pathname
        navigate(routeFromNotificationData({ route }))
      } catch {}
    })
  )
  listenerHandles.push(
    await Network.addListener('networkStatusChange', ({ connected }) => {
      document.documentElement.dataset.network = connected ? 'online' : 'offline'
    })
  )

  const status = await Network.getStatus()
  document.documentElement.dataset.network = status.connected ? 'online' : 'offline'
  await SplashScreen.hide().catch(() => undefined)
  await Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined)

  return () => {
    delete document.documentElement.dataset.nativeApp
    delete document.documentElement.dataset.network
    for (const handle of listenerHandles) void handle.remove()
  }
}

export async function unregisterNativePushToken(authToken?: string | null): Promise<void> {
  if (!(await isNativeDriverApp())) return

  try {
    const [{ Preferences }, { PushNotifications }] = await Promise.all([
      import('@capacitor/preferences'),
      import('@capacitor/push-notifications'),
    ])
    const { value: pushToken } = await Preferences.get({ key: 'crave_driver_push_token' })
    if (pushToken) {
      await fetch('/api/driver/push-token', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && authToken !== 'local-token'
            ? { Authorization: `Bearer ${authToken}` }
            : {}),
        },
        body: JSON.stringify({ token: pushToken }),
      }).catch(() => undefined)
    }
    await Preferences.remove({ key: 'crave_driver_push_token' })
    await PushNotifications.removeAllListeners()
  } catch (error) {
    console.warn('[native] Unable to unregister push token:', error)
  }
}

export async function notifyNativeDeliveryOffer(offer: BroadcastOrderOffer): Promise<void> {
  if (!(await isNativeDriverApp())) return

  try {
    const [{ Haptics, ImpactStyle }, { LocalNotifications }] = await Promise.all([
      import('@capacitor/haptics'),
      import('@capacitor/local-notifications'),
    ])
    const permission = await LocalNotifications.checkPermissions()
    if (permission.display === 'granted') {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: numericNotificationId(offer.id),
            title: `New order · ₹${offer.basePayout + offer.surgeBonus + offer.tip}`,
            body: `${offer.restaurantName} · ${offer.distance} · ${offer.itemsCount} item${offer.itemsCount === 1 ? '' : 's'}`,
            channelId: 'driver-orders',
            extra: { route: '/driver/dashboard', orderId: offer.id },
          },
        ],
      })
    }
    await Haptics.impact({ style: ImpactStyle.Heavy })
  } catch (error) {
    console.warn('[native] Unable to show delivery notification:', error)
  }
}
