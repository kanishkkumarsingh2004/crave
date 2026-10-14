import { NextResponse, type NextRequest } from 'next/server'
import { verifyToken } from '@/lib/jwt'

function getDashboardForRole(role: string): string {
  switch (role) {
    case 'admin':
      return '/admin/dashboard'
    case 'restaurant_vendor':
    case 'vendor':
      return '/vendor/dashboard'
    case 'cravexp_store_vendor':
      return '/vendor/crave-ep'
    case 'rider':
    case 'driver':
      return '/driver/dashboard'
    case 'user':
    case 'customer':
    default:
      return '/user/dashboard'
  }
}

function clearAuthCookies(response: NextResponse, isSecure: boolean) {
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

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  const authHeader = request.headers.get('authorization')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const token =
    bearerToken ||
    request.cookies.get('crave_auth_token')?.value ||
    request.cookies.get('drop_auth_token')?.value ||
    request.cookies.get('crave_token')?.value

  const isHttps =
    request.nextUrl.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https'
  const isSecure = process.env.NODE_ENV === 'production' && isHttps

  const isAuthPage = pathname === '/login' || pathname === '/signup'
  const isExplicitLogout =
    searchParams.has('logout') || searchParams.has('signout') || searchParams.has('switch')

  // If user explicitly navigated with logout/switch intent, do NOT redirect to dashboard!
  // Instead, wipe any lingering cookies on response and serve login/signup cleanly.
  if (isAuthPage && isExplicitLogout) {
    const res = NextResponse.next()
    clearAuthCookies(res, isSecure)
    return res
  }

  // If visiting /login or /signup
  if (isAuthPage) {
    if (token) {
      const payload = await verifyToken(token)
      if (payload) {
        const targetDashboard = getDashboardForRole(payload.role as string)
        return NextResponse.redirect(new URL(targetDashboard, request.url))
      } else {
        // Token was present on login page but is invalid/expired/blacklisted: clean it up
        const res = NextResponse.next()
        clearAuthCookies(res, isSecure)
        return res
      }
    }
    return NextResponse.next()
  }

  const isAdminPath = pathname.startsWith('/admin')
  const isVendorPath = pathname.startsWith('/vendor')
  const isDriverPath = pathname.startsWith('/driver')
  const isUserPath = pathname.startsWith('/user')

  if (!isAdminPath && !isVendorPath && !isDriverPath && !isUserPath) {
    return NextResponse.next()
  }

  if (!token) {
    const loginUrl = new URL('/login', request.url)
    const res = NextResponse.redirect(loginUrl)
    clearAuthCookies(res, isSecure)
    return res
  }

  const payload = await verifyToken(token)
  if (!payload) {
    const loginUrl = new URL('/login', request.url)
    const res = NextResponse.redirect(loginUrl)
    clearAuthCookies(res, isSecure)
    return res
  }

  const role = payload.role as string

  if (isAdminPath && role !== 'admin') {
    return NextResponse.redirect(new URL('/forbidden', request.url))
  }

  if (
    isVendorPath &&
    role !== 'restaurant_vendor' &&
    role !== 'cravexp_store_vendor' &&
    role !== 'vendor' &&
    role !== 'admin'
  ) {
    return NextResponse.redirect(new URL('/forbidden', request.url))
  }

  if (isDriverPath && role !== 'rider' && role !== 'driver' && role !== 'admin') {
    return NextResponse.redirect(new URL('/forbidden', request.url))
  }

  return NextResponse.next()
}

export const middleware = proxy
export default proxy

export const config = {
  matcher: [
    '/admin/:path*',
    '/vendor/:path*',
    '/driver/:path*',
    '/user/:path*',
    '/login',
    '/signup',
  ],
}
