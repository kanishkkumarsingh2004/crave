import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { supabase } from '@/lib/supabase'
import { verifyToken, type JWTPayload } from '@/lib/jwt'
import { broadcast } from '@/lib/ws-server'
import { cookies } from 'next/headers'
import { PaymentStatus } from '@prisma/client'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) token = (await cookies()).get('crave_auth_token')?.value || (await cookies()).get('crave_token')?.value || ''
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
    return NextResponse.json({ error: error?.message || 'Failed to load payment reviews' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) token = (await cookies()).get('crave_auth_token')?.value || (await cookies()).get('crave_token')?.value || ''
    const payload = token ? await verifyToken(token) : null

    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 })
    }

    const review = await prisma.paymentReview.findUnique({ where: { id } })
    if (!review) {
      return NextResponse.json({ error: 'Payment review not found' }, { status: 404 })
    }

    const targetOrderId = review.order_id
    if (!targetOrderId) {
      return NextResponse.json({ error: 'Order ID not found in review' }, { status: 400 })
    }

    // 2. Update the corresponding Order record in database (Prisma & Supabase)
    const newPaymentStatus = status === 'verified' ? 'verified' : status === 'rejected' ? 'rejected' : 'pending'
    const newOrderStatus = status === 'verified' ? 'sent_to_vendor' : undefined

    let updatedOrder: any = null
    if (targetOrderId) {
      try {
        updatedOrder = await prisma.order.update({
          where: { id: targetOrderId },
          data: {
            payment_status: newPaymentStatus,
            ...(newOrderStatus ? { status: newOrderStatus } : {}),
          },
        })
      } catch (e) {
        try {
          const updatePayload: { payment_status: string; status?: string } = { payment_status: newPaymentStatus }
          if (newOrderStatus) updatePayload.status = newOrderStatus
          const { data } = await supabase
            .from('orders')
            .update(updatePayload)
            .eq('id', targetOrderId)
            .select()
            .single()
          updatedOrder = data
        } catch (e) {}
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