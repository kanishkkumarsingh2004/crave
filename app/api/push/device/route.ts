import { handleApiAuthError, requireAuthApi } from '@/lib/auth/api-auth'
import { appRoleForUser } from '@/lib/notifications/native-device'
import { prisma } from '@/lib/infra/prisma'
import { NextResponse } from 'next/server'

const ALLOWED_PLATFORMS = new Set(['ios', 'android'])

export async function POST(request: Request) {
  try {
    const actor = await requireAuthApi(request)
    const appRole = appRoleForUser(actor.role)
    if (!appRole) {
      return NextResponse.json(
        { error: 'This account cannot register native push devices' },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const token = typeof body.token === 'string' ? body.token.trim() : ''
    const platform = typeof body.platform === 'string' ? body.platform.trim().toLowerCase() : ''
    const deviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : ''
    if (!token || token.length > 4096) {
      return NextResponse.json({ error: 'A valid push token is required' }, { status: 400 })
    }
    if (!ALLOWED_PLATFORMS.has(platform)) {
      return NextResponse.json({ error: 'Platform must be ios or android' }, { status: 400 })
    }
    if (!deviceId || deviceId.length > 255) {
      return NextResponse.json({ error: 'A device identifier is required' }, { status: 400 })
    }

    const provider = platform === 'ios' ? 'apns' : 'fcm'
    const saved = await prisma.$transaction(async (tx) => {
      // A token rotation on the same physical device must retire the previous
      // provider token before the new one is made active.
      await tx.devicePushToken.updateMany({
        where: {
          user_id: actor.id,
          device_id: deviceId,
          app_role: appRole,
          provider,
          token: { not: token },
        },
        data: { is_active: false, revoked_at: new Date(), last_seen_at: new Date() },
      })

      const existingForDevice = await tx.devicePushToken.findFirst({
        where: { user_id: actor.id, device_id: deviceId, app_role: appRole, provider },
        select: { id: true, token: true },
      })
      if (existingForDevice && existingForDevice.token !== token) {
        await tx.devicePushToken.delete({ where: { id: existingForDevice.id } })
      }

      return tx.devicePushToken.upsert({
        where: { token },
        update: {
          user_id: actor.id,
          device_id: deviceId,
          app_role: appRole,
          platform,
          provider,
          is_active: true,
          revoked_at: null,
          last_seen_at: new Date(),
        },
        create: {
          user_id: actor.id,
          device_id: deviceId,
          app_role: appRole,
          platform,
          provider,
          token,
        },
        select: {
          id: true,
          app_role: true,
          platform: true,
          provider: true,
          is_active: true,
          last_seen_at: true,
        },
      })
    })

    return NextResponse.json({ success: true, device: saved })
  } catch (error) {
    const authResponse = handleApiAuthError(error)
    if (authResponse) return authResponse
    console.error('[POST /api/push/device]', error)
    return NextResponse.json({ error: 'Unable to register push notifications' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const actor = await requireAuthApi(request)
    const body = await request.json().catch(() => ({}))
    const token = typeof body.token === 'string' ? body.token.trim() : ''
    const deviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : ''
    if (!token && !deviceId) {
      return NextResponse.json(
        { error: 'A push token or device identifier is required' },
        { status: 400 }
      )
    }

    const appRole = appRoleForUser(actor.role)
    await prisma.devicePushToken.updateMany({
      where: {
        user_id: actor.id,
        ...(appRole ? { app_role: appRole } : {}),
        ...(token ? { token } : {}),
        ...(deviceId ? { device_id: deviceId } : {}),
      },
      data: { is_active: false, revoked_at: new Date(), last_seen_at: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const authResponse = handleApiAuthError(error)
    if (authResponse) return authResponse
    console.error('[DELETE /api/push/device]', error)
    return NextResponse.json({ error: 'Unable to unregister push notifications' }, { status: 500 })
  }
}
