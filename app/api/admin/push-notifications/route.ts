import { handleApiAuthError, requireAdmin } from '@/lib/api-auth'
import { isWebPushConfigured, sendWebPushToUsers } from '@/lib/web-push'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request)
    if (!isWebPushConfigured()) {
      return NextResponse.json({ error: 'Web Push VAPID keys are not configured' }, { status: 503 })
    }

    const result = await sendWebPushToUsers([admin.id], {
      title: 'Crave admin test notification',
      body: `Push notifications are working for ${admin.name || admin.email}.`,
      url: '/admin/settings',
      tag: `admin-push-test-${Date.now()}`,
    })

    if (result.sent === 0) {
      return NextResponse.json(
        { error: 'No active subscription found. Enable notifications on this device first.' },
        { status: 409 }
      )
    }

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    const authResponse = handleApiAuthError(error)
    if (authResponse) return authResponse
    console.error('[POST /api/admin/push-notifications]', error)
    return NextResponse.json({ error: 'Unable to send test push notification' }, { status: 500 })
  }
}
