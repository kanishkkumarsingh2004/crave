import { createToken, JWTPayload } from '@/lib/jwt'
import { createUser, findUserByEmail, createCustomerAddress, deleteUser } from '@/lib/dal'
import { getClientIp, checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { broadcast } from '@/lib/ws-server'
import { normalizeEmail } from '@/lib/email'
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { hashPassword, validatePassword } from '@/lib/password'

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request)
    const result = await checkRateLimit(`signup_${clientIp}`, 'AUTH_SIGNUP')
    if (!result.allowed) {
      return rateLimitResponse(result.resetTime, result.retryAfter)
    }

    const body = await request.json().catch(() => ({}))
    const { password, role } = body
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
    const address = typeof body.address === 'string' ? body.address.trim() : ''
    const parsedLatitude =
      body.latitude != null && Number.isFinite(Number(body.latitude)) ? Number(body.latitude) : null
    const parsedLongitude =
      body.longitude != null && Number.isFinite(Number(body.longitude))
        ? Number(body.longitude)
        : null
    const latitude =
      parsedLatitude != null && parsedLatitude >= -90 && parsedLatitude <= 90
        ? parsedLatitude
        : null
    const longitude =
      parsedLongitude != null && parsedLongitude >= -180 && parsedLongitude <= 180
        ? parsedLongitude
        : null
    const cleanEmail = normalizeEmail(body.email)

    if (name.length < 2 || name.length > 100 || !cleanEmail || !password) {
      return NextResponse.json(
        { error: 'Name (2-100 characters), a valid email address, and password are required' },
        { status: 400 }
      )
    }

    try {
      validatePassword(password)
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Invalid password' },
        { status: 400 }
      )
    }

    if (phone.length > 30 || address.length > 500) {
      return NextResponse.json({ error: 'Phone or address is too long' }, { status: 400 })
    }

    if (!role) {
      return NextResponse.json({ error: 'A role must be specified' }, { status: 400 })
    }

    if (role !== 'user') {
      return NextResponse.json(
        {
          error:
            'Public registration is restricted to customers/consumers only. Vendor and rider accounts must be onboarded by an Administrator.',
        },
        { status: 400 }
      )
    }

    const finalRole = 'user' as const

    // Check if email already exists via Prisma
    const existingUser = await findUserByEmail(cleanEmail)

    if (existingUser) {
      return NextResponse.json(
        {
          error: 'This email address is already registered. Please log in instead.',
        },
        { status: 400 }
      )
    }

    const finalUserId = crypto.randomUUID()
    const passwordHash = hashPassword(password)

    // Insert user profile via configured database backend.
    try {
      await createUser({
        id: finalUserId,
        name,
        email: cleanEmail,
        role: finalRole,
        phone: phone || null,
        address: address || null,
        password_hash: passwordHash,
      })

      // Register default customer address in DB if address provided
      if (address && typeof address === 'string' && address.trim()) {
        await createCustomerAddress({
          customer_id: finalUserId,
          label: 'Home',
          address: address.trim(),
          latitude,
          longitude,
          is_default: true,
        })
      }
    } catch (err: unknown) {
      await deleteUser(finalUserId).catch(() => {})
      console.error('User profile creation failed:', err)
      const isDatabaseConfigured = Boolean(process.env.DATABASE_URL)
      return NextResponse.json(
        {
          error:
            process.env.NODE_ENV === 'production'
              ? 'Unable to create the user profile in the configured database.'
              : !isDatabaseConfigured
                ? 'Local PostgreSQL is not configured. Copy .env.example to .env, set DATABASE_URL, run pnpm db:push, and try again.'
                : err instanceof Error
                  ? err.message
                  : 'Unable to create the user profile in the configured database.',
        },
        { status: 500 }
      )
    }

    // Create JWT Payload and Auth Token for immediate session login
    const userPayload: JWTPayload = {
      id: finalUserId,
      name,
      email: cleanEmail,
      role: finalRole,
      phone: phone || undefined,
      address: address || undefined,
    }

    // Broadcast real-time server signup event to Admin WebSocket channels (Live count update)
    broadcast('admin_stats', {
      type: 'user_signup',
      role: finalRole,
      user: userPayload,
      timestamp: new Date().toISOString(),
    })
    broadcast('admin_users', {
      type: 'user_signup',
      user: userPayload,
      timestamp: new Date().toISOString(),
    })

    const token = await createToken(userPayload)
    const nativeApp = request.headers.get('x-crave-native-app')?.trim().toLowerCase()
    const isNativeClient = Boolean(nativeApp)
    const response = NextResponse.json({
      success: true,
      user: userPayload,
      ...(isNativeClient ? { token } : {}),
      message: 'Account created successfully!',
    })

    const isSecure = process.env.NODE_ENV === 'production'

    const cookieOptions = {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    }

    response.cookies.set('crave_auth_token', token, cookieOptions)
    response.cookies.set('drop_auth_token', token, cookieOptions)
    response.cookies.set('crave_token', token, cookieOptions)
    return response
  } catch (error: any) {
    console.error('Signup endpoint error:', error)
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === 'production'
            ? 'Unable to create an account at this time.'
            : error?.message || 'Internal Server Error',
      },
      { status: 500 }
    )
  }
}
