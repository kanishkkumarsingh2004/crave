import { createToken, unblacklistUser, JWTPayload } from '@/lib/jwt'
import { createUser, findUserByEmail, createCustomerAddress, deleteUser } from '@/lib/dal'
import { getClientIp, checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { broadcast } from '@/lib/ws-server'
import { normalizeEmail } from '@/lib/email'
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { hashPassword } from '@/lib/password'

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request)
    const result = await checkRateLimit(`signup_${clientIp}`, 'AUTH_SIGNUP')
    if (!result.allowed) {
      return rateLimitResponse(result.resetTime, result.retryAfter)
    }

    const body = await request.json()
    const { name, password, role, phone, address } = body
    const cleanEmail = normalizeEmail(body.email)

    if (!name || !cleanEmail || !password) {
      return NextResponse.json(
        { error: 'Name, a valid email address, and password are required' },
        { status: 400 }
      )
    }

    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
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
        name: String(name).trim(),
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
      name: String(name).trim(),
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

    await unblacklistUser(userPayload.id).catch(() => {})

    const token = await createToken(userPayload)
    const response = NextResponse.json({
      success: true,
      token,
      user: userPayload,
      message: 'Account created successfully!',
    })

    const host = request.headers.get('host') || ''
    const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1')
    const isHttps =
      request.headers.get('x-forwarded-proto') === 'https' || request.url.startsWith('https:')
    const isSecure = process.env.NODE_ENV === 'production' && !isLocalhost && isHttps

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
