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

let localBroadcastChannel: BroadcastChannel | null = null
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    localBroadcastChannel = new BroadcastChannel('crave_live_channel')
  } catch (e) {}
}

export function publishLiveEvent(channel: string, data: any) {
  if (localBroadcastChannel) {
    try {
      localBroadcastChannel.postMessage({ channel, data, ts: Date.now() })
    } catch (e) {}
  }
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

    // Listen to local BroadcastChannel for zero-latency client-side events
    const handleBroadcastMessage = (event: MessageEvent) => {
      try {
        const msg: WSMessage = event.data
        if (channels.includes(msg.channel)) {
          onMessage?.(msg)
        }
      } catch (e) {}
    }

    if (localBroadcastChannel) {
      localBroadcastChannel.addEventListener('message', handleBroadcastMessage)
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl =
      process.env.NEXT_PUBLIC_WS_URL ||
      (typeof window !== 'undefined'
        ? `${protocol}//${window.location.host}/api/ws`
        : `ws://localhost:3000/api/ws`)

    let attemptCount = 0

    const connect = () => {
      try {
        const ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onopen = () => {
          setConnected(true)
          attemptCount = 0
          onConnect?.()
          try {
            ws.send(
              JSON.stringify({
                type: 'subscribe',
                channels,
                customerId,
                driverId,
              })
            )
          } catch (e) {}
        }

        ws.onmessage = (event) => {
          try {
            const msg: WSMessage = JSON.parse(event.data)
            onMessage?.(msg)
          } catch (e) {}
        }

        ws.onclose = () => {
          setConnected(false)
          onDisconnect?.()
          if (wsRef.current === ws) {
            wsRef.current = null
          }

          if (autoReconnect) {
            attemptCount++
            const backoffMs = Math.min(30000, Math.round(reconnectInterval * Math.pow(1.5, Math.min(attemptCount, 5))))
            reconnectRef.current = setTimeout(() => {
              connect()
            }, backoffMs)
          }
        }

        ws.onerror = () => {
          setConnected(false)
        }
      } catch (err) {
        setConnected(false)
      }
    }

    connect()

    return () => {
      if (localBroadcastChannel) {
        localBroadcastChannel.removeEventListener('message', handleBroadcastMessage)
      }
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
      if (wsRef.current) {
        const socket = wsRef.current
        wsRef.current = null
        if (socket.readyState === WebSocket.CONNECTING) {
          socket.onopen = () => {
            try {
              socket.close()
            } catch (e) {}
          }
          socket.onerror = () => {}
        } else if (socket.readyState === WebSocket.OPEN) {
          try {
            socket.close()
          } catch (e) {}
        }
      }
    }
  }, [channels.join(','), customerId, driverId, autoReconnect, reconnectInterval])

  const sendMessage = (type: string, data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, ...data }))
    }
    publishLiveEvent(channels[0] || 'control', data)
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
        if (!data.orderId || !orderId || data.orderId === orderId) {
          onLocation(data)
        }
      }
    },
  })
}

export function useAdminStatsUpdates(onEvent: (data: any) => void) {
  return useWebSocket({
    channels: ['admin_stats', 'admin_users'],
    onMessage: (msg) => {
      if (msg.channel === 'admin_stats' || msg.channel === 'admin_users') {
        onEvent(msg.data)
      }
    },
  })
}

export function playChimeSound() {
  try {
    if (typeof window === 'undefined') return
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(587.33, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.3)
  } catch (e) {}
}

export function useVendorOrderUpdates(onOrderEvent: (data: any) => void) {
  return useWebSocket({
    channels: ['order_update', 'admin_orders'],
    onMessage: (msg) => {
      if (msg.channel === 'order_update' || msg.channel === 'admin_orders') {
        onOrderEvent(msg.data)
      }
    },
  })
}
