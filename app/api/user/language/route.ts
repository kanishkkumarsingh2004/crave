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
import { getAuthActor } from '@/lib/auth/auth-helpers'
import { NextResponse } from 'next/server'

export async function PATCH(request: Request) {
  const actor = await getAuthActor(request)
  const userId = actor?.id ?? null
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
  const actor = await getAuthActor(request)
  const userId = actor?.id ?? null
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
