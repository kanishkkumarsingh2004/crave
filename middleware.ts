import { NextResponse, type NextRequest } from 'next/server'
import { verifyToken } from '@/lib/jwt'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token =
    request.cookies.get('crave_auth_token')?.value ||
    request.cookies.get('drop_auth_token')?.value

  const isAdminPath = pathname.startsWith('/admin')
  const isVendorPath = pathname.startsWith('/vendor')
  const isDriverPath = pathname.startsWith('/driver')
  const isUserPath = pathname.startsWith('/user')

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

export const config = {
  matcher: ['/admin/:path*', '/vendor/:path*', '/driver/:path*', '/user/:path*'],
}
