/**
 * customer_app/src/background.ts
 *
 * Background service bridge for the customer app.
 *
 * On Android: starts/stops the native OrderPollingService foreground service
 * that polls /api/orders every 20 s and fires local notifications on status
 * changes — even when the app is minimised or the screen is off.
 *
 * On iOS: the @capacitor/push-notifications plugin delivers order status
 * pushes via APNs. We register the push token here so the server can send
 * targeted notifications. No polling foreground service is needed on iOS.
 *
 * Call startOrderPolling() after the user logs in and has an active order.
 * Call stopOrderPolling() when all orders are settled / on logout.
 */

import { Capacitor, registerPlugin } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { Device } from '@capacitor/device'
import { Preferences } from '@capacitor/preferences'
import { getApiOrigin } from './api'

// ── Android native bridge ─────────────────────────────────────────────────

interface OrderPollingPlugin {
  start(options: {
    token: string
    userId: string
    apiBaseUrl: string
    notificationsEnabled: boolean
  }): Promise<{ active: boolean }>
  stop(): Promise<void>
}

const OrderPolling = registerPlugin<OrderPollingPlugin>('OrderPolling')

// ── iOS push-notification registration ────────────────────────────────────

let iosPushRegistered = false
let iosPushListeners: Array<{ remove: () => Promise<void> }> = []

async function registerIosPush(token: string, apiRequest: ApiRequest): Promise<void> {
  if (iosPushRegistered) return
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') return

  try {
    const permission = await PushNotifications.requestPermissions()
    if (permission.receive !== 'granted') return

    iosPushListeners.push(
      await PushNotifications.addListener('registration', async (reg) => {
        const device = await Device.getId()
        try {
          await apiRequest('/api/push/device', {
            method: 'POST',
            body: {
              token: reg.value,
              platform: 'ios',
              deviceId: device.identifier,
            },
          })
          await Preferences.set({ key: 'crave_customer_push_token', value: reg.value })
          iosPushRegistered = true
        } catch (error) {
          console.error('[customer-push] iOS token registration failed', error)
        }
      })
    )
    iosPushListeners.push(
      await PushNotifications.addListener('registrationError', (error) => {
        console.error('[customer-push] iOS native registration failed', error)
      })
    )
    await PushNotifications.register()
  } catch (err) {
    console.warn('[background] iOS push registration failed:', err)
  }
}

// ── Public API ────────────────────────────────────────────────────────────

type ApiRequest = (path: string, opts?: { method?: string; body?: unknown }) => Promise<unknown>

export async function startOrderPolling(input: {
  token: string
  userId: string
  apiRequest: ApiRequest
  notificationsEnabled?: boolean
}): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  const platform = Capacitor.getPlatform()
  if (platform === 'android') {
    const apiBaseUrl = getApiOrigin()
    if (!apiBaseUrl.startsWith('https://')) {
      console.warn('[background] Skipping OrderPolling: apiBaseUrl must be https://', apiBaseUrl)
      return
    }
    await OrderPolling.start({
      token: input.token,
      userId: input.userId,
      apiBaseUrl,
      notificationsEnabled: input.notificationsEnabled !== false,
    }).catch((err: unknown) => console.warn('[background] OrderPolling.start failed:', err))
  } else if (platform === 'ios') {
    await registerIosPush(input.token, input.apiRequest)
  }
}

export async function stopOrderPolling(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  if (Capacitor.getPlatform() === 'android') {
    await OrderPolling.stop().catch(() => undefined)
  } else if (Capacitor.getPlatform() === 'ios') {
    await Promise.all(iosPushListeners.splice(0).map((handle) => handle.remove()))
    iosPushRegistered = false
  }
}
