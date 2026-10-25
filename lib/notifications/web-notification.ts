/**
 * lib/notifications/web-notification.ts
 *
 * Universal WebApp Notification Manager:
 * - Desktop Browser Notifications (HTML5 Notification API + ServiceWorker showNotification)
 * - Acoustic Web Audio Chimes
 * - Order Lifecycle Event Announcer
 */

import { playChimeSound } from '@/lib/contexts/websocket-context'

export interface WebNotificationOptions {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  url?: string
  sound?: boolean
  data?: Record<string, any>
}

/**
 * Checks if browser desktop notifications are supported
 */
export function isBrowserNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isBrowserNotificationSupported()) return 'denied'
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

/**
 * Trigger browser notification with optional sound
 */
export async function showBrowserNotification(options: WebNotificationOptions): Promise<boolean> {
  if (typeof window === 'undefined') return false

  // Play audio alert if requested
  if (options.sound !== false) {
    try {
      playChimeSound()
    } catch {}
  }

  if (!isBrowserNotificationSupported() || Notification.permission !== 'granted') {
    return false
  }

  const title = options.title || 'crave.'
  const notificationOptions: NotificationOptions & { renotify?: boolean } = {
    body: options.body,
    icon: options.icon || '/icons/icon-192x192.png',
    badge: options.badge || '/icons/icon-72x72.png',
    tag: options.tag || `crave-${Date.now()}`,
    renotify: true,
    data: {
      url: options.url || window.location.href,
      ...(options.data || {}),
    },
  }

  try {
    // Prefer service worker showNotification if available (works on Android PWA/Chrome)
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready.catch(() => null)
      if (registration && typeof registration.showNotification === 'function') {
        await registration.showNotification(title, notificationOptions)
        return true
      }
    }

    // Standard Desktop Notification fallback
    const notification = new Notification(title, notificationOptions)
    if (options.url) {
      notification.onclick = (e) => {
        e.preventDefault()
        window.focus()
        if (options.url && options.url !== window.location.pathname) {
          window.location.href = options.url
        }
        notification.close()
      }
    }
    return true
  } catch (err) {
    console.warn('[web-notification] Failed to display notification:', err)
    return false
  }
}

/**
 * Formats order status transitions into friendly user-facing messages
 */
export function getOrderStatusNotification(order: {
  id?: string
  status?: string
  restaurant_name?: string
  restaurantName?: string
  delivery_otp?: string | null
  deliveryOtp?: string | null
}): { title: string; body: string } | null {
  if (!order || !order.status) return null

  const restName = order.restaurant_name || order.restaurantName || 'Restaurant'
  const otp = order.delivery_otp || order.deliveryOtp

  switch (order.status) {
    case 'sent_to_vendor':
      return {
        title: 'Order Received',
        body: `${restName} has received your order and is reviewing it.`,
      }
    case 'preparing':
      return {
        title: 'Kitchen Preparing Your Food',
        body: `${restName} is now cooking your meal fresh.`,
      }
    case 'packing':
      return {
        title: 'Packing Your Meal',
        body: 'Your food is being packed securely for delivery.',
      }
    case 'ready_for_pickup':
      return {
        title: 'Order Ready for Pickup',
        body: `${restName} finished your food. Looking for a nearby delivery partner.`,
      }
    case 'rider_assigned':
      return {
        title: 'Delivery Partner Assigned',
        body: 'A delivery partner has accepted your order and is heading to the store.',
      }
    case 'picked_up':
      return {
        title: 'Order Picked Up!',
        body: otp
          ? `Your food is on the way! Your handover OTP is ${otp}.`
          : 'Your food is on the way with your delivery partner!',
      }
    case 'out_for_delivery':
      return {
        title: 'Out for Delivery 🚀',
        body: otp
          ? `Partner is arriving soon! Share your 6-digit OTP: ${otp}.`
          : 'Your delivery partner is approaching your address!',
      }
    case 'delivered':
      return {
        title: 'Order Delivered! 🎉',
        body: 'Your delivery code was verified. Enjoy your fresh meal!',
      }
    case 'completed':
      return {
        title: 'Order Complete',
        body: 'Thank you for ordering with crave!',
      }
    case 'cancelled':
      return {
        title: 'Order Cancelled',
        body: 'Your order has been cancelled.',
      }
    default:
      return null
  }
}
