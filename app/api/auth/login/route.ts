import { createToken, JWTPayload } from '@/lib/jwt'
import { supabase } from '@/lib/supabase'
import { findUserByEmail } from '@/lib/user-store'
import { NextResponse } from 'next/server'

const demoAccounts: Record<string, JWTPayload> = {
  'admin@crave.com': {
    id: 'usr_admin_32e5afdc',
    name: 'System Administrator',
    email: 'admin@crave.com',
    role: 'admin',
    phone: '+91 9876543210',
    address: 'HQ Office, Tech Park, Indiranagar, Bengaluru',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
  },
  'customer@crave.com': {
    id: 'usr_cust_eb6b1630',
    name: 'Rahul Sharma',
    email: 'customer@crave.com',
    role: 'customer',
    phone: '+91 9876543211',
    address: 'Flat 402, Sunshine Apartments, HSR Layout, Bengaluru',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6',
  },
  'vendor@crave.com': {
    id: 'usr_vend_4fd0e820',
    name: 'Priya Patel',
    email: 'vendor@crave.com',
    role: 'vendor',
    phone: '+91 9876543212',
    address: '123 Main Street, Koramangala 5th Block, Bengaluru',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
    restaurantName: 'Spice Garden & Quick Mart',
    cuisine: 'North Indian & Quick Commerce',
  },
  'driver@crave.com': {
    id: 'usr_driv_f36ae61c',
    name: 'Vikram Singh',
    email: 'driver@crave.com',
    role: 'driver',
    phone: '+91 9876543213',
    address: 'BTM Layout 2nd Stage, Bengaluru',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
    vehicleType: 'Electric Scooter',
    licensePlate: 'KA-01-EV-4321',
  },
  'cravexp@crave.com': {
    id: 'usr_cravexp_darkstore_01',
    name: 'craveXP Manager',
    email: 'cravexp@crave.com',
    role: 'vendor',
    phone: '+91 9876543299',
    address: 'Kanakapura Road Hub #01, Bengaluru',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61',
    restaurantName: 'craveXP Store',
    cuisine: '10-Min Quick Commerce & Grocery',
  },
  'store@crave.com': {
    id: 'usr_cravexp_darkstore_01',
    name: 'craveXP Manager',
    email: 'store@crave.com',
    role: 'vendor',
    phone: '+91 9876543299',
    address: 'Kanakapura Road Hub #01, Bengaluru',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61',
    restaurantName: 'craveXP Store',
    cuisine: '10-Min Quick Commerce & Grocery',
  },
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

    // 1. Check if email matches a demo test account first for instant dev testing
    if (!bearerToken && email && demoAccounts[email]) {
      const demoUser = demoAccounts[email]
      const token = await createToken(demoUser)
      const response = NextResponse.json({ success: true, token, user: demoUser, session: null })
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

    // 2. Check local registered users store (for instant login of any user registered via /signup)
    if (!bearerToken && email) {
      const registeredLocal = findUserByEmail(email)
      if (registeredLocal) {
        if (registeredLocal.password && password && registeredLocal.password !== password) {
          return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
        }

        const userPayload: JWTPayload = {
          id: registeredLocal.id,
          name: registeredLocal.name,
          email: registeredLocal.email,
          role: registeredLocal.role,
          phone: registeredLocal.phone,
          address: registeredLocal.address,
        }

        const token = await createToken(userPayload)
        const response = NextResponse.json({
          success: true,
          token,
          user: userPayload,
          session: null,
        })
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
    }

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

    // If Supabase Auth did not return a user (e.g. unconfirmed email, rate limit, or admin-created vendor),
    // fall back to checking public.vendors and public.users tables in Supabase database.
    if (!authUser) {
      // 1. Check vendors table
      const { data: dbVendor } = await supabase
        .from('vendors')
        .select('*')
        .ilike('email', email)
        .maybeSingle()

      if (dbVendor) {
        const userPayload: JWTPayload = {
          id: dbVendor.userId || dbVendor.id,
          name: dbVendor.storeName,
          email: dbVendor.email || email,
          role: 'vendor',
          phone: dbVendor.phone ?? undefined,
          address: dbVendor.address ?? undefined,
          avatar: dbVendor.bannerUrl ?? undefined,
          restaurantName: dbVendor.storeName,
          cuisine: dbVendor.description ?? undefined,
        }

        const token = await createToken(userPayload)
        const response = NextResponse.json({
          success: true,
          token,
          user: userPayload,
          session: null,
        })
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

      // 2. Check users table
      const { data: dbUser } = await supabase
        .from('users')
        .select('*')
        .ilike('email', email)
        .maybeSingle()

      if (dbUser) {
        const userPayload: JWTPayload = {
          id: dbUser.id,
          name: dbUser.name || email.split('@')[0],
          email: dbUser.email,
          role: dbUser.role || 'customer',
          phone: dbUser.phone ?? undefined,
          address: dbUser.address ?? undefined,
          avatar: dbUser.avatar ?? undefined,
          restaurantName: dbUser.restaurant_name ?? undefined,
          cuisine: dbUser.cuisine ?? undefined,
          vehicleType: dbUser.vehicle_type ?? undefined,
          licensePlate: dbUser.license_plate ?? undefined,
        }

        const token = await createToken(userPayload)
        const response = NextResponse.json({
          success: true,
          token,
          user: userPayload,
          session: null,
        })
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

      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // Fetch database profile for authenticated Supabase user
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle()

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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to sign in at this time' },
      { status: 500 }
    )
  }
}
