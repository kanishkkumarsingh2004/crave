import { prisma } from '@/lib/prisma'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/jwt'
import { broadcast } from '@/lib/ws-server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) token = (await cookies()).get('crave_auth_token')?.value || ''

    const payload = token ? await verifyToken(token) : null
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'admin access required' }, { status: 403 })
    }

    const url = new URL(request.url)
    const status = url.searchParams.get('status') || undefined
    const reviews = await prisma.paymentReview.findMany({
      where: status ? { status } : undefined,
      orderBy: { created_at: 'desc' },
    })
    return NextResponse.json({ success: true, reviews })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load reviews' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) token = (await cookies()).get('crave_auth_token')?.value || ''

    const payload = token ? await verifyToken(token) : null
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { id, orderId, status } = body
    const targetId = id || orderId

    if (!targetId || !status) {
      return NextResponse.json({ error: 'Review ID and status are required' }, { status: 400 })
    }

    let targetOrderId = orderId || id
    let review: any = null

    // 1. Update Payment Review in DB (Prisma & Supabase)
    try {
      if (id) {
        review = await prisma.paymentReview.update({
          where: { id },
          data: { status },
        })
        if (review?.order_id) targetOrderId = review.order_id
      }
    } catch {}

    if (!review && targetOrderId) {
      try {
        await prisma.paymentReview.updateMany({
          where: { order_id: targetOrderId },
          data: { status },
        })
      } catch {}
      try {
        await supabase.from('payment_reviews').update({ status }).eq('order_id', targetOrderId)
      } catch {}
    }

    // 2. Update the corresponding Order record in database (Prisma & Supabase)
    const newPaymentStatus =
      status === 'verified' ? 'verified' : status === 'rejected' ? 'rejected' : 'pending'
    const newOrderStatus = status === 'verified' ? 'sent_to_vendor' : undefined

    let updatedOrder: any = null
    if (targetOrderId) {
      try {
        updatedOrder = await prisma.order.update({
          where: { id: targetOrderId },
          data: {
            payment_status: newPaymentStatus,
            ...(newOrderStatus ? { status: newOrderStatus as any } : {}),
          },
        })
      } catch (e) {
        try {
          const updatePayload: any = { payment_status: newPaymentStatus }
          if (newOrderStatus) updatePayload.status = newOrderStatus
          const { data } = await supabase
            .from('orders')
            .update(updatePayload)
            .eq('id', targetOrderId)
            .select()
            .single()
          updatedOrder = data
        } catch (err) {}
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
