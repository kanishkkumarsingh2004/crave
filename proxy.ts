import { NextResponse, type NextRequest } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import {
  buildContentSecurityPolicy,
  createContentSecurityPolicyNonce,
} from '@/lib/security/content-security-policy'

function continueWithSecurityHeaders(
  request: NextRequest,
  nonce: string,
  contentSecurityPolicy: string
): NextResponse {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', contentSecurityPolicy)

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  response.headers.set('Content-Security-Policy', contentSecurityPolicy)
  return response
}

function withContentSecurityPolicy(
  response: NextResponse,
  contentSecurityPolicy: string
): NextResponse {
  response.headers.set('Content-Security-Policy', contentSecurityPolicy)
  return response
}

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
      return '/user/explore'
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
  }
}

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  const method = request.method.toUpperCase()
  const nonce = createContentSecurityPolicyNonce()
  const contentSecurityPolicy = buildContentSecurityPolicy(
    nonce,
    process.env.NODE_ENV !== 'production'
  )

  // Browser mutations authenticated by cookies must originate from this site.
  // Requests without an Origin header remain available to native/server clients.
  if (pathname.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const origin = request.headers.get('origin')
    if (origin) {
      const forwardedHost = request.headers.get('x-forwarded-host')
      const forwardedProtocol = request.headers.get('x-forwarded-proto')
      const expectedOrigin =
        forwardedHost && forwardedProtocol
          ? `${forwardedProtocol}://${forwardedHost}`
          : request.nextUrl.origin

      if (origin !== expectedOrigin) {
        return withContentSecurityPolicy(
          NextResponse.json({ error: 'Cross-origin request blocked' }, { status: 403 }),
          contentSecurityPolicy
        )
      }
    }
  }

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
    searchParams.has('logout') ||
    searchParams.has('signout') ||
    searchParams.has('switch') ||
    searchParams.has('error')

  // If user navigated with logout/switch/error intent, wipe any lingering cookies
  if (isAuthPage && isExplicitLogout) {
    const res = continueWithSecurityHeaders(request, nonce, contentSecurityPolicy)
    clearAuthCookies(res, isSecure)
    return res
  }

  // On login/signup: do not blindly redirect at middleware level based only on stateless JWT
  // signature. Let the client page query /api/auth/me to verify user exists in DB, preventing
  // infinite redirect loops if the user account was scrubbed or deleted.
  if (isAuthPage) {
    return continueWithSecurityHeaders(request, nonce, contentSecurityPolicy)
  }

  const isAdminPath = pathname.startsWith('/admin')
  const isVendorPath = pathname.startsWith('/vendor')
  const isDriverPath = pathname.startsWith('/driver')
  const isUserPath = pathname.startsWith('/user')

  if (!isAdminPath && !isVendorPath && !isDriverPath && !isUserPath) {
    return continueWithSecurityHeaders(request, nonce, contentSecurityPolicy)
  }

  if (!token) {
    const loginUrl = new URL('/login', request.url)
    const res = withContentSecurityPolicy(NextResponse.redirect(loginUrl), contentSecurityPolicy)
    clearAuthCookies(res, isSecure)
    return res
  }

  const payload = await verifyToken(token)
  if (!payload) {
    const loginUrl = new URL('/login', request.url)
    const res = withContentSecurityPolicy(NextResponse.redirect(loginUrl), contentSecurityPolicy)
    clearAuthCookies(res, isSecure)
    return res
  }

  const role = payload.role as string

  if (isAdminPath && role !== 'admin') {
    return withContentSecurityPolicy(
      NextResponse.redirect(new URL('/forbidden', request.url)),
      contentSecurityPolicy
    )
  }

  if (
    isVendorPath &&
    role !== 'restaurant_vendor' &&
    role !== 'cravexp_store_vendor' &&
    role !== 'vendor' &&
    role !== 'admin'
  ) {
    return withContentSecurityPolicy(
      NextResponse.redirect(new URL('/forbidden', request.url)),
      contentSecurityPolicy
    )
  }

  if (isDriverPath && role !== 'rider' && role !== 'driver' && role !== 'admin') {
    return withContentSecurityPolicy(
      NextResponse.redirect(new URL('/forbidden', request.url)),
      contentSecurityPolicy
    )
  }

  return continueWithSecurityHeaders(request, nonce, contentSecurityPolicy)
}

export const middleware = proxy
export default proxy

export const config = {
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico|icons/|sw.js).*)',
    },
  ],
}
