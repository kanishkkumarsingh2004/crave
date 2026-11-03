export const REALTIME_CHANNELS = [
  'admin_settlements',
  'approval_update',
  'driver_offers',
  'menu_items',
  'order_update',
  'restaurants',
  'vendor_orders',
] as const

export type RealtimeChannel = (typeof REALTIME_CHANNELS)[number]

export interface RealtimeEnvelope<T = unknown> {
  channel: RealtimeChannel | 'control'
  data: T
  ts?: number
}

export interface RealtimeSubscription {
  channels: readonly RealtimeChannel[]
  orderId?: string
}

interface WebSocketEventLike {
  data: unknown
}

export interface WebSocketLike {
  onopen: (() => void) | null
  onmessage: ((event: WebSocketEventLike) => void) | null
  onerror: (() => void) | null
  onclose: (() => void) | null
  send(data: string): void
  close(): void
}

export interface RealtimeClientConfig {
  url: string | (() => string)
  token: string | (() => string | Promise<string>)
  subscriptions: readonly RealtimeSubscription[]
  onEvent: (channel: RealtimeChannel, data: unknown) => void
  onStatus?: (connected: boolean) => void
  onControl?: (data: unknown) => void
  reconnect?: {
    baseMs?: number
    factor?: number
    maxMs?: number
  }
  createSocket?: (url: string, protocols?: string[]) => WebSocketLike
  schedule?: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>
  cancelSchedule?: (timer: ReturnType<typeof setTimeout>) => void
}

export interface RealtimeClient {
  connect(): void
  disconnect(): void
  setActive(active: boolean): void
}

const CHANNELS = new Set<string>(REALTIME_CHANNELS)

export function parseRealtimeEnvelope(value: unknown): RealtimeEnvelope | null {
  let parsed: unknown = value
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value)
    } catch {
      return null
    }
  }
  if (!parsed || typeof parsed !== 'object') return null
  const envelope = parsed as Record<string, unknown>
  if (envelope.channel !== 'control' && !CHANNELS.has(String(envelope.channel))) return null
  return {
    channel: envelope.channel as RealtimeEnvelope['channel'],
    data: envelope.data,
    ...(typeof envelope.ts === 'number' ? { ts: envelope.ts } : {}),
  }
}

function defaultSocketFactory(url: string, protocols?: string[]): WebSocketLike {
  return (protocols ? new WebSocket(url, protocols) : new WebSocket(url)) as WebSocketLike
}

export function createRealtimeClient(config: RealtimeClientConfig): RealtimeClient {
  const createSocket = config.createSocket || defaultSocketFactory
  const schedule = config.schedule || ((callback, delay) => setTimeout(callback, delay))
  const cancelSchedule = config.cancelSchedule || clearTimeout
  const baseMs = config.reconnect?.baseMs ?? 1_500
  const factor = config.reconnect?.factor ?? 1.7
  const maxMs = config.reconnect?.maxMs ?? 30_000
  let socket: WebSocketLike | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let attempts = 0
  let enabled = false
  let active = true
  let generation = 0

  const reportStatus = (connected: boolean) => config.onStatus?.(connected)

  const clearReconnect = () => {
    if (reconnectTimer !== null) cancelSchedule(reconnectTimer)
    reconnectTimer = null
  }

  const closeSocket = () => {
    const current = socket
    socket = null
    if (current) {
      current.onopen = null
      current.onmessage = null
      current.onerror = null
      current.onclose = null
      current.close()
    }
  }

  const scheduleReconnect = () => {
    if (!enabled || !active || reconnectTimer !== null) return
    attempts += 1
    const delay = Math.min(maxMs, baseMs * factor ** attempts)
    reconnectTimer = schedule(() => {
      reconnectTimer = null
      void connect()
    }, delay)
  }

  const connect = async () => {
    if (!enabled || !active || socket || reconnectTimer !== null) return
    const currentGeneration = generation
    let nextSocket: WebSocketLike
    try {
      const token = await (typeof config.token === 'function' ? config.token() : config.token)
      if (!enabled || !active || currentGeneration !== generation) return
      const protocols = token.split('.').length === 3 ? ['crave.jwt', token] : undefined
      nextSocket = createSocket(
        typeof config.url === 'function' ? config.url() : config.url,
        protocols
      )
    } catch {
      if (currentGeneration !== generation) return
      reportStatus(false)
      scheduleReconnect()
      return
    }
    socket = nextSocket

    nextSocket.onopen = () => {
      if (socket !== nextSocket) return
      attempts = 0
      reportStatus(true)
      for (const subscription of config.subscriptions) {
        nextSocket.send(
          JSON.stringify({
            type: 'subscribe',
            channels: [...new Set(subscription.channels)],
            ...(subscription.orderId ? { orderId: subscription.orderId } : {}),
          })
        )
      }
    }
    nextSocket.onmessage = (event) => {
      const envelope = parseRealtimeEnvelope(event.data)
      if (!envelope) return
      if (envelope.channel === 'control') config.onControl?.(envelope.data)
      else config.onEvent(envelope.channel, envelope.data)
    }
    nextSocket.onerror = () => reportStatus(false)
    nextSocket.onclose = () => {
      if (socket !== nextSocket) return
      socket = null
      reportStatus(false)
      scheduleReconnect()
    }
  }

  return {
    connect() {
      enabled = true
      void connect()
    },
    disconnect() {
      enabled = false
      generation += 1
      clearReconnect()
      closeSocket()
      reportStatus(false)
    },
    setActive(nextActive) {
      if (active === nextActive) return
      active = nextActive
      generation += 1
      clearReconnect()
      closeSocket()
      reportStatus(false)
      if (enabled && active) void connect()
    },
  }
}
