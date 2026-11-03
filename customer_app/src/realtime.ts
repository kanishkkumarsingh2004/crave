import { createRealtimeClient, type RealtimeSubscription } from '@crave/mobile-core'
import { getAuthToken, getWebSocketUrl } from './api'

export function connectCustomerOrders(orderIds: string[], onEvent: () => void): () => void {
  if (!orderIds.length) return () => {}
  const subscriptions: RealtimeSubscription[] = orderIds.map((orderId) => ({
    channels: ['order_update', 'approval_update'],
    orderId,
  }))
  const realtime = createRealtimeClient({
    url: getWebSocketUrl,
    token: getAuthToken,
    subscriptions,
    onEvent,
    reconnect: { baseMs: 1_200, factor: 1.8 },
  })
  realtime.connect()
  return realtime.disconnect
}
