import { NextResponse } from 'next/server'

export async function POST() {
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
}
