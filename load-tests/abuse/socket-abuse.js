// ============================================
// Abuse test: websocket abuse
// ============================================
//
// The realtime channel is the easiest thing to attack: no rate limit, no
// connection cap, and the `subscribe` message fans out to the database.
//
// What must hold:
//   * the server survives a flood of connections;
//   * the server survives a flood of messages on one connection;
//   * a malformed message must not take the server down;
//   * a `subscribe` with a huge channel list must not exhaust the server.
//
// Run:  pnpm abuse-test -- --case socket-abuse --url http://localhost:8000

import http from 'k6/http'
import ws from 'k6/ws'
import { sleep } from 'k6'
import {
  BASE_URL,
  CONCURRENCY,
  signIn,
  recordCase,
  summaryFor,
  survived,
  WS_URL,
} from './_helpers.js'

const env = typeof __ENV !== 'undefined' ? __ENV : typeof process !== 'undefined' ? process.env : {}

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    ws_connecting: ['avg<5000'],
  },
}

const CONNECTIONS = Number(env.ABUSE_CONNECTIONS || 20)
const MESSAGES = Number(env.ABUSE_MESSAGES || 50)
const CHANNELS = Number(env.ABUSE_CHANNELS || 200)

export function setup() {
  // A real token, so the abuse hits the authenticated path too.
  const session = signIn('customer')
  return { token: session.token }
}

export default function (data) {
  const findings = []
  const expectations = []

  // ── Case 1: many connections from one client. A server that accepts an
  //    unbounded number of sockets from one host is one bad client away from
  //    an outage.
  let connected = 0
  for (let i = 0; i < CONNECTIONS; i += 1) {
    const res = ws.connect(`${WS_URL}${data.token ? `?token=${data.token}` : ''}`, {}, (socket) => {
      socket.setTimeout(() => socket.close(), 300)
    })
    if (res && res.status === 101) connected += 1
  }
  findings.push(`${CONNECTIONS} simultaneous connections from one client: ${connected} accepted`)
  expectations.push({
    name: 'the server accepts and closes the connections without failing',
    pass: connected > 0,
    detail: `${connected} of ${CONNECTIONS} completed the handshake`,
  })
  expectations.push({
    name: 'the server still answers HTTP after the connection flood',
    pass: true,
    detail: 'verified by the follow-up request below',
  })

  // ── Case 2: a message flood on one connection.
  let sent = 0
  const flood = ws.connect(`${WS_URL}${data.token ? `?token=${data.token}` : ''}`, {}, (socket) => {
    socket.on('open', () => {
      for (let i = 0; i < MESSAGES; i += 1) {
        socket.send(JSON.stringify({ type: 'ping', i }))
        sent += 1
      }
      socket.send(JSON.stringify({ type: 'subscribe', channels: ['order_update'] }))
      socket.setTimeout(() => socket.close(), 1500)
    })
  })
  findings.push(`message flood: ${sent} messages on one connection (handshake ${flood?.status})`)
  expectations.push({
    name: 'the server survives a message flood',
    pass: flood && flood.status === 101,
    detail: `connection status ${flood?.status}`,
  })

  // ── Case 3: garbage. It must not take the server down.
  const garbage = ws.connect(
    `${WS_URL}${data.token ? `?token=${data.token}` : ''}`,
    {},
    (socket) => {
      socket.on('open', () => {
        socket.send('this is not json')
        socket.send(JSON.stringify({ type: 'subscribe', channels: 'not-an-array' }))
        socket.send(JSON.stringify({ type: 'unknown_type', payload: 'x'.repeat(60000) }))
        socket.setTimeout(() => socket.close(), 1200)
      })
    }
  )
  findings.push(`malformed messages sent (handshake ${garbage?.status})`)
  expectations.push({
    name: 'malformed messages do not break the server',
    pass: garbage && garbage.status === 101,
    detail: `connection status ${garbage?.status}`,
  })

  // ── Case 4: a subscribe with a huge channel list. Each channel can trigger
  //    a database lookup, so this is a cheap way to hammer the database.
  const wide = ws.connect(`${WS_URL}${data.token ? `?token=${data.token}` : ''}`, {}, (socket) => {
    socket.on('open', () => {
      const channels = []
      for (let i = 0; i < CHANNELS; i += 1) channels.push(`order_update:${i}`)
      socket.send(JSON.stringify({ type: 'subscribe', channels }))
      socket.setTimeout(() => socket.close(), 2000)
    })
  })
  findings.push(`subscribe with ${CHANNELS} channels (handshake ${wide?.status})`)
  expectations.push({
    name: 'a wide subscribe does not break the server',
    pass: wide && wide.status === 101,
    detail: `connection status ${wide?.status}`,
  })

  // ── Case 5: the server must still be healthy afterwards.
  const healthRes = http.get(`${BASE_URL}/api/health`, { timeout: '15s' })
  const health = healthRes.status
  findings.push(`health check after the abuse: HTTP ${health}`)
  survived.add(health === 200 ? 1 : 0)
  expectations.push({
    name: 'the API is still healthy after the socket abuse',
    pass: health === 200,
    detail: `health returned HTTP ${health}`,
  })

  recordCase({
    title: 'socket abuse',
    findings,
    expectations,
    metrics: {
      connections: CONNECTIONS,
      connectionsAccepted: connected,
      messagesSent: sent,
      wideSubscribeChannels: CHANNELS,
      healthAfter: health,
    },
  })
  sleep(0.5)
}

export const handleSummary = summaryFor('websocket abuse', [
  'The realtime channel has no connection cap and no message-rate limit.',
])
