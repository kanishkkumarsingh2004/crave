import { listCoupons, createCoupon, updateCoupon, deleteCoupon } from '@/lib/dal/coupons'
import type { DiscountType } from '@prisma/client'
import { NextResponse } from 'next/server'

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
