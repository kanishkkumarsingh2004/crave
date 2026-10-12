import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, type JWTPayload } from '@/lib/jwt'
import { broadcast } from '@/lib/ws-server'
import { cookies } from 'next/headers'
import { PaymentStatus, type OrderStatus } from '@prisma/client'
import {
  calculateOrderPrice,
  buildOrderConfirmedJournal,
  persistJournalTransaction,
} from '@/lib/finance'
import { withTiming } from '@/lib/instrumentation'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token)
      token =
        (await cookies()).get('crave_auth_token')?.value ||
        (await cookies()).get('crave_token')?.value ||
        ''
    const payload = token ? await verifyToken(token) : null

    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const url = new URL(request.url)
    const statusParam = url.searchParams.get('status')
    const cursor = url.searchParams.get('cursor') || undefined
    const limitParam = parseInt(url.searchParams.get('limit') || '50', 10)
    const take = Math.min(Math.max(isNaN(limitParam) ? 50 : limitParam, 1), 200)

    const rawReviews = await prisma.paymentReview.findMany({
      where: statusParam ? { status: statusParam as PaymentStatus } : undefined,
      orderBy: { created_at: 'desc' },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    const hasNextPage = rawReviews.length > take
    const reviews = hasNextPage ? rawReviews.slice(0, take) : rawReviews
    const nextCursor = hasNextPage ? reviews[reviews.length - 1]?.id : null

    return NextResponse.json({
      success: true,
      reviews,
      pagination: {
        nextCursor,
        hasNextPage,
        limit: take,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load payment reviews' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  return withTiming('PATCH /api/admin/payment-reviews', async (mark) => {
    try {
      const authHeader = request.headers.get('authorization')
      let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
      if (!token)
        token =
          (await cookies()).get('crave_auth_token')?.value ||
          (await cookies()).get('crave_token')?.value ||
          ''
      const payload = token ? await verifyToken(token) : null

      if (!payload || payload.role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
      }
      mark('auth')

      const body = await request.json()
      const { id, status } = body

      if (!id || !status) {
        return NextResponse.json({ error: 'Review ID and status are required' }, { status: 400 })
      }

      // Look up review to get order_id and utr_ref
      const review = await prisma.paymentReview.findUnique({
        where: { id },
      })

      if (!review) {
        return NextResponse.json({ error: 'Payment review record not found' }, { status: 404 })
      }

      const targetOrderId = review.order_id || id
      let updatedOrder: any = null

      if (status === 'verified') {
        const { processPaymentVerificationTx } = await import('@/lib/finance/payment-service')
        const outcome = await processPaymentVerificationTx({
          orderId: targetOrderId,
          gatewayPaymentId: review.utr_ref,
          amount: review.amount,
          actorId: payload.id,
          gateway: 'UPI_MANUAL',
          idempotencyKey: `admin_verify_${review.id}`,
        })
        updatedOrder = outcome.order
      } else if (status === 'rejected') {
        const { processPaymentRejectionTx } = await import('@/lib/finance/payment-service')
        const outcome = await processPaymentRejectionTx({
          orderId: targetOrderId,
          reason: body.reason || 'Admin rejected payment review',
          actorId: payload.id,
          idempotencyKey: `admin_reject_${review.id}`,
        })
        updatedOrder = outcome.order
      } else {
        // Pending: just update the review status
        await prisma.paymentReview.update({
          where: { id },
          data: { status: 'pending' },
        })
      }
      mark('db')

      // Broadcast real-time WebSocket events
      await broadcast('approval_update', { status, orderId: targetOrderId })
      if (updatedOrder) {
        await broadcast('order_update', { order: updatedOrder, orderId: targetOrderId })
        await broadcast('admin_orders', { order: updatedOrder, orderId: targetOrderId })
      }
      await broadcast('admin_stats', {
        type: 'payment_review_updated',
        id: targetOrderId,
        status,
        timestamp: new Date().toISOString(),
      })
      mark('broadcast')

      return NextResponse.json({ success: true, count: 1 })
    } catch (error: any) {
      console.error('[admin/payment-reviews] Update error:', error)
      return NextResponse.json({ error: error?.message || 'Failed to update' }, { status: 500 })
    }
  })
}
