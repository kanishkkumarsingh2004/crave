import { NextResponse } from 'next/server'
import { blacklistAllUserTokens, decodeToken } from '@/lib/jwt'
import { cookies } from 'next/headers'

export async function POST() {
  try {
    const cookieStore = await cookies()
    const token =
      cookieStore.get('crave_auth_token')?.value || cookieStore.get('drop_auth_token')?.value || ''

    // Get user ID from token if possible
    let userId: string | null = null
    try {
      const decoded = await decodeToken(token)
      if (decoded?.id) {
        await blacklistAllUserTokens(decoded.id)
      }
    } catch (e) {
      console.warn('Failed to blacklist all user tokens:', e)
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logged out from all devices successfully',
    })

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
    console.error('[POST /api/auth/logout-all]', error)
    return NextResponse.json({ error: 'Logout from all devices failed' }, { status: 500 })
  }
}
