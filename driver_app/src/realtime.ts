import { createRealtimeClient } from '@crave/mobile-core'
import { getWebSocketUrl } from './api'

interface DriverConnectionOptions {
  token: string
  activeOrderId?: string
  onStatus: (connected: boolean) => void
  onEvent: (channel: string, data: any) => void
}

export function connectDriverEvents(options: DriverConnectionOptions): () => void {
  const realtime = createRealtimeClient({
    url: getWebSocketUrl,
    token: options.token,
    subscriptions: [
      {
        channels: options.activeOrderId ? ['driver_offers', 'order_update'] : ['driver_offers'],
        ...(options.activeOrderId ? { orderId: options.activeOrderId } : {}),
      },
    ],
    onStatus: options.onStatus,
    onEvent: options.onEvent,
  })
  realtime.connect()
  return realtime.disconnect
}
