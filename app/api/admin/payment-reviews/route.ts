import { listPaymentReviews, updatePaymentReviewStatus } from '@/lib/dal/payments'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const status = url.searchParams.get('status') || undefined
    const reviews = await listPaymentReviews(status || undefined)
    return NextResponse.json({ success: true, reviews })
  } catch (error: any) {
    return NextResponse.json(
      { success: true, reviews: [], error: error?.message || 'Failed to load reviews' },
      { status: 200 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { orderId, status } = body

    if (!orderId || !status) {
      return NextResponse.json({ error: 'orderId and status required' }, { status: 400 })
    }

    const result = await updatePaymentReviewStatus(orderId, status)
    return NextResponse.json({ success: true, count: result.count })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update' }, { status: 500 })
  }
}
