import { listCoupons, createCoupon, updateCoupon, deleteCoupon } from '@/lib/dal/coupons'
import { verifyToken } from '@/lib/jwt'
import { broadcast } from '@/lib/ws-server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import type { DiscountType } from '@prisma/client'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

async function checkAdminOrVendorAuth(request: Request) {
  const authHeader = request.headers.get('authorization')
  let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) token = (await cookies()).get('crave_auth_token')?.value || ''

  const payload = token ? await verifyToken(token) : null
  if (!payload) {
    return { authorized: false, status: 401, error: 'Authentication required' }
  }
  if (
    payload.role !== 'admin' &&
    payload.role !== 'restaurant_vendor' &&
    payload.role !== 'cravexp_store_vendor'
  ) {
    return { authorized: false, status: 403, error: 'Admin or Vendor access required' }
  }
  return { authorized: true, status: 200, actor: payload }
}

const FUNDING_SOURCES = new Set(['RESTAURANT', 'PLATFORM', 'SHARED', 'BANK'])

function apiError(message: string, statusCode: number): Error & { statusCode: number } {
  return Object.assign(new Error(message), { statusCode })
}

function normalizeRestaurantIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((id): id is string => typeof id === 'string' && id.length > 0))]
}

async function authorizeRestaurantSelection(
  actor: { id: string; role: string },
  requestedIds: string[]
): Promise<string[]> {
  if (actor.role === 'admin') return requestedIds

  const owned = await prisma.restaurant.findMany({
    where: { owner_id: actor.id },
    select: { id: true },
  })
  const ownedIds = owned.map((restaurant) => restaurant.id)
  if (ownedIds.length === 0) {
    throw apiError('No restaurant is linked to this vendor account', 403)
  }
  const effectiveIds = requestedIds.length > 0 ? requestedIds : ownedIds
  if (effectiveIds.some((id) => !ownedIds.includes(id))) {
    throw apiError('Forbidden: coupon includes a restaurant you do not own', 403)
  }
  return effectiveIds
}

function finiteNumber(value: unknown, field: string, options?: { min?: number; max?: number }) {
  const number = Number(value)
  if (
    !Number.isFinite(number) ||
    (options?.min != null && number < options.min) ||
    (options?.max != null && number > options.max)
  ) {
    throw apiError(`${field} is invalid`, 400)
  }
  return number
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')

    const coupons = await listCoupons(restaurantId ?? undefined)
    return NextResponse.json({ success: true, coupons })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load coupons' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await checkAdminOrVendorAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    const restaurantIds = await authorizeRestaurantSelection(
      auth.actor!,
      normalizeRestaurantIds(body.restaurant_ids)
    )
    const fundingSource = String(body.funding_source || 'SHARED').toUpperCase()
    if (!FUNDING_SOURCES.has(fundingSource)) {
      return NextResponse.json({ error: 'Invalid funding source' }, { status: 400 })
    }
    const coupon = await createCoupon({
      id: body.id || crypto.randomUUID(),
      code: body.code,
      description: body.description,
      discount_type: body.discount_type as DiscountType,
      discount_value: finiteNumber(body.discount_value, 'discount_value', { min: 0 }),
      min_order_amount: finiteNumber(body.min_order_amount, 'min_order_amount', { min: 0 }),
      max_discount:
        body.max_discount != null
          ? finiteNumber(body.max_discount, 'max_discount', { min: 0 })
          : undefined,
      usage_limit:
        body.usage_limit != null
          ? finiteNumber(body.usage_limit, 'usage_limit', { min: 1 })
          : undefined,
      expiry_date: body.expiry_date ? new Date(body.expiry_date) : undefined,
      is_active: body.is_active ?? true,
      funding_source: fundingSource,
      restaurant_share: finiteNumber(body.restaurant_share ?? 50, 'restaurant_share', {
        min: 0,
        max: 100,
      }),
      restaurant_ids: restaurantIds,
    })

    broadcast('admin_coupons', { type: 'create', coupon, timestamp: new Date().toISOString() })

    return NextResponse.json({ success: true, coupon })
  } catch (error: any) {
    if (typeof error?.statusCode === 'number') {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json(
      { error: error?.message || 'Failed to create coupon' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await checkAdminOrVendorAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'Coupon ID required' }, { status: 400 })
    }

    if (data.expiry_date) data.expiry_date = new Date(data.expiry_date)
    if (data.discount_value != null)
      data.discount_value = finiteNumber(data.discount_value, 'discount_value', { min: 0 })
    if (data.min_order_amount != null)
      data.min_order_amount = finiteNumber(data.min_order_amount, 'min_order_amount', { min: 0 })
    if (data.max_discount != null)
      data.max_discount = finiteNumber(data.max_discount, 'max_discount', { min: 0 })
    if (data.usage_limit != null)
      data.usage_limit = finiteNumber(data.usage_limit, 'usage_limit', { min: 1 })
    if (data.restaurant_share != null)
      data.restaurant_share = finiteNumber(data.restaurant_share, 'restaurant_share', {
        min: 0,
        max: 100,
      })
    if (data.funding_source != null) {
      data.funding_source = String(data.funding_source).toUpperCase()
      if (!FUNDING_SOURCES.has(data.funding_source)) {
        return NextResponse.json({ error: 'Invalid funding source' }, { status: 400 })
      }
    }
    if (data.restaurant_ids !== undefined) {
      data.restaurant_ids = await authorizeRestaurantSelection(
        auth.actor!,
        normalizeRestaurantIds(data.restaurant_ids)
      )
    } else if (auth.actor!.role !== 'admin') {
      const existing = await prisma.coupon.findUnique({
        where: { id },
        include: { applicable_restaurants: { select: { restaurant_id: true } } },
      })
      if (!existing) return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })
      await authorizeRestaurantSelection(
        auth.actor!,
        existing.applicable_restaurants.length > 0
          ? existing.applicable_restaurants.map((item) => item.restaurant_id)
          : existing.restaurant_id
            ? [existing.restaurant_id]
            : []
      )
    }

    const coupon = await updateCoupon(id, data)

    broadcast('admin_coupons', { type: 'update', coupon, timestamp: new Date().toISOString() })

    return NextResponse.json({ success: true, coupon })
  } catch (error: any) {
    if (typeof error?.statusCode === 'number') {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json(
      { error: error?.message || 'Failed to update coupon' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await checkAdminOrVendorAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Coupon ID required' }, { status: 400 })
    }

    if (auth.actor!.role !== 'admin') {
      const existing = await prisma.coupon.findUnique({
        where: { id },
        include: { applicable_restaurants: { select: { restaurant_id: true } } },
      })
      if (!existing) return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })
      await authorizeRestaurantSelection(
        auth.actor!,
        existing.applicable_restaurants.length > 0
          ? existing.applicable_restaurants.map((item) => item.restaurant_id)
          : existing.restaurant_id
            ? [existing.restaurant_id]
            : []
      )
    }

    await deleteCoupon(id)

    broadcast('admin_coupons', { type: 'delete', id, timestamp: new Date().toISOString() })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (typeof error?.statusCode === 'number') {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json(
      { error: error?.message || 'Failed to delete coupon' },
      { status: 500 }
    )
  }
}
