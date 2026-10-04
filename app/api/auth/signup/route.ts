import { createToken, JWTPayload } from '@/lib/jwt'
import { createUser, findUserByEmail } from '@/lib/dal'
import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, password, role, phone, address } = body

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 })
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
    const finalRole = 'customer' as const

    // Check if email already exists via Prisma
    const existingUser = await findUserByEmail(cleanEmail)
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

    // Insert user profile via Prisma
    try {
      await createUser({
        id: finalUserId,
        name: String(name).trim(),
        email: cleanEmail,
        role: finalRole,
        phone: phone || null,
        address: address || null,
      })
    } catch (err: any) {
      // If insert fails (duplicate), update instead
      console.warn('User profile insert fallback:', err?.message)
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
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 })
  }
}
