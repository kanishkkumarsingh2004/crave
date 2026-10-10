import { createToken, JWTPayload } from '@/lib/jwt'
import { findUserByEmail as findUserInDb } from '@/lib/dal'
import { getClientIp, checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { promisify } from 'util'

const scrypt = promisify(crypto.scrypt)

function setCookies(response: ReturnType<typeof NextResponse.json>, token: string) {
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
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request)
    const result = await checkRateLimit(`login_${clientIp}`, 'AUTH_LOGIN')
    if (!result.allowed) {
      return rateLimitResponse(result.resetTime, result.retryAfter)
    }

    const body = await request.json().catch(() => ({}))
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    let profile: any = await findUserInDb(email)
    if (!profile && email.endsWith('@gmail.com')) {
      profile = await findUserInDb(email.replace('@gmail.com', '@crave.com'))
    }
    if (!profile && email.endsWith('@crave.com')) {
      profile = await findUserInDb(email.replace('@crave.com', '@gmail.com'))
    }

    const isDemoEmail =
      email === 'admin@gmail.com' ||
      email === 'admin@crave.com' ||
      email === 'user@gmail.com' ||
      email === 'user@crave.com' ||
      email === 'vendor@gmail.com' ||
      email === 'vendor@crave.com' ||
      email === 'darkstore@crave.com' ||
      email === 'rider@crave.com'

    if (
      process.env.NODE_ENV !== 'production' &&
      !profile &&
      isDemoEmail &&
      password === '1234567890'
    ) {
      if (email.startsWith('admin')) {
        profile = {
          id: 'usr_admin_01',
          name: 'System Administrator',
          email,
          role: 'admin',
          password_hash: ((await scrypt(password, email, 64)) as Buffer).toString('hex'),
        }
      } else if (email.startsWith('vendor')) {
        profile = {
          id: 'usr_vendor_01',
          name: 'Chef Marco',
          email,
          role: 'restaurant_vendor',
          restaurant_name: 'Spice Garden',
          cuisine: 'North Indian & Fast Food',
          password_hash: ((await scrypt(password, email, 64)) as Buffer).toString('hex'),
        }
      } else if (email.startsWith('darkstore') || email.startsWith('store')) {
        profile = {
          id: 'usr_darkstore_01',
          name: 'Dark Store Operator',
          email,
          role: 'cravexp_store_vendor',
          restaurant_name: 'CraveXP 10-Min Dark Store',
          cuisine: 'Instant Groceries & Snacks',
          password_hash: ((await scrypt(password, email, 64)) as Buffer).toString('hex'),
        }
      } else if (email.startsWith('rider')) {
        profile = {
          id: 'usr_rider_01',
          name: 'Rider Rahul',
          email,
          role: 'rider',
          vehicle_type: 'Electric Scooter',
          license_plate: 'KA-01-CR-2026',
          password_hash: ((await scrypt(password, email, 64)) as Buffer).toString('hex'),
        }
      } else if (email.startsWith('user')) {
        profile = {
          id: 'usr_customer_01',
          name: 'Crave Customer',
          email,
          role: 'user',
          password_hash: ((await scrypt(password, email, 64)) as Buffer).toString('hex'),
        }
      }
    }

    if (!profile?.password_hash) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    let passwordMatches = false

    if (typeof profile.password_hash === 'string' && profile.password_hash.includes(':')) {
      const [salt, expectedHash] = profile.password_hash.split(':')
      if (salt && expectedHash) {
        const computed = ((await scrypt(password, salt, 64)) as Buffer).toString('hex')
        passwordMatches =
          computed.length === expectedHash.length &&
          crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(expectedHash))
      }
    } else {
      const passwordHash = (
        (await scrypt(password, profile.email || email, 64)) as Buffer
      ).toString('hex')
      const matchesPrimary =
        passwordHash.length === profile.password_hash.length &&
        crypto.timingSafeEqual(Buffer.from(passwordHash), Buffer.from(profile.password_hash))

      let matchesFallback = false
      if (!matchesPrimary) {
        const fallbackHash = ((await scrypt(password, email, 64)) as Buffer).toString('hex')
        matchesFallback =
          fallbackHash.length === profile.password_hash.length &&
          crypto.timingSafeEqual(Buffer.from(fallbackHash), Buffer.from(profile.password_hash))
      }
      passwordMatches = matchesPrimary || matchesFallback
    }

    if (!passwordMatches) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const userPayload: JWTPayload = {
      id: profile.id,
      name: profile?.name || profile?.email?.split('@')[0] || 'User',
      email: profile?.email || email,
      role: profile?.role || 'customer',
      phone: profile?.phone ?? undefined,
      address: profile?.address ?? undefined,
      avatar: profile?.avatar ?? undefined,
      restaurantName: profile?.restaurant_name ?? undefined,
      cuisine: profile?.cuisine ?? undefined,
      vehicleType: profile?.vehicle_type ?? undefined,
      licensePlate: profile?.license_plate ?? undefined,
      locale: profile?.locale ?? 'en',
    }

    const token = await createToken(userPayload)
    return setCookies(NextResponse.json({ success: true, token, user: userPayload }), token)
  } catch (error) {
    console.error('Login failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to sign in at this time' },
      { status: 500 }
    )
  }
}
