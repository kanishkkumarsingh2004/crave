import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/jwt'

export async function GET(request: Request) {
  try {
    let token = ''

    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }

    if (!token) {
      const cookieStore = await cookies()
      const craveCookie = cookieStore.get('crave_auth_token') || cookieStore.get('drop_auth_token')
      if (craveCookie) {
        token = craveCookie.value
      }
    }

    if (!token) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ authenticated: false, user: null, message: 'Invalid or expired JWT' }, { status: 401 })
    }

    return NextResponse.json({ authenticated: true, user: payload })
  } catch (error) {
    return NextResponse.json({ authenticated: false, error: 'Internal server error' }, { status: 500 })
  }
}
