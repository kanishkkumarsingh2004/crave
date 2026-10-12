import { createToken, type JWTPayload, type JWTRole } from '@/lib/jwt'
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

    let lookupEmail = email
    if (process.env.NODE_ENV !== 'production') {
      if (email === 'admin') lookupEmail = 'admin@crave.com'
      else if (email === 'vendor') lookupEmail = 'vendor@crave.com'
      else if (email === 'user') lookupEmail = 'user@crave.com'
      else if (email === 'darkstore' || email === 'store' || email === 'cravexp')
        lookupEmail = 'darkstore@crave.com'
      else if (email === 'rider' || email === 'driver') lookupEmail = 'rider@crave.com'
    }

    let profile: any = await findUserInDb(lookupEmail)
    if (!profile && lookupEmail.endsWith('@gmail.com')) {
      profile = await findUserInDb(lookupEmail.replace('@gmail.com', '@crave.com'))
    }
    if (!profile && lookupEmail.endsWith('@crave.com')) {
      profile = await findUserInDb(lookupEmail.replace('@crave.com', '@gmail.com'))
    }

    const isDemoEmail =
      lookupEmail === 'admin@gmail.com' ||
      lookupEmail === 'admin@crave.com' ||
      lookupEmail === 'user@gmail.com' ||
      lookupEmail === 'user@crave.com' ||
      lookupEmail === 'vendor@gmail.com' ||
      lookupEmail === 'vendor@crave.com' ||
      lookupEmail === 'darkstore@crave.com' ||
      lookupEmail === 'darkstore@gmail.com' ||
      lookupEmail === 'store@crave.com' ||
      lookupEmail === 'cravexp@crave.com' ||
      lookupEmail === 'rider@crave.com' ||
      lookupEmail === 'rider@gmail.com' ||
      lookupEmail === 'driver@crave.com'

    const isDemoPassword =
      password === '1234567890' ||
      password === 'Password123!' ||
      password === 'Password123' ||
      password === 'admin123'

    if (process.env.NODE_ENV !== 'production' && !profile && isDemoEmail && isDemoPassword) {
      if (lookupEmail.startsWith('admin')) {
        profile = {
          id: 'usr_admin_01',
          name: 'System Administrator',
          email: lookupEmail,
          role: 'admin',
          password_hash: ((await scrypt(password, lookupEmail, 64)) as Buffer).toString('hex'),
        }
      } else if (lookupEmail.startsWith('vendor')) {
        profile = {
          id: 'usr_vendor_01',
          name: 'Chef Marco',
          email: lookupEmail,
          role: 'restaurant_vendor',
          restaurant_name: 'Spice Garden',
          cuisine: 'North Indian & Fast Food',
          password_hash: ((await scrypt(password, lookupEmail, 64)) as Buffer).toString('hex'),
        }
      } else if (
        lookupEmail.startsWith('darkstore') ||
        lookupEmail.startsWith('store') ||
        lookupEmail.startsWith('cravexp')
      ) {
        profile = {
          id: 'usr_darkstore_01',
          name: 'Dark Store Operator',
          email: lookupEmail,
          role: 'cravexp_store_vendor',
          restaurant_name: 'CraveXP 10-Min Dark Store',
          cuisine: 'Instant Groceries & Snacks',
          password_hash: ((await scrypt(password, lookupEmail, 64)) as Buffer).toString('hex'),
        }
      } else if (lookupEmail.startsWith('rider') || lookupEmail.startsWith('driver')) {
        profile = {
          id: 'usr_rider_01',
          name: 'Rider Rahul',
          email: lookupEmail,
          role: 'rider',
          vehicle_type: 'Electric Scooter',
          license_plate: 'KA-01-CR-2026',
          password_hash: ((await scrypt(password, lookupEmail, 64)) as Buffer).toString('hex'),
        }
      } else if (lookupEmail.startsWith('user')) {
        profile = {
          id: 'usr_customer_01',
          name: 'Crave Customer',
          email: lookupEmail,
          role: 'user',
          password_hash: ((await scrypt(password, lookupEmail, 64)) as Buffer).toString('hex'),
        }
      }
    }

    if (!profile?.password_hash) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    let passwordMatches = false

    if (process.env.NODE_ENV !== 'production' && isDemoEmail && isDemoPassword) {
      passwordMatches = true
    } else if (typeof profile.password_hash === 'string' && profile.password_hash.includes(':')) {
      const [salt, expectedHash] = profile.password_hash.split(':')
      if (salt && expectedHash) {
        const computed = ((await scrypt(password, salt, 64)) as Buffer).toString('hex')
        passwordMatches =
          computed.length === expectedHash.length &&
          crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(expectedHash))
      }
    } else if (profile.password_hash) {
      const passwordHash = (
        (await scrypt(password, profile.email || lookupEmail, 64)) as Buffer
      ).toString('hex')
      const matchesPrimary =
        passwordHash.length === profile.password_hash.length &&
        crypto.timingSafeEqual(Buffer.from(passwordHash), Buffer.from(profile.password_hash))

      let matchesFallback = false
      if (!matchesPrimary) {
        const fallbackHash = ((await scrypt(password, lookupEmail, 64)) as Buffer).toString('hex')
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
