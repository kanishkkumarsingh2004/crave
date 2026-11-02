import { getAuthToken, getWebSocketUrl } from './api'

export function connectCustomerOrders(orderIds: string[], onEvent: () => void): () => void {
  let socket: WebSocket | null = null
  let timer: number | undefined
  let stopped = false
  let attempts = 0
  const connect = () => {
    if (stopped || !orderIds.length) return
    const token = getAuthToken()
    const protocols = token.split('.').length === 3 ? ['crave.jwt', token] : undefined
    socket = protocols
      ? new WebSocket(getWebSocketUrl(), protocols)
      : new WebSocket(getWebSocketUrl())
    socket.onopen = () => {
      attempts = 0
      for (const orderId of orderIds)
        socket?.send(
          JSON.stringify({
            type: 'subscribe',
            channels: ['order_update', 'approval_update'],
            orderId,
          })
        )
    }
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(String(event.data))
        if (message?.channel === 'order_update' || message?.channel === 'approval_update') onEvent()
      } catch {}
    }
    socket.onclose = () => {
      socket = null
      if (!stopped) {
        attempts += 1
        timer = window.setTimeout(connect, Math.min(30000, 1200 * 1.8 ** attempts))
      }
    }
  }
  connect()
  return () => {
    stopped = true
    if (timer) clearTimeout(timer)
    socket?.close()
  }
}
