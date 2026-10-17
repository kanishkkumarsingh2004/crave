import { handleApiAuthError, requireAuthApi } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { getWebPushPublicKey } from '@/lib/web-push'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    await requireAuthApi(request)
    const publicKey = getWebPushPublicKey()
    return NextResponse.json({ configured: Boolean(publicKey), publicKey })
  } catch (error) {
    const authResponse = handleApiAuthError(error)
    if (authResponse) return authResponse
    console.error('[GET /api/push/subscriptions]', error)
    return NextResponse.json({ error: 'Unable to load push configuration' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAuthApi(request)
    const body = await request.json()
    const endpoint = typeof body.endpoint === 'string' ? body.endpoint.trim() : ''
    const p256dh = typeof body.keys?.p256dh === 'string' ? body.keys.p256dh.trim() : ''
    const auth = typeof body.keys?.auth === 'string' ? body.keys.auth.trim() : ''

    if (!getWebPushPublicKey()) {
      return NextResponse.json({ error: 'Web Push is not configured' }, { status: 503 })
    }
    if (!endpoint || endpoint.length > 4096 || !endpoint.startsWith('https://')) {
      return NextResponse.json(
        { error: 'A valid HTTPS push endpoint is required' },
        { status: 400 }
      )
    }
    if (!p256dh || p256dh.length > 512 || !auth || auth.length > 512) {
      return NextResponse.json(
        { error: 'Valid push encryption keys are required' },
        { status: 400 }
      )
    }

    const subscription = await prisma.webPushSubscription.upsert({
      where: { endpoint },
      update: {
        user_id: actor.id,
        p256dh,
        auth,
        user_agent: request.headers.get('user-agent')?.slice(0, 500) || null,
        is_active: true,
        last_seen_at: new Date(),
      },
      create: {
        user_id: actor.id,
        endpoint,
        p256dh,
        auth,
        user_agent: request.headers.get('user-agent')?.slice(0, 500) || null,
      },
      select: { id: true, is_active: true, last_seen_at: true },
    })

    return NextResponse.json({ success: true, subscription })
  } catch (error) {
    const authResponse = handleApiAuthError(error)
    if (authResponse) return authResponse
    console.error('[POST /api/push/subscriptions]', error)
    return NextResponse.json({ error: 'Unable to save push subscription' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const actor = await requireAuthApi(request)
    const body = await request.json().catch(() => ({}))
    const endpoint = typeof body.endpoint === 'string' ? body.endpoint.trim() : ''

    if (!endpoint) {
      return NextResponse.json({ error: 'Push endpoint is required' }, { status: 400 })
    }

    await prisma.webPushSubscription.updateMany({
      where: { user_id: actor.id, endpoint },
      data: { is_active: false, last_seen_at: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const authResponse = handleApiAuthError(error)
    if (authResponse) return authResponse
    console.error('[DELETE /api/push/subscriptions]', error)
    return NextResponse.json({ error: 'Unable to disable push subscription' }, { status: 500 })
  }
}
