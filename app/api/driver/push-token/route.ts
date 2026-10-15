import { handleApiAuthError, requireAuthApi } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

const ALLOWED_PLATFORMS = new Set(['ios', 'android'])

export async function POST(request: Request) {
  try {
    const actor = await requireAuthApi(request)
    if (actor.role !== 'rider' && actor.role !== 'admin') {
      return NextResponse.json({ error: 'Rider access required' }, { status: 403 })
    }

    const body = await request.json()
    const token = typeof body.token === 'string' ? body.token.trim() : ''
    const platform = typeof body.platform === 'string' ? body.platform.toLowerCase() : ''
    const deviceId = typeof body.deviceId === 'string' ? body.deviceId.slice(0, 255) : null
    const driverId = actor.role === 'admin' && body.driverId ? String(body.driverId) : actor.id

    if (!token || token.length > 4096) {
      return NextResponse.json({ error: 'A valid push token is required' }, { status: 400 })
    }
    if (!ALLOWED_PLATFORMS.has(platform)) {
      return NextResponse.json({ error: 'Platform must be ios or android' }, { status: 400 })
    }

    const saved = await prisma.driverPushToken.upsert({
      where: { token },
      update: {
        driver_id: driverId,
        platform,
        device_id: deviceId,
        is_active: true,
        last_seen_at: new Date(),
      },
      create: {
        driver_id: driverId,
        token,
        platform,
        device_id: deviceId,
      },
      select: { id: true, platform: true, is_active: true, last_seen_at: true },
    })

    return NextResponse.json({ success: true, pushToken: saved })
  } catch (error) {
    const authResponse = handleApiAuthError(error)
    if (authResponse) return authResponse
    console.error('[POST /api/driver/push-token]', error)
    return NextResponse.json({ error: 'Unable to register push notifications' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const actor = await requireAuthApi(request)
    if (actor.role !== 'rider' && actor.role !== 'admin') {
      return NextResponse.json({ error: 'Rider access required' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const token = typeof body.token === 'string' ? body.token.trim() : ''
    if (!token) return NextResponse.json({ error: 'Push token is required' }, { status: 400 })

    await prisma.driverPushToken.updateMany({
      where: { token, ...(actor.role === 'admin' ? {} : { driver_id: actor.id }) },
      data: { is_active: false, last_seen_at: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const authResponse = handleApiAuthError(error)
    if (authResponse) return authResponse
    console.error('[DELETE /api/driver/push-token]', error)
    return NextResponse.json({ error: 'Unable to unregister push notifications' }, { status: 500 })
  }
}
