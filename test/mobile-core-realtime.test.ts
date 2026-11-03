import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createRealtimeClient,
  parseRealtimeEnvelope,
  type WebSocketLike,
} from '../packages/mobile-core/src/index'

class TestSocket implements WebSocketLike {
  onopen: (() => void) | null = null
  onmessage: ((event: { data: unknown }) => void) | null = null
  onerror: (() => void) | null = null
  onclose: (() => void) | null = null
  readonly sent: string[] = []
  closed = false

  send(data: string) {
    this.sent.push(data)
  }

  close() {
    this.closed = true
  }
}

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))

test('realtime envelopes reject malformed and unknown-channel messages', () => {
  assert.equal(parseRealtimeEnvelope('{broken'), null)
  assert.equal(parseRealtimeEnvelope({ channel: 'private_channel', data: {} }), null)
  assert.deepEqual(parseRealtimeEnvelope('{"channel":"order_update","data":{"id":"1"}}'), {
    channel: 'order_update',
    data: { id: '1' },
  })
})

test('realtime client authenticates, subscribes, and routes validated events', async () => {
  const sockets: TestSocket[] = []
  const connections: Array<{ url: string; protocols?: string[] }> = []
  const events: Array<{ channel: string; data: unknown }> = []
  const controls: unknown[] = []
  const statuses: boolean[] = []
  const client = createRealtimeClient({
    url: () => 'wss://api.example.test/api/ws',
    token: async () => 'header.payload.signature',
    subscriptions: [
      { channels: ['order_update', 'order_update', 'approval_update'], orderId: 'order-1' },
    ],
    onEvent: (channel, data) => events.push({ channel, data }),
    onControl: (data) => controls.push(data),
    onStatus: (connected) => statuses.push(connected),
    createSocket: (url, protocols) => {
      connections.push({ url, protocols })
      const socket = new TestSocket()
      sockets.push(socket)
      return socket
    },
  })

  client.connect()
  await flushPromises()
  assert.deepEqual(connections, [
    { url: 'wss://api.example.test/api/ws', protocols: ['crave.jwt', 'header.payload.signature'] },
  ])

  sockets[0].onopen?.()
  assert.deepEqual(statuses, [true])
  assert.deepEqual(JSON.parse(sockets[0].sent[0]), {
    type: 'subscribe',
    channels: ['order_update', 'approval_update'],
    orderId: 'order-1',
  })

  sockets[0].onmessage?.({ data: '{invalid' })
  sockets[0].onmessage?.({ data: JSON.stringify({ channel: 'unknown', data: true }) })
  sockets[0].onmessage?.({ data: JSON.stringify({ channel: 'control', data: { type: 'ready' } }) })
  sockets[0].onmessage?.({
    data: JSON.stringify({ channel: 'order_update', data: { id: 'order-1' } }),
  })
  assert.deepEqual(controls, [{ type: 'ready' }])
  assert.deepEqual(events, [{ channel: 'order_update', data: { id: 'order-1' } }])

  client.disconnect()
  assert.equal(sockets[0].closed, true)
  assert.equal(sockets[0].onmessage, null, 'disconnect removes message listeners')
  assert.deepEqual(statuses, [true, false])
})

test('realtime client retries token or socket setup failures without an unhandled rejection', async () => {
  const delays: number[] = []
  const callbacks: Array<() => void> = []
  let tokenAttempts = 0
  const client = createRealtimeClient({
    url: 'wss://api.example.test/api/ws',
    token: async () => {
      tokenAttempts += 1
      if (tokenAttempts === 1) throw new Error('secure storage unavailable')
      return ''
    },
    subscriptions: [],
    onEvent: () => {},
    createSocket: () => new TestSocket(),
    schedule: (callback, delay) => {
      callbacks.push(callback)
      delays.push(delay)
      return callbacks.length as unknown as ReturnType<typeof setTimeout>
    },
    cancelSchedule: () => {},
  })

  client.connect()
  await flushPromises()
  assert.deepEqual(delays, [2_550])
  callbacks[0]()
  await flushPromises()
  assert.equal(tokenAttempts, 2)
  client.disconnect()
})

test('realtime client reconnects once, replays subscriptions, and stops cleanly', async () => {
  const sockets: TestSocket[] = []
  const delays: number[] = []
  const callbacks: Array<() => void> = []
  const client = createRealtimeClient({
    url: 'wss://api.example.test/api/ws',
    token: '',
    subscriptions: [{ channels: ['driver_offers'] }],
    onEvent: () => {},
    createSocket: () => {
      const socket = new TestSocket()
      sockets.push(socket)
      return socket
    },
    reconnect: { baseMs: 1_000, factor: 2, maxMs: 5_000 },
    schedule: (callback, delay) => {
      callbacks.push(callback)
      delays.push(delay)
      return callbacks.length as unknown as ReturnType<typeof setTimeout>
    },
    cancelSchedule: () => {},
  })

  client.connect()
  await flushPromises()
  sockets[0].onopen?.()
  sockets[0].onclose?.()
  sockets[0].onclose?.()
  assert.deepEqual(delays, [2_000], 'one close event schedules one reconnect')

  callbacks[0]()
  await flushPromises()
  assert.equal(sockets.length, 2)
  sockets[1].onopen?.()
  assert.deepEqual(JSON.parse(sockets[1].sent[0]), {
    type: 'subscribe',
    channels: ['driver_offers'],
  })

  sockets[1].onclose?.()
  assert.deepEqual(delays, [2_000, 2_000], 'a successful connection resets backoff attempts')
  client.disconnect()
  callbacks[1]()
  await flushPromises()
  assert.equal(sockets.length, 2, 'manual disconnect prevents pending reconnect work')
})

test('realtime client pauses and reconnects across app activity changes', async () => {
  const sockets: TestSocket[] = []
  const client = createRealtimeClient({
    url: 'wss://api.example.test/api/ws',
    token: '',
    subscriptions: [],
    onEvent: () => {},
    createSocket: () => {
      const socket = new TestSocket()
      sockets.push(socket)
      return socket
    },
  })

  client.connect()
  await flushPromises()
  client.setActive(false)
  assert.equal(sockets[0].closed, true)
  client.setActive(true)
  await flushPromises()
  assert.equal(sockets.length, 2)
  client.disconnect()
})
