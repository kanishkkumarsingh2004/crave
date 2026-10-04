import { createToken, JWTPayload } from '@/lib/jwt'
import { findUserByEmail as findUserInDb } from '@/lib/dal'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

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
    const body = await request.json().catch(() => ({}))
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const profile: any = await findUserInDb(email)
    if (!profile?.password_hash) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const passwordHash = crypto.scryptSync(password, email, 64).toString('hex')
    if (
      passwordHash.length !== profile.password_hash.length ||
      !crypto.timingSafeEqual(Buffer.from(passwordHash), Buffer.from(profile.password_hash))
    ) {
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
