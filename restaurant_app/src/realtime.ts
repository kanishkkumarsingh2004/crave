import { createRealtimeClient } from '@crave/mobile-core'
import { getWebSocketUrl } from './api'

interface LiveConnectionOptions {
  token: string
  onStatus: (connected: boolean) => void
  onEvent: (channel: string, data: any) => void
}

export function connectRestaurantEvents(options: LiveConnectionOptions): () => void {
  const realtime = createRealtimeClient({
    url: getWebSocketUrl,
    token: options.token,
    subscriptions: [
      { channels: ['vendor_orders', 'menu_items', 'restaurants', 'admin_settlements'] },
    ],
    onStatus: options.onStatus,
    onEvent: options.onEvent,
  })
  realtime.connect()
  return realtime.disconnect
}
