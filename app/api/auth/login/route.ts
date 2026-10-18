import { createToken, type JWTPayload, type JWTRole } from '@/lib/jwt'
import { findUserByEmail as findUserInDb, updateUser } from '@/lib/dal'
import { normalizeEmail } from '@/lib/email'
import { getClientIp, checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { hashPassword, verifyPassword } from '@/lib/password'
import { NextResponse } from 'next/server'

function isSecureCookie(): boolean {
  return process.env.NODE_ENV === 'production'
}

function setCookies(response: ReturnType<typeof NextResponse.json>, token: string) {
  const isSecure = isSecureCookie()
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
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request)
    const result = await checkRateLimit(`login_${clientIp}`, 'AUTH_LOGIN')
    if (!result.allowed) {
      return rateLimitResponse(result.resetTime, result.retryAfter)
    }

    const body = await request.json().catch(() => ({}))
    const email = normalizeEmail(body.email)
    const password = typeof body.password === 'string' ? body.password : ''

    if (!email || !password) {
      return NextResponse.json(
        { error: 'A valid email address and password are required' },
        { status: 400 }
      )
    }

    let profile: any
    try {
      profile = await findUserInDb(email)
    } catch (dbErr: any) {
      console.error('[login] Database lookup failed:', dbErr?.message || dbErr)
      return NextResponse.json(
        { error: 'Authentication service is temporarily unavailable' },
        { status: 503 }
      )
    }

    if (!profile?.password_hash) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    if (!verifyPassword(password, profile.password_hash, profile.email)) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // Transparently migrate legacy email-salted hashes after a successful login.
    if (!profile.password_hash.includes(':')) {
      try {
        await updateUser(profile.id, { password_hash: hashPassword(password) })
      } catch (migrationError) {
        console.error('[login] Failed to upgrade legacy password hash:', migrationError)
      }
    }

    const userPayload: JWTPayload = {
      id: profile.id,
      name: profile?.name || profile?.email?.split('@')[0] || 'User',
      email: profile?.email || email,
      role: (profile?.role as JWTRole) || 'user',
      phone: profile?.phone ?? undefined,
      address: profile?.address ?? undefined,
      avatar: profile?.avatar ?? undefined,
      restaurantName: profile?.restaurant_name ?? undefined,
      cuisine: profile?.cuisine ?? undefined,
      vehicleType: profile?.vehicle_type ?? undefined,
      licensePlate: profile?.license_plate ?? undefined,
      locale: profile?.locale ?? 'en',
    }

    let restaurantId: string | undefined = undefined
    if (
      userPayload.role === 'restaurant_vendor' ||
      userPayload.role === 'cravexp_store_vendor' ||
      (userPayload.role as string) === 'vendor'
    ) {
      try {
        const { prisma } = await import('@/lib/prisma')
        const rest = await prisma.restaurant.findFirst({
          where: {
            OR: [
              { owner_id: profile.id },
              ...(profile.restaurant_name ? [{ name: profile.restaurant_name }] : []),
            ],
          },
        })
        if (rest) {
          restaurantId = rest.id
          if (!userPayload.restaurantName) {
            userPayload.restaurantName = rest.name
          }
        }
      } catch (err) {
        console.warn('[login] could not resolve restaurant for vendor:', err)
      }
    }

    if (restaurantId) {
      userPayload.restaurantId = restaurantId
      userPayload.restaurant_id = restaurantId
    }

    const token = await createToken(userPayload)
    const nativeHeader = request.headers.get('x-crave-native-app')?.trim().toLowerCase()
    const userAgent = request.headers.get('user-agent')?.toLowerCase() || ''
    const nativeApp =
      nativeHeader ||
      (userAgent.includes('craverestaurant/')
        ? 'restaurant'
        : userAgent.includes('cravedriver/')
          ? 'driver'
          : undefined)
    const isRestaurantRole =
      userPayload.role === 'restaurant_vendor' ||
      userPayload.role === 'cravexp_store_vendor' ||
      (userPayload.role as string) === 'vendor'
    const isDriverRole = userPayload.role === 'rider' || (userPayload.role as string) === 'driver'

    if (nativeApp === 'restaurant' && !isRestaurantRole) {
      return NextResponse.json(
        { error: 'This account is not registered as a restaurant partner' },
        { status: 403 }
      )
    }
    if (nativeApp === 'driver' && !isDriverRole) {
      return NextResponse.json(
        { error: 'This account is not registered as a delivery partner' },
        { status: 403 }
      )
    }

    const shouldReturnNativeToken =
      (nativeApp === 'restaurant' && isRestaurantRole) || (nativeApp === 'driver' && isDriverRole)
    return setCookies(
      NextResponse.json({
        success: true,
        user: userPayload,
        ...(shouldReturnNativeToken ? { token } : {}),
      }),
      token
    )
  } catch (error) {
    console.error('Login failed:', error)
    return NextResponse.json({ error: 'Unable to sign in at this time' }, { status: 500 })
  }
}
