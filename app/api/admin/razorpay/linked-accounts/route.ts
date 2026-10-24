export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { handleApiAuthError, requireAdmin } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

const ENTITY_TYPES = new Set(['RESTAURANT', 'DRIVER'])
const STATUSES = new Set(['pending', 'active', 'rejected', 'disabled'])

/**
 * GET /api/admin/razorpay/linked-accounts[?entity_type=RESTAURANT|DRIVER]
 *
 * Lists the server-controlled mapping of Crave entities (restaurants/drivers) to
 * Razorpay Route linked account IDs. Only "active" mappings may receive split
 * transfers, so the admin uses this to onboard and verify recipients before
 * settlement can run.
 */
export async function GET(request: Request) {
  try {
    await requireAdmin(request)

    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entity_type') || undefined

    const where = entityType ? { entity_type: entityType } : undefined
    const accounts = await prisma.razorpayLinkedAccount.findMany({
      where,
      orderBy: { created_at: 'desc' },
    })

    // Enrich with human-readable names for the linked entities.
    const restaurantIds = accounts
      .filter((a) => a.entity_type === 'RESTAURANT')
      .map((a) => a.entity_id)
    const driverIds = accounts.filter((a) => a.entity_type === 'DRIVER').map((a) => a.entity_id)

    const [restaurants, drivers] = await Promise.all([
      restaurantIds.length
        ? prisma.restaurant.findMany({
            where: { id: { in: restaurantIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      driverIds.length
        ? prisma.user.findMany({
            where: { id: { in: driverIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
    ])

    const nameMap = new Map<string, string>()
    for (const r of restaurants) nameMap.set(`RESTAURANT:${r.id}`, r.name)
    for (const d of drivers) nameMap.set(`DRIVER:${d.id}`, d.name)

    const enriched = accounts.map((a) => ({
      ...a,
      entity_name: nameMap.get(`${a.entity_type}:${a.entity_id}`) ?? null,
    }))

    return NextResponse.json({ success: true, linkedAccounts: enriched })
  } catch (error: any) {
    const authRes = handleApiAuthError(error)
    if (authRes) return authRes
    console.error('[admin/razorpay/linked-accounts] GET failed:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to load linked accounts' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/razorpay/linked-accounts
 * Body: { entity_type, entity_id, razorpay_account_id, status? }
 *
 * Links (or re-links) a Crave restaurant/driver to a Razorpay Route linked
 * account ID. The linked account itself must first be created in the Razorpay
 * dashboard (Route onboarding/KYC); this endpoint records the server-side
 * mapping that the settlement service uses to route split transfers.
 */
export async function POST(request: Request) {
  try {
    await requireAdmin(request)

    const body = await request.json()
    const entityType = String(body.entity_type ?? '').toUpperCase()
    const entityId = String(body.entity_id ?? '')
    const razorpayAccountId = String(body.razorpay_account_id ?? '').trim()
    const status = String(body.status ?? 'pending')

    if (!ENTITY_TYPES.has(entityType)) {
      return NextResponse.json(
        { error: 'entity_type must be RESTAURANT or DRIVER' },
        { status: 400 }
      )
    }
    if (!entityId) {
      return NextResponse.json({ error: 'entity_id is required' }, { status: 400 })
    }
    if (!razorpayAccountId) {
      return NextResponse.json({ error: 'razorpay_account_id is required' }, { status: 400 })
    }
    if (!STATUSES.has(status)) {
      return NextResponse.json(
        { error: 'status must be one of pending, active, rejected, disabled' },
        { status: 400 }
      )
    }

    // Guard: the account ID must not already be mapped to a different entity.
    const conflicting = await prisma.razorpayLinkedAccount.findFirst({
      where: {
        razorpay_account_id: razorpayAccountId,
        NOT: { entity_type: entityType, entity_id: entityId },
      },
    })
    if (conflicting) {
      return NextResponse.json(
        {
          error:
            'This Razorpay account ID is already linked to another entity. Use a distinct account per recipient.',
        },
        { status: 409 }
      )
    }

    // Verify the entity actually exists before linking.
    const exists =
      entityType === 'RESTAURANT'
        ? await prisma.restaurant.findUnique({
            where: { id: entityId },
            select: { id: true },
          })
        : await prisma.user.findUnique({ where: { id: entityId }, select: { id: true } })
    if (!exists) {
      return NextResponse.json(
        {
          error: `${entityType === 'RESTAURANT' ? 'Restaurant' : 'Driver'} not found: ${entityId}`,
        },
        { status: 404 }
      )
    }

    // Upsert by (entity_type, entity_id): one mapping per Crave entity.
    const existing = await prisma.razorpayLinkedAccount.findFirst({
      where: { entity_type: entityType, entity_id: entityId },
    })

    const record = existing
      ? await prisma.razorpayLinkedAccount.update({
          where: { id: existing.id },
          data: {
            razorpay_account_id: razorpayAccountId,
            status,
            ...(status === 'active' && !existing.verified_at ? { verified_at: new Date() } : {}),
          },
        })
      : await prisma.razorpayLinkedAccount.create({
          data: {
            entity_type: entityType,
            entity_id: entityId,
            razorpay_account_id: razorpayAccountId,
            status,
            ...(status === 'active' ? { verified_at: new Date() } : {}),
          },
        })

    return NextResponse.json({ success: true, linkedAccount: record })
  } catch (error: any) {
    const authRes = handleApiAuthError(error)
    if (authRes) return authRes
    console.error('[admin/razorpay/linked-accounts] POST failed:', error)
    return NextResponse.json({ error: error?.message || 'Failed to link account' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/razorpay/linked-accounts
 * Body: { id, status }
 *
 * Updates the status of an existing mapping (e.g. activate once KYC is verified
 * in Razorpay, or disable a suspended account).
 */
export async function PATCH(request: Request) {
  try {
    await requireAdmin(request)

    const body = await request.json()
    const id = String(body.id ?? '')
    const status = String(body.status ?? '')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }
    if (!STATUSES.has(status)) {
      return NextResponse.json(
        { error: 'status must be one of pending, active, rejected, disabled' },
        { status: 400 }
      )
    }

    const record = await prisma.razorpayLinkedAccount.update({
      where: { id },
      data: {
        status,
        ...(status === 'active' ? { verified_at: new Date() } : {}),
      },
    })

    return NextResponse.json({ success: true, linkedAccount: record })
  } catch (error: any) {
    const authRes = handleApiAuthError(error)
    if (authRes) return authRes
    console.error('[admin/razorpay/linked-accounts] PATCH failed:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to update linked account' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/razorpay/linked-accounts?id=<linkedAccountId>
 *
 * Removes a linked-account mapping. Use with care: outstanding transfers for the
 * affected entity would fail until re-linked.
 */
export async function DELETE(request: Request) {
  try {
    await requireAdmin(request)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id') || ''

    if (!id) {
      return NextResponse.json({ error: 'id query param is required' }, { status: 400 })
    }

    await prisma.razorpayLinkedAccount.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    const authRes = handleApiAuthError(error)
    if (authRes) return authRes
    console.error('[admin/razorpay/linked-accounts] DELETE failed:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to delete linked account' },
      { status: 500 }
    )
  }
}
