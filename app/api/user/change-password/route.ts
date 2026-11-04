import { findUserById, updateUser } from '@/lib/dal'
import { blacklistAllUserTokens } from '@/lib/jwt'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { hashPassword, verifyPassword } from '@/lib/password'
import { getAuthActor } from '@/lib/auth-helpers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const actor = await getAuthActor(request)
    const userId = actor?.id ?? null
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

    // Update password in database and revoke all existing sessions so the old
    // JWTs cannot be used after a password rotation.
    await updateUser(userId, {
      password_hash: hashPassword(newPassword),
    })
    await blacklistAllUserTokens(userId)

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
