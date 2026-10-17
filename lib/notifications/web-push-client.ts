function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  const decoded = window.atob(base64)
  const output = new Uint8Array(new ArrayBuffer(decoded.length))

  for (let index = 0; index < decoded.length; index += 1) {
    output[index] = decoded.charCodeAt(index)
  }
  return output
}

export function isWebPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export async function getWebPushRegistration() {
  if (!isWebPushSupported()) throw new Error('Push notifications are not supported on this device')
  await navigator.serviceWorker.register('/sw.js')
  return navigator.serviceWorker.ready
}

export async function subscribeToWebPush(publicKey: string): Promise<PushSubscription> {
  const registration = await getWebPushRegistration()
  const existing = await registration.pushManager.getSubscription()
  const subscription =
    existing ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }))

  const response = await fetch('/api/push/subscriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(subscription.toJSON()),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || 'Unable to enable push notifications')

  return subscription
}

export async function syncExistingWebPushSubscription(): Promise<boolean> {
  if (!isWebPushSupported() || Notification.permission !== 'granted') return false
  const registration = await getWebPushRegistration()
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return false

  const response = await fetch('/api/push/subscriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(subscription.toJSON()),
  })
  return response.ok
}

export async function unregisterWebPushSubscription(authToken?: string | null): Promise<void> {
  if (!isWebPushSupported()) return
  const registration = await navigator.serviceWorker.getRegistration('/sw.js')
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) return

  await fetch('/api/push/subscriptions', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && authToken !== 'local-token' && authToken !== 'cookie-session'
        ? { Authorization: `Bearer ${authToken}` }
        : {}),
    },
    credentials: 'include',
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  }).catch(() => {})

  await subscription.unsubscribe().catch(() => false)
}
