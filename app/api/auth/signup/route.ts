import { createToken, JWTPayload } from '@/lib/jwt'
import { supabase } from '@/lib/supabase'
import { findUserByEmail, saveRegisteredUser } from '@/lib/user-store'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, password, role, phone, address } = body

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    // Strictly enforce that public registration is ONLY for customers/consumers
    if (role && role !== 'customer') {
      return NextResponse.json(
        {
          error:
            'Public registration is restricted to customers/consumers only. Vendor and rider accounts must be onboarded by an Administrator.',
        },
        { status: 400 }
      )
    }

    const cleanEmail = String(email).trim().toLowerCase()
    const finalRole = 'customer'

    // Check local persistent registry first
    const existingLocal = findUserByEmail(cleanEmail)
    if (existingLocal) {
      return NextResponse.json(
        {
          error: `This email address is already registered. Please log in instead.`,
        },
        { status: 400 }
      )
    }

    // 1. Check if email already exists in users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email, role')
      .ilike('email', cleanEmail)
      .maybeSingle()

    if (existingUser) {
      const roleTitle =
        existingUser.role === 'vendor'
          ? 'Vendor Store'
          : existingUser.role === 'driver'
            ? 'Rider/Driver'
            : existingUser.role === 'admin'
              ? 'Administrator'
              : 'Customer'

      return NextResponse.json(
        {
          error: `This email address is already registered to an existing ${roleTitle} account. Please log in instead.`,
        },
        { status: 400 }
      )
    }

    // 2. Check if email already exists in vendors table
    const { data: existingVendor } = await supabase
      .from('vendors')
      .select('id, email')
      .ilike('email', cleanEmail)
      .maybeSingle()

    if (existingVendor) {
      return NextResponse.json(
        {
          error:
            'This email address is already registered to an onboarded Vendor account. Please log in instead.',
        },
        { status: 400 }
      )
    }

    // Attempt Supabase auth signup (fallback to generated ID if auth rate-limited)
    let finalUserId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    let authSession: any = null

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: String(password),
        options: {
          data: {
            name: String(name).trim(),
            role: finalRole,
            phone: phone || null,
            address: address || null,
          },
        },
      })

      if (!authError && authData?.user) {
        finalUserId = authData.user.id
        authSession = authData.session
      }
    } catch (err) {
      console.warn('Supabase auth signup warning, using database fallback:', err)
    }

    // 3. Insert/Sync user profile into public.users database table
    const { error: profileError } = await supabase.from('users').insert([
      {
        id: finalUserId,
        name: String(name).trim(),
        email: cleanEmail,
        role: finalRole,
        phone: phone || null,
        address: address || null,
        created_at: new Date().toISOString(),
      },
    ])

    if (profileError) {
      console.warn('User profile insert fallback:', profileError.message)
      await supabase
        .from('users')
        .update({
          name: String(name).trim(),
          role: finalRole,
          phone: phone || null,
          address: address || null,
        })
        .eq('email', cleanEmail)
    }

    // Save user to persistent registry
    saveRegisteredUser({
      id: finalUserId,
      name: String(name).trim(),
      email: cleanEmail,
      password: String(password),
      role: finalRole,
      phone: phone || undefined,
      address: address || undefined,
      createdAt: new Date().toISOString(),
    })

    // 4. Create JWT Payload and Auth Token for immediate session login
    const userPayload: JWTPayload = {
      id: finalUserId,
      name: String(name).trim(),
      email: cleanEmail,
      role: finalRole,
      phone: phone || undefined,
      address: address || undefined,
    }

    const token = await createToken(userPayload)
    const response = NextResponse.json({
      success: true,
      token,
      user: userPayload,
      session: authSession,
      message: 'Account created successfully!',
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
  } catch (error: any) {
    console.error('Signup endpoint error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
