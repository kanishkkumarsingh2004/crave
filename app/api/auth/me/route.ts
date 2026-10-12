import { verifyToken } from '@/lib/jwt'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

function getIsSecure(request: Request): boolean {
  if (process.env.NODE_ENV !== 'production') return false
  const host = request.headers.get('host') || ''
  if (host.includes('localhost') || host.includes('127.0.0.1')) return false
  const proto = request.headers.get('x-forwarded-proto')
  if (proto === 'https') return true
  return request.url.startsWith('https:')
}

function clearAllAuthCookies(response: NextResponse, isSecure: boolean) {
  const cookieNames = ['crave_auth_token', 'drop_auth_token', 'crave_token']
  for (const name of cookieNames) {
    response.cookies.set(name, '', {
      path: '/',
      maxAge: 0,
      expires: new Date(0),
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
    })
    response.cookies.set(name, '', {
      path: '/',
      maxAge: 0,
      expires: new Date(0),
      httpOnly: false,
      secure: isSecure,
      sameSite: 'lax',
    })
    if (isSecure) {
      response.cookies.set(name, '', {
        path: '/',
        maxAge: 0,
        expires: new Date(0),
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
      })
    }
    response.cookies.delete(name)
  }
}

function parseCookiesFromHeader(header: string | null): Record<string, string> {
  if (!header) return {}
  const cookies: Record<string, string> = {}
  for (const pair of header.split(';')) {
    const [key, ...val] = pair.trim().split('=')
    if (key) {
      cookies[key] = decodeURIComponent(val.join('='))
    }
  }
  return cookies
}

export async function GET(request: Request) {
  try {
    let token = ''

    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }

    if (!token) {
      const headerCookies = parseCookiesFromHeader(request.headers.get('cookie'))
      token =
        headerCookies['crave_auth_token'] ||
        headerCookies['drop_auth_token'] ||
        headerCookies['crave_token'] ||
        ''
    }

    if (!token) {
      try {
        const cookieStore = await cookies()
        const craveCookie =
          cookieStore.get('crave_auth_token') ||
          cookieStore.get('drop_auth_token') ||
          cookieStore.get('crave_token')
        if (craveCookie) {
          token = craveCookie.value
        }
      } catch {}
    }

    const isSecure = getIsSecure(request)

    if (!token) {
      const res = NextResponse.json({ authenticated: false, user: null }, { status: 401 })
      clearAllAuthCookies(res, isSecure)
      return res
    }

    const payload = await verifyToken(token)
    if (!payload) {
      const res = NextResponse.json(
        { authenticated: false, user: null, message: 'Invalid or expired JWT' },
        { status: 401 }
      )
      clearAllAuthCookies(res, isSecure)
      return res
    }

    if (
      !payload.restaurantId &&
      (payload.role === 'restaurant_vendor' || payload.role === 'cravexp_store_vendor')
    ) {
      try {
        const { prisma } = await import('@/lib/prisma')
        const rest = await prisma.restaurant.findFirst({
          where: {
            OR: [
              { owner_id: payload.id },
              ...(payload.restaurantName ? [{ name: payload.restaurantName }] : []),
            ],
          },
        })
        if (rest) {
          payload.restaurantId = rest.id
          if (!payload.restaurantName) payload.restaurantName = rest.name
        }
      } catch (e) {}
    }

    return NextResponse.json({ authenticated: true, user: payload })
  } catch (error) {
    return NextResponse.json(
      { authenticated: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
