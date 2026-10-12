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

      const newPaymentStatus: PaymentStatus =
        status === 'verified' ? 'verified' : status === 'rejected' ? 'rejected' : 'pending'
      const newOrderStatus: OrderStatus | undefined =
        status === 'verified' ? ('sent_to_vendor' as OrderStatus) : undefined

      // P0-B FIX: Wrap payment review update and order update in atomic transaction
      let review: any = null
      let updatedOrder: any = null

      if (typeof prisma?.$transaction === 'function') {
        const txResult = await prisma.$transaction(async (tx) => {
          const rev = await tx.paymentReview.update({
            where: { id },
            data: { status: status as PaymentStatus },
          })

          const targetOrderId = rev.order_id || id
          let ord = null
          if (targetOrderId) {
            ord = await tx.order.update({
              where: { id: targetOrderId },
              data: {
                payment_status: newPaymentStatus,
                ...(newOrderStatus ? { status: newOrderStatus } : {}),
              },
            })
          }

          return { review: rev, updatedOrder: ord }
        })
        review = txResult.review
        updatedOrder = txResult.updatedOrder
      } else {
        review = await prisma.paymentReview.update({
          where: { id },
          data: { status: status as PaymentStatus },
        })
        const targetOrderId = review?.order_id || id
        if (targetOrderId) {
          updatedOrder = await prisma.order.update({
            where: { id: targetOrderId },
            data: {
              payment_status: newPaymentStatus,
              ...(newOrderStatus ? { status: newOrderStatus } : {}),
            },
          })
        }
      }
      mark('db')

      const targetOrderId = review?.order_id || id

      // P0-B FIX: Post ledger AFTER transaction commit — idempotent and safe to retry separately
      if (newPaymentStatus === 'verified' && updatedOrder) {
        try {
          const snapshot =
            (updatedOrder.financial_snapshot as any) ||
            calculateOrderPrice({
              orderType: (updatedOrder.order_type as any) || 'restaurant_food',
              restaurantId: updatedOrder.restaurant_id || 'rest_01',
              restaurantName: updatedOrder.restaurant_name,
              items: (Array.isArray(updatedOrder.items) ? (updatedOrder.items as any[]) : []).map(
                (i: any) => ({
                  name: i.name || 'Food Item',
                  quantity: Number(i.quantity || i.qty || 1),
                  unitPricePaise: Math.round(Number(i.price || 0) * 100),
                })
              ),
              delivery: {
                baseDeliveryFeePaise: (updatedOrder.delivery_fee || 30) * 100,
                baseDistanceKm: 2.5,
                perKmRatePaise: 1000,
                roadDistanceKm: 2.5,
              },
              tipPaise: (updatedOrder.tip || 0) * 100,
              couponDiscountPaise: (updatedOrder.discount_amount || 0) * 100,
            })

          if (snapshot) {
            const journal = buildOrderConfirmedJournal(targetOrderId, snapshot)
            await persistJournalTransaction(journal).catch((err) =>
              console.error(
                '[payment-review] ledger posting failed — requires manual reconciliation:',
                err
              )
            )
          }
        } catch (ledgerErr) {
          console.warn('[payment-review] ledger posting calculation notice:', ledgerErr)
        }
      }
      mark('ledger')

      // P0-B FIX: Broadcast real-time WebSocket events only AFTER DB commit succeeds
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
      return NextResponse.json({ error: error?.message || 'Failed to update' }, { status: 500 })
    }
  })
}
