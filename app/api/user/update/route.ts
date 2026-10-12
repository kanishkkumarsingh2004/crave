import { updateUser, findUserById, createCustomerAddress } from '@/lib/dal'
import { verifyToken } from '@/lib/jwt'
import { broadcast } from '@/lib/ws-server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

async function resolveUserId(request: Request): Promise<string | null> {
  let token = ''

  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7)
  }

  if (!token) {
    const cookieStore = await cookies()
    const cookie = cookieStore.get('crave_auth_token') ?? cookieStore.get('drop_auth_token')
    if (cookie) token = cookie.value
  }

  if (!token) return null

  const payload = await verifyToken(token)
  return payload?.id ?? null
}

export async function PATCH(request: Request) {
  const userId = await resolveUserId(request)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}

  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>
    if ('name' in b && b.name !== undefined && String(b.name).trim()) updates.name = String(b.name).trim()
    if ('phone' in b) updates.phone = b.phone && String(b.phone).trim() ? String(b.phone).trim() : null
    if ('address' in b) updates.address = b.address && String(b.address).trim() ? String(b.address).trim() : null
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
  }

  try {
    const updated = await updateUser(userId, updates)

    if (updates.address && typeof updates.address === 'string' && updates.address.trim()) {
      try {
        await createCustomerAddress({
          customer_id: userId,
          label: 'Home',
          address: updates.address.trim(),
          is_default: true,
        })
      } catch (addrErr) {
        console.warn('[PATCH /api/user/update] Could not sync customer_address:', addrErr)
      }
    }

    broadcast('user_profile', {
      type: 'update',
      userId,
      user: updated,
      timestamp: new Date().toISOString(),
    })

    const { createToken } = await import('@/lib/jwt')
    const userPayload = {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      phone: updated.phone || undefined,
      address: updated.address || undefined,
      avatar: updated.avatar || undefined,
      restaurantName: updated.restaurant_name || undefined,
      cuisine: updated.cuisine || undefined,
      vehicleType: updated.vehicle_type || undefined,
      licensePlate: updated.license_plate || undefined,
      locale: updated.locale || 'en',
    }
    const token = await createToken(userPayload as any)

    const response = NextResponse.json({ success: true, user: updated, token })
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    }
    response.cookies.set('crave_auth_token', token, cookieOptions)
    response.cookies.set('drop_auth_token', token, cookieOptions)
    return response
  } catch (err) {
    console.error('[PATCH /api/user/update]', err)
    return NextResponse.json({ error: 'Failed to update user profile' }, { status: 500 })
  }
}
