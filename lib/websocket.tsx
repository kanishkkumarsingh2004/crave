import { useEffect, useRef, useState } from 'react'

export type WSMessage = {
  channel: string
  data: unknown
  ts?: number
}

export type UseWebSocketOptions = {
  channels?: string[]
  customerId?: string
  driverId?: string
  onMessage?: (msg: WSMessage) => void
  onConnect?: () => void
  onDisconnect?: () => void
  autoReconnect?: boolean
  reconnectInterval?: number
}

export function useWebSocket({
  channels = [],
  customerId,
  driverId,
  onMessage,
  onConnect,
  onDisconnect,
  autoReconnect = true,
  reconnectInterval = 5000,
}: UseWebSocketOptions) {
  const [connected, setConnected] = useState(false)
  const wsRef: any = useRef(null)
  const reconnectRef: any = useRef(null)

  useEffect(() => {
    if (!channels.length) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsPort = process.env.NEXT_PUBLIC_WS_PORT || 8000
    const wsHost = process.env.NEXT_PUBLIC_WS_HOST || window.location.hostname
    const wsUrl = `${protocol}//${wsHost}:${wsPort}/api/ws`

    const connect = () => {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
        onConnect?.()
        ws.send(
          JSON.stringify({
            type: 'subscribe',
            channels,
            customerId,
            driverId,
          })
        )
      }

      ws.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data)
          onMessage?.(msg)
        } catch (e) {
          console.error('WS message parse error:', e)
        }
      }

      ws.onclose = () => {
        setConnected(false)
        onDisconnect?.()
        wsRef.current = null

        if (autoReconnect) {
          reconnectRef.current = setTimeout(() => {
            connect()
          }, reconnectInterval)
        }
      }

      ws.onerror = (err) => {
        console.error('WebSocket error:', err)
      }
    }

    connect()

    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
      if (wsRef.current) wsRef.current.close()
    }
  }, [channels.join(','), customerId, driverId, autoReconnect, reconnectInterval])

  const sendMessage = (type: string, data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, ...data }))
    }
  }

  return { connected, sendMessage }
}

export function useOrderUpdates(customerId: string | undefined, onOrders: (orders: any[]) => void) {
  return useWebSocket({
    channels: ['order_update'],
    customerId,
    onMessage: (msg) => {
      if (msg.channel === 'order_update') {
        const data = msg.data as any
        if (data.orders) {
          onOrders(data.orders)
        } else if (data.order) {
          const o = data.order
          const statusMap: Record<string, string> = {
            completed: 'Delivered',
            delivered: 'Delivered',
            cancelled: 'Cancelled',
            new: 'In Progress',
            preparing: 'In Progress',
            ready: 'In Progress',
            accepted: 'In Progress',
            out_for_delivery: 'In Progress',
          }

          const parsed = {
            id: o.id,
            restaurantName: o.restaurant_name || 'Crave Kitchen Store',
            items: (() => {
              try {
                const raw = typeof o.items === 'string' ? JSON.parse(o.items) : o.items
                return Array.isArray(raw)
                  ? raw.map((i: any) => ({ name: i.name, qty: i.qty ?? 1, price: i.price ?? 0 }))
                  : []
              } catch {
                return []
              }
            })(),
            subtotal: Number(o.subtotal || 0),
            discount: Number(o.discount_amount || 0),
            total: Number(o.total_amount || 0),
            status: statusMap[o.status] || 'In Progress',
            deliveryTime: '',
            driverName: o.driver_name || undefined,
            driverPhone: o.driver_phone || undefined,
          }
          onOrders([parsed])
        }
      }
    },
  })
}

export function useApprovalUpdates(
  orderId: string | undefined,
  onStatus: (status: string) => void
) {
  return useWebSocket({
    channels: ['approval_update'],
    onMessage: (msg) => {
      if (msg.channel === 'approval_update') {
        const data = msg.data as any
        onStatus(data.status || 'pending')
      }
    },
  })
}

export function useDriverLocation(orderId: string | undefined, onLocation: (data: any) => void) {
  return useWebSocket({
    channels: ['driver_location'],
    customerId: orderId,
    onMessage: (msg) => {
      if (msg.channel === 'driver_location') {
        const data = msg.data as any
        if (data.orderId === orderId) {
          onLocation(data)
        }
      }
    },
  })
}
