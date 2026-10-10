import { NextResponse } from 'next/server'
import { blacklistToken, blacklistAllUserTokens } from '@/lib/jwt'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const cookieToken =
      cookieStore.get('crave_auth_token')?.value || cookieStore.get('drop_auth_token')?.value || ''

    // CR-08 FIX: Also extract token from Authorization: Bearer header so clients that
    // authenticate without a cookie (mobile apps, API integrations) have their token
    // blacklisted. Both paths are blacklisted when both are present.
    const authHeader = request.headers.get('authorization') || ''
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''

    // Blacklist cookie token
    if (cookieToken) {
      await blacklistToken(cookieToken)
    }

    // Blacklist bearer token only if it is distinct from the cookie token
    if (bearerToken && bearerToken !== cookieToken) {
      await blacklistToken(bearerToken)
    }

    const response = NextResponse.json({ success: true, message: 'Logged out successfully' })

    const cookieOptions = {
      path: '/',
      maxAge: 0,
      expires: new Date(0),
      httpOnly: true,
      sameSite: 'lax' as const,
    }

    response.cookies.set('crave_auth_token', '', cookieOptions)
    response.cookies.set('drop_auth_token', '', cookieOptions)
    response.cookies.delete('crave_auth_token')
    response.cookies.delete('drop_auth_token')

    return response
  } catch (error: any) {
    console.error('[POST /api/auth/logout]', error)
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 })
  }
}
