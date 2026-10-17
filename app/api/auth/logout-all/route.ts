import { handleAuthError, requireAuth } from '@/lib/auth-helpers'
import { blacklistAllUserTokens } from '@/lib/jwt'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const actor = await requireAuth(request)
    await blacklistAllUserTokens(actor.id)

    const response = NextResponse.json({
      success: true,
      message: 'Logged out from all devices successfully',
    })

    const cookieOptions = {
      path: '/',
      maxAge: 0,
      expires: new Date(0),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
    }

    response.cookies.set('crave_auth_token', '', cookieOptions)
    response.cookies.set('drop_auth_token', '', cookieOptions)
    response.cookies.set('crave_token', '', cookieOptions)
    response.cookies.delete('crave_auth_token')
    response.cookies.delete('drop_auth_token')
    response.cookies.delete('crave_token')

    return response
  } catch (error: unknown) {
    console.error('[POST /api/auth/logout-all]', error)
    return handleAuthError(error)
  }
}
