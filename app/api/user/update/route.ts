import { updateUser, findUserById } from '@/lib/dal'
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
    if ('name' in b) updates.name = String(b.name)
    if ('phone' in b) updates.phone = b.phone ? String(b.phone) : null
    if ('address' in b) updates.address = b.address ? String(b.address) : null
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
  }

  try {
    const updated = await updateUser(userId, updates)

    broadcast('user_profile', {
      type: 'update',
      userId,
      user: updated,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, user: updated })
  } catch (err) {
    console.error('[PATCH /api/user/update]', err)
    return NextResponse.json({ error: 'Failed to update user profile' }, { status: 500 })
  }
}
