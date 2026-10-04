import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const reviews = await prisma.paymentReview.findMany({
      orderBy: { created_at: 'desc' },
    })
    return NextResponse.json({ success: true, reviews })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load reviews' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { orderId, status } = body

    if (!orderId || !status) {
      return NextResponse.json({ error: 'orderId and status required' }, { status: 400 })
    }

    await prisma.paymentReview.updateMany({
      where: { order_id: orderId },
      data: { status },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update' }, { status: 500 })
  }
}
