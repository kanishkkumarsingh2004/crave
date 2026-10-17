import { prisma } from '@/lib/prisma'
import type { UserRole } from '@prisma/client'
import webPush, { WebPushError, type PushSubscription } from 'web-push'

export interface WebPushPayload {
  title: string
  body: string
  url?: string
  tag?: string
  orderId?: string
}

function getVapidConfig() {
  const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY?.trim()
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim()
  const subject = process.env.WEB_PUSH_VAPID_SUBJECT?.trim()

  if (!publicKey || !privateKey || !subject) return null
  if (!subject.startsWith('mailto:') && !subject.startsWith('https://')) return null

  return { publicKey, privateKey, subject }
}

export function getWebPushPublicKey(): string | null {
  return getVapidConfig()?.publicKey ?? null
}

export function isWebPushConfigured(): boolean {
  return getVapidConfig() !== null
}

export async function sendWebPushToUsers(userIds: string[], payload: WebPushPayload) {
  const config = getVapidConfig()
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))]
  if (!config || uniqueUserIds.length === 0) return { sent: 0, failed: 0, disabled: !config }

  const subscriptions = await prisma.webPushSubscription.findMany({
    where: { user_id: { in: uniqueUserIds }, is_active: true },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  })

  let sent = 0
  let failed = 0

  await Promise.all(
    subscriptions.map(async (subscription) => {
      const pushSubscription: PushSubscription = {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      }

      try {
        await webPush.sendNotification(pushSubscription, JSON.stringify(payload), {
          TTL: 60 * 60,
          urgency: 'high',
          vapidDetails: config,
        })
        sent += 1
      } catch (error) {
        failed += 1
        if (
          error instanceof WebPushError &&
          (error.statusCode === 404 || error.statusCode === 410)
        ) {
          await prisma.webPushSubscription.update({
            where: { id: subscription.id },
            data: { is_active: false, last_seen_at: new Date() },
          })
          return
        }
        console.error('[web-push] Notification delivery failed:', error)
      }
    })
  )

  return { sent, failed, disabled: false }
}

export async function sendWebPushToRoles(roles: UserRole[], payload: WebPushPayload) {
  const users = await prisma.user.findMany({
    where: { role: { in: [...new Set(roles)] } },
    select: { id: true },
  })
  return sendWebPushToUsers(
    users.map((user) => user.id),
    payload
  )
}
