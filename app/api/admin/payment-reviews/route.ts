import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, type JWTPayload } from '@/lib/jwt'
import { broadcast } from '@/lib/ws-server'
import { cookies } from 'next/headers'
import { PaymentStatus } from '@prisma/client'
import {
  calculateOrderPrice,
  buildOrderConfirmedJournal,
  persistJournalTransaction,
} from '@/lib/finance'

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
    const reviews = await prisma.paymentReview.findMany({
      where: statusParam ? { status: statusParam as PaymentStatus } : undefined,
      orderBy: { created_at: 'desc' },
    })
    return NextResponse.json({ success: true, reviews })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load payment reviews' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
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

    const body = await request.json()
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json({ error: 'Review ID and status are required' }, { status: 400 })
    }

    let review: any = null
    try {
      review = await prisma.paymentReview.update({
        where: { id },
        data: { status: status as PaymentStatus },
      })
    } catch (e) {
      review = await prisma.paymentReview.findUnique({ where: { id } })
    }

    const targetOrderId = review?.order_id || id

    // 2. Update the corresponding Order record in database (Prisma)
    const newPaymentStatus =
      status === 'verified' ? 'verified' : status === 'rejected' ? 'rejected' : 'pending'
    const newOrderStatus = status === 'verified' ? 'sent_to_vendor' : undefined

    let updatedOrder: any = null
    if (targetOrderId) {
      updatedOrder = await prisma.order.update({
        where: { id: targetOrderId },
        data: {
          payment_status: newPaymentStatus,
          ...(newOrderStatus ? { status: newOrderStatus } : {}),
        },
      })

      // Post double-entry subledger journal entry upon payment verification
      if (newPaymentStatus === 'verified') {
        try {
          const orderData = prisma.order?.findUnique
            ? await prisma.order.findUnique({ where: { id: targetOrderId } })
            : null
          if (orderData) {
            const snapshot =
              (orderData.financial_snapshot as any) ||
              calculateOrderPrice({
                orderType: (orderData.order_type as any) || 'restaurant_food',
                restaurantId: orderData.restaurant_id || 'rest_01',
                restaurantName: orderData.restaurant_name,
                items: (Array.isArray(orderData.items) ? (orderData.items as any[]) : []).map(
                  (i: any) => ({
                    name: i.name || 'Food Item',
                    quantity: Number(i.quantity || i.qty || 1),
                    unitPricePaise: Math.round(Number(i.price || 0) * 100),
                  })
                ),
                delivery: {
                  baseDeliveryFeePaise: (orderData.delivery_fee || 30) * 100,
                  baseDistanceKm: 2.5,
                  perKmRatePaise: 1000,
                  roadDistanceKm: 2.5,
                },
                tipPaise: (orderData.tip || 0) * 100,
                couponDiscountPaise: (orderData.discount_amount || 0) * 100,
              })
            if (snapshot) {
              const journal = buildOrderConfirmedJournal(targetOrderId, snapshot)
              await persistJournalTransaction(journal)
            }
          }
        } catch (ledgerErr) {
          console.warn('Ledger posting notice:', ledgerErr)
        }
      }
    }

    // 3. Broadcast real-time WebSocket events across all dashboards
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

    return NextResponse.json({ success: true, count: 1 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update' }, { status: 500 })
  }
}
