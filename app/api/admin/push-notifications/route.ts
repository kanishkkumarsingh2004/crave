import { handleApiAuthError, requireAdmin } from '@/lib/api-auth'
import { sendDriverPushToAll } from '@/lib/notifications/driver-push'
import { isWebPushConfigured, sendWebPushToRoles } from '@/lib/web-push'
import type { UserRole } from '@prisma/client'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const AUDIENCE_ROLES: Record<string, UserRole[]> = {
  customer: ['user'],
  driver: ['rider'],
  restaurant: ['restaurant_vendor', 'cravexp_store_vendor'],
}
const PRODUCTION_ORIGIN = 'https://crave.apexonestudio.com'

export async function POST(request: Request) {
  try {
    await requireAdmin(request)
    const nativeApp = request.headers.get('x-crave-native-app')?.trim().toLowerCase()
    const userAgent = request.headers.get('user-agent')?.toLowerCase() || ''
    if (nativeApp !== 'admin' || !userAgent.includes('craveadmin/')) {
      return NextResponse.json(
        { error: 'App notifications can only be sent from the Crave Admin app.' },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const audience = typeof body.audience === 'string' ? body.audience.trim().toLowerCase() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    const title = typeof body.title === 'string' ? body.title.trim() : ''

    if (!AUDIENCE_ROLES[audience]) {
      return NextResponse.json(
        { error: 'Choose a valid recipient group: customer, driver, or restaurant.' },
        { status: 400 }
      )
    }
    if (!description || description.length > 500) {
      return NextResponse.json(
        { error: 'Enter a description between 1 and 500 characters.' },
        { status: 400 }
      )
    }
    if (!title || title.length > 80) {
      return NextResponse.json({ error: 'The notification title is too long.' }, { status: 400 })
    }

    const payload = {
      title,
      body: description,
      url:
        PRODUCTION_ORIGIN +
        (audience === 'customer'
          ? '/user/dashboard'
          : audience === 'driver'
            ? '/driver/dashboard'
            : '/vendor/dashboard'),
      tag: `admin-broadcast-${audience}-${Date.now()}`,
    }
    const webResult = isWebPushConfigured()
      ? await sendWebPushToRoles(AUDIENCE_ROLES[audience], payload)
      : { sent: 0, failed: 0, disabled: true }
    const nativeDriverResult =
      audience === 'driver'
        ? await sendDriverPushToAll({
            title,
            body: description,
            type: 'admin_broadcast',
            route: 'home',
          })
        : { sent: 0, failed: 0, disabled: 0 }
    const result = {
      sent: webResult.sent + nativeDriverResult.sent,
      failed: webResult.failed + nativeDriverResult.failed,
      disabled: webResult.disabled && nativeDriverResult.disabled > 0,
    }

    if (result.sent === 0) {
      return NextResponse.json(
        {
          error: isWebPushConfigured()
            ? `No active ${audience} notification devices were found.`
            : audience === 'driver'
              ? 'Push providers are not configured and no active driver devices were found.'
              : 'Web Push is not configured or no active devices were found for this group.',
        },
        { status: 409 }
      )
    }

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    const authResponse = handleApiAuthError(error)
    if (authResponse) return authResponse
    console.error('[POST /api/admin/push-notifications]', error)
    return NextResponse.json({ error: 'Unable to send app notification' }, { status: 500 })
  }
}
