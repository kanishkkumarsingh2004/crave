import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/jwt'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('drop_auth_token')?.value

  // Verify token if present
  const payload = token ? await verifyToken(token) : null

  // Helper for role path
  const getRoleDashboard = (userRole: string) => {
    return userRole === 'customer' ? '/user/dashboard' : `/${userRole}/dashboard`
  }

  // If user is already logged in and hits /login or /signup, redirect to their role dashboard
  if (payload && (pathname === '/login' || pathname === '/signup')) {
    const targetDashboard = getRoleDashboard(payload.role)
    return NextResponse.redirect(new URL(targetDashboard, request.url))
  }

  // Protect Admin Dashboard (/admin/*)
  if (pathname.startsWith('/admin')) {
    if (!payload) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (payload.role !== 'admin') {
      const correctDashboard = getRoleDashboard(payload.role)
      return NextResponse.redirect(new URL(correctDashboard, request.url))
    }
  }

  // Protect User Dashboard (/user/*)
  if (pathname.startsWith('/user')) {
    if (!payload) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (payload.role !== 'customer') {
      const correctDashboard = getRoleDashboard(payload.role)
      return NextResponse.redirect(new URL(correctDashboard, request.url))
    }
  }

  // Protect Driver Dashboard (/driver/*)
  if (pathname.startsWith('/driver')) {
    if (!payload) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (payload.role !== 'driver') {
      const correctDashboard = getRoleDashboard(payload.role)
      return NextResponse.redirect(new URL(correctDashboard, request.url))
    }
  }

  // Protect Vendor Dashboard (/vendor/* and /vender/*)
  if (pathname.startsWith('/vendor') || pathname.startsWith('/vender')) {
    if (!payload) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (payload.role !== 'vendor') {
      const correctDashboard = getRoleDashboard(payload.role)
      return NextResponse.redirect(new URL(correctDashboard, request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/user/:path*', '/driver/:path*', '/vendor/:path*', '/vender/:path*', '/login', '/signup'],
}
