import { createToken, JWTPayload } from '@/lib/jwt'
import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      name,
      email,
      password,
      role,
      phone,
      address,
      restaurantName,
      cuisine,
      vehicleType,
      licensePlate,
    } = body
    const allowedRoles = ['customer', 'vendor', 'driver']
    if (!name || !email || !password || !allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Name, email, password, and a valid account type are required' },
        { status: 400 }
      )
    }

    if (role === 'vendor' && (!restaurantName || !cuisine)) {
      return NextResponse.json(
        { error: 'Restaurant name and cuisine are required for vendor accounts' },
        { status: 400 }
      )
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: String(email).trim().toLowerCase(),
      password: String(password),
      options: {
        data: {
          name,
          role,
          phone: phone || null,
          address: address || null,
          restaurant_name: restaurantName || null,
          cuisine: cuisine || null,
          vehicle_type: vehicleType || null,
          license_plate: licensePlate || null,
        },
      },
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Unable to create account' },
        { status: 400 }
      )
    }

    const { error: profileError } = await supabase.from('users').insert([
      {
        id: authData.user.id,
        name: String(name).trim(),
        email: String(email).trim().toLowerCase(),
        role,
        phone: phone || null,
        address: address || null,
        restaurant_name: restaurantName || null,
        cuisine: cuisine || null,
        vehicle_type: vehicleType || null,
        license_plate: licensePlate || null,
      },
    ])

    if (profileError) {
      console.error('Failed to create the account profile:', profileError)
      return NextResponse.json(
        { error: 'Authentication was created but the database profile could not be saved' },
        { status: 500 }
      )
    }

    if (role === 'vendor') {
      const { error: restaurantError } = await supabase.from('restaurants').insert([
        {
          id: crypto.randomUUID(),
          owner_id: authData.user.id,
          name: String(restaurantName).trim(),
          cuisine: String(cuisine).trim(),
          address: address || null,
        },
      ])
      if (restaurantError) {
        console.error('Failed to create the vendor restaurant:', restaurantError)
        return NextResponse.json(
          { error: 'Account created, but its restaurant profile could not be saved' },
          { status: 500 }
        )
      }
    }

    if (!authData.session) {
      return NextResponse.json({
        success: true,
        requiresEmailConfirmation: true,
        message: 'Check your email to confirm your account before signing in.',
      })
    }

    const userPayload: JWTPayload = {
      id: authData.user.id,
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      role,
      phone: phone || undefined,
      address: address || undefined,
      restaurantName: restaurantName || undefined,
      cuisine: cuisine || undefined,
      vehicleType: vehicleType || undefined,
      licensePlate: licensePlate || undefined,
    }
    const token = await createToken(userPayload)
    const response = NextResponse.json({
      success: true,
      token,
      user: userPayload,
      session: authData.session,
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
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
