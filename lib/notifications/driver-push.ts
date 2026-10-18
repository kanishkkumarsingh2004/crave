import { prisma } from '@/lib/prisma'
import { connect } from 'node:http2'
import { importPKCS8, SignJWT } from 'jose'

export interface DriverPushPayload {
  title: string
  body: string
  orderId?: string
  type?: string
  route?: string
}

interface FirebaseCredentials {
  projectId: string
  clientEmail: string
  privateKey: string
}

interface ApnsCredentials {
  keyId: string
  teamId: string
  privateKey: string
  bundleId: string
  production: boolean
}

let firebaseAccessToken: { value: string; expiresAt: number } | null = null
let apnsProviderToken: { value: string; expiresAt: number } | null = null

function normalizePrivateKey(value: string | undefined): string {
  return (value || '').replace(/\\n/g, '\n').trim()
}

function getFirebaseCredentials(): FirebaseCredentials | null {
  let serviceAccount: Record<string, unknown> = {}
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()
  if (encoded) {
    try {
      serviceAccount = JSON.parse(encoded)
    } catch {
      return null
    }
  }

  const projectId = String(
    serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID || ''
  ).trim()
  const clientEmail = String(
    serviceAccount.client_email || process.env.FIREBASE_CLIENT_EMAIL || ''
  ).trim()
  const privateKey = normalizePrivateKey(
    String(serviceAccount.private_key || process.env.FIREBASE_PRIVATE_KEY || '')
  )
  if (!projectId || !clientEmail || !privateKey) return null
  return { projectId, clientEmail, privateKey }
}

function getApnsCredentials(): ApnsCredentials | null {
  const keyId = process.env.APNS_KEY_ID?.trim() || ''
  const teamId = process.env.APNS_TEAM_ID?.trim() || ''
  const privateKey = normalizePrivateKey(process.env.APNS_PRIVATE_KEY)
  const bundleId = process.env.APNS_BUNDLE_ID?.trim() || 'com.crave.driver'
  if (!keyId || !teamId || !privateKey || !bundleId) return null
  return {
    keyId,
    teamId,
    privateKey,
    bundleId,
    production: process.env.APNS_PRODUCTION !== 'false',
  }
}

async function getFirebaseAccessToken(credentials: FirebaseCredentials): Promise<string> {
  if (firebaseAccessToken && firebaseAccessToken.expiresAt > Date.now() + 60_000) {
    return firebaseAccessToken.value
  }

  const now = Math.floor(Date.now() / 1000)
  const key = await importPKCS8(credentials.privateKey, 'RS256')
  const assertion = await new SignJWT({
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(credentials.clientEmail)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key)

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })
  const result = (await response.json().catch(() => ({}))) as {
    access_token?: string
    expires_in?: number
  }
  if (!response.ok || !result.access_token) {
    throw new Error(`Firebase authentication failed with status ${response.status}`)
  }
  firebaseAccessToken = {
    value: result.access_token,
    expiresAt: Date.now() + Number(result.expires_in || 3600) * 1000,
  }
  return result.access_token
}

async function sendFirebasePush(
  token: string,
  payload: DriverPushPayload,
  credentials: FirebaseCredentials
): Promise<{ delivered: boolean; invalid: boolean }> {
  const accessToken = await getFirebaseAccessToken(credentials)
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(credentials.projectId)}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title: payload.title, body: payload.body },
          data: {
            type: payload.type || 'driver_update',
            orderId: payload.orderId || '',
            route: payload.route || 'home',
          },
          android: {
            priority: 'high',
            ttl: '3600s',
            notification: {
              channel_id: 'driver-orders',
              icon: 'ic_stat_crave',
              sound: 'default',
              tag: payload.orderId || 'driver-update',
            },
          },
        },
      }),
    }
  )

  if (response.ok) return { delivered: true, invalid: false }
  const result = (await response.json().catch(() => ({}))) as any
  const errorCode = String(result?.error?.details?.[0]?.errorCode || '')
  return {
    delivered: false,
    invalid:
      response.status === 404 || errorCode === 'UNREGISTERED' || errorCode === 'INVALID_ARGUMENT',
  }
}

async function getApnsProviderToken(credentials: ApnsCredentials): Promise<string> {
  if (apnsProviderToken && apnsProviderToken.expiresAt > Date.now() + 60_000) {
    return apnsProviderToken.value
  }
  const now = Math.floor(Date.now() / 1000)
  const key = await importPKCS8(credentials.privateKey, 'ES256')
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: credentials.keyId })
    .setIssuer(credentials.teamId)
    .setIssuedAt(now)
    .sign(key)
  apnsProviderToken = { value: token, expiresAt: Date.now() + 50 * 60 * 1000 }
  return token
}

async function sendApnsPush(
  token: string,
  payload: DriverPushPayload,
  credentials: ApnsCredentials
): Promise<{ delivered: boolean; invalid: boolean }> {
  const providerToken = await getApnsProviderToken(credentials)
  const origin = credentials.production
    ? 'https://api.push.apple.com'
    : 'https://api.sandbox.push.apple.com'

  return new Promise((resolve) => {
    const client = connect(origin)
    let settled = false
    const finish = (result: { delivered: boolean; invalid: boolean }) => {
      if (settled) return
      settled = true
      client.close()
      resolve(result)
    }
    const timer = setTimeout(() => finish({ delivered: false, invalid: false }), 15_000)
    client.on('error', () => {
      clearTimeout(timer)
      finish({ delivered: false, invalid: false })
    })

    const request = client.request({
      ':method': 'POST',
      ':path': `/3/device/${encodeURIComponent(token)}`,
      authorization: `bearer ${providerToken}`,
      'apns-topic': credentials.bundleId,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'apns-expiration': String(Math.floor(Date.now() / 1000) + 3600),
    })
    let status = 0
    let responseBody = ''
    request.setEncoding('utf8')
    request.on('response', (headers) => {
      status = Number(headers[':status'] || 0)
    })
    request.on('data', (chunk) => {
      responseBody += chunk
    })
    request.on('end', () => {
      clearTimeout(timer)
      let reason = ''
      try {
        reason = JSON.parse(responseBody)?.reason || ''
      } catch {}
      finish({
        delivered: status === 200,
        invalid: status === 410 || reason === 'BadDeviceToken' || reason === 'Unregistered',
      })
    })
    request.on('error', () => {
      clearTimeout(timer)
      finish({ delivered: false, invalid: false })
    })
    request.end(
      JSON.stringify({
        aps: {
          alert: { title: payload.title, body: payload.body },
          sound: 'default',
          'thread-id': payload.orderId || 'driver-update',
        },
        type: payload.type || 'driver_update',
        orderId: payload.orderId || '',
        route: payload.route || 'home',
      })
    )
  })
}

async function sendToTokens(
  tokens: Array<{ id: string; token: string; platform: string }>,
  payload: DriverPushPayload
) {
  const firebase = getFirebaseCredentials()
  const apns = getApnsCredentials()
  let sent = 0
  let failed = 0
  let disabled = 0

  await Promise.all(
    tokens.map(async (device) => {
      try {
        let result: { delivered: boolean; invalid: boolean }
        if (device.platform === 'android') {
          if (!firebase) {
            disabled += 1
            return
          }
          result = await sendFirebasePush(device.token, payload, firebase)
        } else if (device.platform === 'ios') {
          if (!apns) {
            disabled += 1
            return
          }
          result = await sendApnsPush(device.token, payload, apns)
        } else {
          disabled += 1
          return
        }

        if (result.delivered) sent += 1
        else failed += 1
        if (result.invalid) {
          await prisma.driverPushToken.update({
            where: { id: device.id },
            data: { is_active: false, last_seen_at: new Date() },
          })
        }
      } catch (error) {
        failed += 1
        console.error('[driver-push] Notification delivery failed:', error)
      }
    })
  )

  return { sent, failed, disabled }
}

export async function sendDriverPushToUsers(userIds: string[], payload: DriverPushPayload) {
  const ids = [...new Set(userIds.filter(Boolean))]
  if (ids.length === 0) return { sent: 0, failed: 0, disabled: 0 }
  const tokens = await prisma.driverPushToken.findMany({
    where: { driver_id: { in: ids }, is_active: true },
    select: { id: true, token: true, platform: true },
  })
  return sendToTokens(tokens, payload)
}

export async function sendDriverPushToAll(payload: DriverPushPayload) {
  const tokens = await prisma.driverPushToken.findMany({
    where: { is_active: true },
    select: { id: true, token: true, platform: true },
  })
  return sendToTokens(tokens, payload)
}
