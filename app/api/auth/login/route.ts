import { createToken, JWTPayload } from '@/lib/jwt'
import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const authorization = request.headers.get('authorization')
    const bearerToken = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length)
      : null

    let authUser
    let session = null
    if (bearerToken) {
      const { data, error } = await supabase.auth.getUser(bearerToken)
      if (error || !data.user) {
        return NextResponse.json({ error: 'Invalid Supabase session' }, { status: 401 })
      }
      authUser = data.user
    } else {
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
      const password = typeof body.password === 'string' ? body.password : ''
      if (!email || !password) {
        return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error || !data.user || !data.session) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
      }
      authUser = data.user
      session = data.session
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Account profile is missing from the database' },
        { status: 403 }
      )
    }

    const userPayload: JWTPayload = {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: profile.role,
      phone: profile.phone ?? undefined,
      address: profile.address ?? undefined,
      avatar: profile.avatar ?? undefined,
      restaurantName: profile.restaurant_name ?? undefined,
      cuisine: profile.cuisine ?? undefined,
      vehicleType: profile.vehicle_type ?? undefined,
      licensePlate: profile.license_plate ?? undefined,
    }
    const token = await createToken(userPayload)
    const response = NextResponse.json({ success: true, token, user: userPayload, session })
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
  } catch (error) {
    console.error('Login failed:', error)
    return NextResponse.json({ error: 'Unable to sign in at this time' }, { status: 500 })
  }
}
