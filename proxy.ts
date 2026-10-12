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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const authHeader = request.headers.get('authorization')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const token =
    bearerToken ||
    request.cookies.get('crave_auth_token')?.value ||
    request.cookies.get('drop_auth_token')?.value ||
    request.cookies.get('crave_token')?.value

  const isAuthPage = pathname === '/login' || pathname === '/signup'
  const isAdminPath = pathname.startsWith('/admin')
  const isVendorPath = pathname.startsWith('/vendor')
  const isDriverPath = pathname.startsWith('/driver')
  const isUserPath = pathname.startsWith('/user')

  // If already authenticated and visiting /login or /signup, redirect to their role dashboard
  if (isAuthPage) {
    if (token) {
      const payload = await verifyToken(token)
      if (payload) {
        const targetDashboard = getDashboardForRole(payload.role as string)
        return NextResponse.redirect(new URL(targetDashboard, request.url))
      }
    }
    return NextResponse.next()
  }

  if (!isAdminPath && !isVendorPath && !isDriverPath && !isUserPath) {
    return NextResponse.next()
  }

  if (!token) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  const payload = await verifyToken(token)
  if (!payload) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
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
  matcher: ['/admin/:path*', '/vendor/:path*', '/driver/:path*', '/user/:path*', '/login', '/signup'],
}
