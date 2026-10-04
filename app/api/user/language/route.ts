/**
 * PATCH /api/user/language
 * ─────────────────────────────────────────────────────────────
 * Persists the authenticated user's preferred locale to the DB.
 *
 * Request body: { locale: string }   e.g. { locale: "kn" }
 * Auth:         Bearer <jwt>  OR  crave_auth_token cookie
 *
 * GET /api/user/language
 * ─────────────────────────────────────────────────────────────
 * Returns the stored locale for the authenticated user.
 * Response: { locale: string }
 */

import { isSupportedLocale } from '@/dictionary'
import { updateUser, findUserById } from '@/lib/dal'
import { verifyToken } from '@/lib/jwt'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// ── Shared auth helper ────────────────────────────────────────

async function resolveUserId(request: Request): Promise<string | null> {
  let token = ''

  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7)
  }

  if (!token) {
    const cookieStore = await cookies()
    const cookie = cookieStore.get('crave_auth_token') ?? cookieStore.get('drop_auth_token')
    if (cookie) token = cookie.value
  }

  if (!token) return null

  const payload = await verifyToken(token)
  return payload?.id ?? null
}

// ── PATCH — save locale ───────────────────────────────────────

export async function PATCH(request: Request) {
  const userId = await resolveUserId(request)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const locale =
    body && typeof body === 'object' && 'locale' in body
      ? String((body as Record<string, unknown>).locale)
      : ''

  if (!locale || !isSupportedLocale(locale)) {
    return NextResponse.json(
      { error: `Unsupported locale "${locale}". Supported: en, kn` },
      { status: 400 }
    )
  }

  try {
    await updateUser(userId, { locale })
    return NextResponse.json({ success: true, locale })
  } catch (err) {
    console.error('[PATCH /api/user/language]', err)
    return NextResponse.json({ error: 'Failed to save language preference' }, { status: 500 })
  }
}

// ── GET — read stored locale ──────────────────────────────────

export async function GET(request: Request) {
  const userId = await resolveUserId(request)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const user = await findUserById(userId)
    const locale = (user as any)?.locale ?? 'en'
    return NextResponse.json({ locale })
  } catch (err) {
    console.error('[GET /api/user/language]', err)
    return NextResponse.json({ error: 'Failed to read language preference' }, { status: 500 })
  }
}
