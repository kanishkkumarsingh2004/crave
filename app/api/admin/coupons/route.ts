import { listCoupons, createCoupon, updateCoupon, deleteCoupon } from '@/lib/dal/coupons'
import { verifyToken } from '@/lib/jwt'
import { cookies } from 'next/headers'
import type { DiscountType } from '@prisma/client'
import { NextResponse } from 'next/server'

async function checkAdminOrVendorAuth(request: Request) {
  const authHeader = request.headers.get('authorization')
  let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) token = (await cookies()).get('crave_auth_token')?.value || ''

  const payload = token ? await verifyToken(token) : null
  if (!payload || (payload.role !== 'admin' && payload.role !== 'restaurant_vendor')) {
    return false
  }
  return true
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
    if (!(await checkAdminOrVendorAuth(request))) {
      return NextResponse.json({ error: 'Admin or Vendor access required' }, { status: 403 })
    }

    const body = await request.json()
    const coupon = await createCoupon({
      id: body.id || crypto.randomUUID(),
      code: body.code,
      description: body.description,
      discount_type: body.discount_type as DiscountType,
      discount_value: Number(body.discount_value),
      min_order_amount: Number(body.min_order_amount),
      max_discount: body.max_discount != null ? Number(body.max_discount) : undefined,
      usage_limit: body.usage_limit != null ? Number(body.usage_limit) : undefined,
      expiry_date: body.expiry_date ? new Date(body.expiry_date) : undefined,
      is_active: body.is_active ?? true,
      restaurant_id: body.restaurant_id || undefined,
      restaurant_ids: Array.isArray(body.restaurant_ids) ? body.restaurant_ids : undefined,
    })
    return NextResponse.json({ success: true, coupon })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to create coupon' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    if (!(await checkAdminOrVendorAuth(request))) {
      return NextResponse.json({ error: 'Admin or Vendor access required' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'Coupon ID required' }, { status: 400 })
    }

    if (data.expiry_date) data.expiry_date = new Date(data.expiry_date)
    if (data.discount_value != null) data.discount_value = Number(data.discount_value)

    const coupon = await updateCoupon(id, data)
    return NextResponse.json({ success: true, coupon })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update coupon' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    if (!(await checkAdminOrVendorAuth(request))) {
      return NextResponse.json({ error: 'Admin or Vendor access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Coupon ID required' }, { status: 400 })
    }

    await deleteCoupon(id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to delete coupon' },
      { status: 500 }
    )
  }
}
