import { getWebSocketUrl } from './api'

interface DriverConnectionOptions {
  token: string
  activeOrderId?: string
  onStatus: (connected: boolean) => void
  onEvent: (channel: string, data: any) => void
}

export function connectDriverEvents(options: DriverConnectionOptions): () => void {
  let socket: WebSocket | null = null
  let reconnectTimer: number | undefined
  let stopped = false
  let attempts = 0

  const connect = () => {
    if (stopped) return
    socket = new WebSocket(getWebSocketUrl(options.token))

    socket.onopen = () => {
      attempts = 0
      options.onStatus(true)
      socket?.send(
        JSON.stringify({
          type: 'subscribe',
          channels: options.activeOrderId ? ['driver_offers', 'order_update'] : ['driver_offers'],
          ...(options.activeOrderId ? { orderId: options.activeOrderId } : {}),
        })
      )
    }

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(String(event.data))
        if (message?.channel && message.channel !== 'control') {
          options.onEvent(message.channel, message.data)
        }
      } catch {}
    }

    socket.onerror = () => options.onStatus(false)
    socket.onclose = () => {
      options.onStatus(false)
      socket = null
      if (stopped) return
      attempts += 1
      reconnectTimer = window.setTimeout(connect, Math.min(30000, 1500 * 1.7 ** attempts))
    }
  }

  connect()
  return () => {
    stopped = true
    if (reconnectTimer) window.clearTimeout(reconnectTimer)
    socket?.close()
  }
}
