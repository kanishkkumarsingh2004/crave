import { blacklistToken } from '@/lib/jwt'
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
    // 1. Expire with HttpOnly and secure if applicable
    response.cookies.set(name, '', {
      path: '/',
      maxAge: 0,
      expires: new Date(0),
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
    })
    // 2. Expire non-HttpOnly version (in case set by client document.cookie)
    response.cookies.set(name, '', {
      path: '/',
      maxAge: 0,
      expires: new Date(0),
      httpOnly: false,
      secure: isSecure,
      sameSite: 'lax',
    })
    // 3. Fallback without secure flag (for mixed or localhost proxies)
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

async function processLogout(request: Request) {
  const headerCookies = parseCookiesFromHeader(request.headers.get('cookie'))
  let storeCookies: any = null
  try {
    storeCookies = await cookies()
  } catch {}

  const cookieTokens = [
    headerCookies['crave_auth_token'],
    headerCookies['drop_auth_token'],
    headerCookies['crave_token'],
    storeCookies?.get?.('crave_auth_token')?.value,
    storeCookies?.get?.('drop_auth_token')?.value,
    storeCookies?.get?.('crave_token')?.value,
  ].filter(Boolean) as string[]

  const authHeader = request.headers.get('authorization') || ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''

  let bodyToken = ''
  try {
    if (request.method === 'POST') {
      const cloned = request.clone()
      const body = await cloned.json().catch(() => ({}))
      if (body?.token && typeof body.token === 'string') {
        bodyToken = body.token.trim()
      }
    }
  } catch {}

  const allTokens = Array.from(new Set([...cookieTokens, bearerToken, bodyToken].filter(Boolean)))

  for (const token of allTokens) {
    await blacklistToken(token).catch(() => {})
  }
}

export async function POST(request: Request) {
  try {
    await processLogout(request)
    const response = NextResponse.json({ success: true, message: 'Logged out successfully' })
    const isSecure = getIsSecure(request)
    clearAllAuthCookies(response, isSecure)
    return response
  } catch (error: any) {
    console.error('[POST /api/auth/logout]', error)
    const response = NextResponse.json({ error: 'Logout failed' }, { status: 500 })
    const isSecure = getIsSecure(request)
    clearAllAuthCookies(response, isSecure)
    return response
  }
}

export async function GET(request: Request) {
  try {
    await processLogout(request)
    const response = NextResponse.redirect(new URL('/login?logout=1', request.url), {
      status: 303,
    })
    const isSecure = getIsSecure(request)
    clearAllAuthCookies(response, isSecure)
    return response
  } catch (error: any) {
    console.error('[GET /api/auth/logout]', error)
    const response = NextResponse.redirect(new URL('/login?logout=1', request.url), {
      status: 303,
    })
    const isSecure = getIsSecure(request)
    clearAllAuthCookies(response, isSecure)
    return response
  }
}
