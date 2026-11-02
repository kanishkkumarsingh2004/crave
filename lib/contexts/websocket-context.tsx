import { apiFetch } from '@/lib/client/api-fetch'
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
  orderId?: string
  onMessage?: (msg: WSMessage) => void
  onConnect?: () => void
  onReconnect?: () => void
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
  orderId,
  onMessage,
  onConnect,
  onReconnect,
  onDisconnect,
  autoReconnect = true,
  reconnectInterval = 5000,
}: UseWebSocketOptions) {
  const [connected, setConnected] = useState(false)
  const wsRef: any = useRef(null)
  const reconnectRef: any = useRef(null)
  const hasConnectedOnceRef = useRef(false)

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
    const defaultPort = process.env.NEXT_PUBLIC_WS_PORT || '8000'
    const wsUrl =
      process.env.NEXT_PUBLIC_WS_URL ||
      (typeof window !== 'undefined'
        ? window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
          ? `${protocol}//${window.location.hostname}:${defaultPort}`
          : `${protocol}//${window.location.host}/api/ws`
        : `ws://localhost:8000`)

    let attemptCount = 0

    const connect = () => {
      try {
        const ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onopen = () => {
          setConnected(true)
          const isReconnect = hasConnectedOnceRef.current
          hasConnectedOnceRef.current = true
          attemptCount = 0
          onConnect?.()
          if (isReconnect) {
            onReconnect?.()
          }
          try {
            ws.send(
              JSON.stringify({
                type: 'subscribe',
                channels,
                customerId,
                driverId,
                orderId,
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
            const backoffMs = Math.min(
              30000,
              Math.round(reconnectInterval * Math.pow(1.5, Math.max(0, attemptCount - 1)))
            )
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
  }, [channels.join(','), customerId, driverId, orderId, autoReconnect, reconnectInterval])

  const sendMessage = (type: string, data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, ...data }))
    }
    publishLiveEvent(channels[0] || 'control', data)
  }

  return { connected, sendMessage }
}

export function useOrderUpdates(
  customerId: string | undefined,
  onOrders: (orders: any[]) => void,
  orderId?: string
) {
  const lastSyncTimeRef = useRef<string | null>(null)

  const syncState = () => {
    if (typeof window === 'undefined') return
    const sinceParam = lastSyncTimeRef.current
      ? `&since=${encodeURIComponent(lastSyncTimeRef.current)}`
      : ''

    if (orderId) {
      fetch(`/api/orders?orderId=${encodeURIComponent(orderId)}${sinceParam}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.serverTime) lastSyncTimeRef.current = data.serverTime
          if (data?.order) {
            onOrders([data.order])
          }
        })
        .catch(() => {})
    } else if (customerId) {
      fetch(`/api/orders?customerId=${encodeURIComponent(customerId)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.orders && Array.isArray(data.orders)) {
            onOrders(data.orders)
          }
        })
        .catch(() => {})
    }
  }

  // Periodic polling fallback ensuring continuous live status updates even without WebSockets
  useEffect(() => {
    if (typeof window === 'undefined') return
    syncState()
    const timer = setInterval(syncState, 3500)
    return () => clearInterval(timer)
  }, [customerId, orderId])

  return useWebSocket({
    channels: ['order_update'],
    customerId,
    orderId,
    onConnect: syncState,
    onReconnect: syncState,
    onMessage: (msg) => {
      if (msg.channel === 'order_update') {
        const data = msg.data as any
        if (
          customerId &&
          data.order &&
          data.order.customer_id &&
          data.order.customer_id !== customerId
        ) {
          return
        }
        if (data.orders && Array.isArray(data.orders)) {
          const filtered = customerId
            ? data.orders.filter((o: any) => !o.customer_id || o.customer_id === customerId)
            : data.orders
          if (filtered.length > 0) onOrders(filtered)
        } else if (data.order) {
          onOrders([data.order])
        } else if (data.orderId && data.status) {
          onOrders([{ id: data.orderId, status: data.status, driver_name: data.driver_name, driver_phone: data.driver_phone }])
        }
      }
    },
  })
}

export function useApprovalUpdates(
  orderId: string | undefined,
  onStatus: (status: string) => void
) {
  const syncApprovalState = () => {
    if (orderId && typeof window !== 'undefined') {
      fetch(`/api/orders?orderId=${encodeURIComponent(orderId)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.order?.status) {
            onStatus(data.order.status)
          }
        })
        .catch(() => {})
    }
  }

  return useWebSocket({
    channels: ['approval_update'],
    orderId,
    onConnect: syncApprovalState,
    onReconnect: syncApprovalState,
    onMessage: (msg) => {
      if (msg.channel === 'approval_update') {
        const data = msg.data as any
        if (orderId && data.orderId && data.orderId !== orderId && data.targetOrderId !== orderId) {
          return
        }
        onStatus(data.status || 'pending')
      }
    },
  })
}

export function useDriverLocation(orderId: string | undefined, onLocation: (data: any) => void) {
  const syncLocation = () => {
    if (orderId && typeof window !== 'undefined') {
      fetch(`/api/orders?orderId=${encodeURIComponent(orderId)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.driverLocation) {
            onLocation({
              orderId,
              driverId: data.driverLocation.driverId,
              lat: Number(data.driverLocation.lat),
              lng: Number(data.driverLocation.lng),
              status: data.driverLocation.status,
              isStale: data.driverLocation.isStale || false,
              staleDurationSeconds: data.driverLocation.staleDurationSeconds || 0,
              timestamp: new Date(data.driverLocation.lastUpdated || Date.now()).toISOString(),
            })
          }
        })
        .catch(() => {})
    }
  }

  // Periodic polling fallback ensuring continuous live driver coordinates
  useEffect(() => {
    if (!orderId || typeof window === 'undefined') return
    syncLocation()
    const timer = setInterval(syncLocation, 3000)
    return () => clearInterval(timer)
  }, [orderId])

  return useWebSocket({
    channels: ['driver_location'],
    customerId: orderId,
    orderId,
    onConnect: syncLocation,
    onReconnect: syncLocation,
    onMessage: (msg) => {
      if (msg.channel === 'driver_location') {
        const data = msg.data as any
        if (!data.orderId || !orderId || data.orderId === orderId || (data.lat != null && data.lng != null)) {
          onLocation({
            ...data,
            lat: Number(data.lat),
            lng: Number(data.lng),
          })
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
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }
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
    channels: ['vendor_orders'],
    onMessage: (msg) => {
      if (msg.channel === 'vendor_orders') {
        onOrderEvent(msg.data)
      }
    },
  })
}

export function useMenuItemUpdates(
  restaurantId: string | undefined,
  onItemUpdate: (item: any) => void
) {
  // Adaptive polling fallback every 4s when a restaurant menu is open
  useEffect(() => {
    if (!restaurantId || typeof window === 'undefined') return
    const syncMenu = () => {
      fetch(`/api/menu-items?restaurantId=${encodeURIComponent(restaurantId)}`, { cache: 'no-store' })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.items && Array.isArray(data.items)) {
            data.items.forEach((item: any) => onItemUpdate(item))
          }
        })
        .catch(() => {})
    }
    const interval = setInterval(syncMenu, 4000)
    return () => clearInterval(interval)
  }, [restaurantId, onItemUpdate])

  return useWebSocket({
    channels: ['menu_items'],
    onMessage: (msg) => {
      if (msg.channel === 'menu_items') {
        const data = msg.data as any
        const item = data?.item || data
        if (!restaurantId || !item?.restaurant_id || item.restaurant_id === restaurantId) {
          onItemUpdate(item)
        }
      }
    },
  })
}

