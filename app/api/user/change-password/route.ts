import { findUserById, updateUser } from '@/lib/dal'
import { verifyToken } from '@/lib/jwt'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { hashPassword, verifyPassword } from '@/lib/password'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

async function resolveUserId(request: Request): Promise<string | null> {
  let token = ''

  const getHeader = (name: string) => {
    if (request.headers && typeof request.headers.get === 'function') {
      return request.headers.get(name)
    }
    if (request.headers && typeof (request.headers as any)[name] === 'string') {
      return (request.headers as any)[name]
    }
    return null
  }

  const authHeader = getHeader('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7)
  }

  if (!token) {
    try {
      const cookieStore = await cookies()
      const cookie = cookieStore.get('crave_auth_token') ?? cookieStore.get('drop_auth_token')
      if (cookie) token = cookie.value
    } catch {}
  }

  if (!token) return null

  const payload = await verifyToken(token)
  return payload?.id ?? null
}

export async function POST(request: Request) {
  try {
    const userId = await resolveUserId(request)
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required. Please sign in.' },
        { status: 401 }
      )
    }

    // Rate limiting to prevent brute force attacks
    const limit = await checkRateLimit(`pwd_change_${userId}`, 'AUTH_LOGIN')
    if (!limit.allowed) {
      return rateLimitResponse(limit.resetTime, limit.retryAfter)
    }

    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request payload' }, { status: 400 })
    }

    const { currentPassword, newPassword, confirmPassword } = body || {}

    if (!currentPassword || typeof currentPassword !== 'string') {
      return NextResponse.json({ error: 'Current password is required.' }, { status: 400 })
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return NextResponse.json({ error: 'New password is required.' }, { status: 400 })
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters long.' },
        { status: 400 }
      )
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: 'New password and confirmation do not match.' },
        { status: 400 }
      )
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: 'New password cannot be identical to the current password.' },
        { status: 400 }
      )
    }

    const user = await findUserById(userId)
    if (!user) {
      return NextResponse.json({ error: 'User account not found.' }, { status: 404 })
    }

    if (!verifyPassword(currentPassword, user.password_hash, user.email)) {
      return NextResponse.json(
        { error: 'The current password you entered is incorrect.' },
        { status: 400 }
      )
    }

    // Update password in database
    await updateUser(userId, {
      password_hash: hashPassword(newPassword),
    })

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully! Your account credentials have been updated.',
    })
  } catch (error) {
    console.error('Password change error:', error)
    return NextResponse.json(
      { error: 'Failed to update password. Please try again later.' },
      { status: 500 }
    )
  }
}
