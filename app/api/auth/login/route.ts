import { createToken, JWTPayload } from '@/lib/jwt'
import { findUserByEmail as findUserInDb } from '@/lib/dal'
import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

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
    const authorization = request.headers.get('authorization')
    const bearerToken = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length)
      : null

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''

    let authUser: any = null
    let session: any = null

    if (bearerToken) {
      const { data, error } = await supabase.auth.getUser(bearerToken)
      if (error || !data.user) {
        return NextResponse.json({ error: 'Invalid Supabase session' }, { status: 401 })
      }
      authUser = data.user
    } else {
      if (!email || !password) {
        return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (!error && data?.user) {
        authUser = data.user
        session = data.session
      }
    }

    if (!authUser) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // Fetch database profile for authenticated Supabase user if one exists.
    let profile: any = null
    try {
      profile = await findUserInDb(authUser.email || email)
    } catch {
      profile = null
    }

    const userPayload: JWTPayload = {
      id: authUser.id,
      name:
        profile?.name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
      email: profile?.email || authUser.email || email,
      role: profile?.role || authUser.user_metadata?.role || 'customer',
      phone: profile?.phone ?? authUser.user_metadata?.phone ?? undefined,
      address: profile?.address ?? authUser.user_metadata?.address ?? undefined,
      avatar: profile?.avatar ?? authUser.user_metadata?.avatar ?? undefined,
      restaurantName:
        profile?.restaurant_name ?? authUser.user_metadata?.restaurant_name ?? undefined,
      cuisine: profile?.cuisine ?? authUser.user_metadata?.cuisine ?? undefined,
      vehicleType: profile?.vehicle_type ?? authUser.user_metadata?.vehicle_type ?? undefined,
      licensePlate: profile?.license_plate ?? authUser.user_metadata?.license_plate ?? undefined,
    }

    const token = await createToken(userPayload)
    return setCookies(
      NextResponse.json({ success: true, token, user: userPayload, session }),
      token
    )
  } catch (error) {
    console.error('Login failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to sign in at this time' },
      { status: 500 }
    )
  }
}
