import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { DiscountType } from '@prisma/client'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')

    const coupons = await prisma.coupon.findMany({
      where: restaurantId ? { restaurant_id: restaurantId } : undefined,
      orderBy: { created_at: 'desc' },
    })

    return NextResponse.json({ success: true, coupons })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load coupons' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const coupon = await prisma.coupon.create({
      data: {
        id: body.id || crypto.randomUUID(),
        code: body.code,
        description: body.description,
        discount_type: body.discount_type as DiscountType,
        discount_value: Number(body.discount_value),
        min_order_amount: Number(body.min_order_amount),
        max_discount: body.max_discount != null ? Number(body.max_discount) : null,
        usage_limit: body.usage_limit != null ? Number(body.usage_limit) : null,
        expiry_date: body.expiry_date ? new Date(body.expiry_date) : null,
        is_active: body.is_active ?? true,
        restaurant_id: body.restaurant_id || null,
      },
    })
    return NextResponse.json({ success: true, coupon })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to create coupon' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'Coupon ID required' }, { status: 400 })
    }

    // Convert date strings if present
    if (data.expiry_date) data.expiry_date = new Date(data.expiry_date)
    if (data.discount_value != null) data.discount_value = Number(data.discount_value)
    if (data.min_order_amount != null) data.min_order_amount = Number(data.min_order_amount)
    if (data.max_discount != null) data.max_discount = Number(data.max_discount)

    const coupon = await prisma.coupon.update({ where: { id }, data })
    return NextResponse.json({ success: true, coupon })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update coupon' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Coupon ID required' }, { status: 400 })
    }

    await prisma.coupon.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete coupon' }, { status: 500 })
  }
}
