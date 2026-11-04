import { NextResponse } from 'next/server'
import { prisma } from '@/lib/infra/prisma'
import { requireRole, handleAuthError } from '@/lib/auth/auth-helpers'
import { broadcast } from '@/lib/ws-server'
import { approveRefundRequestTx, processRefundTx } from '@/lib/finance/payment-service'
import { verifyManualRazorpayRefund } from '@/lib/payments/razorpay-refunds'

export async function GET(request: Request) {
  try {
    await requireRole(request, 'admin')

    // Fetch cancelled orders or orders that have a refund entry
    const cancelledOrders = await prisma.order.findMany({
      where: {
        OR: [{ status: 'cancelled' }, { refunds: { some: {} } }],
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        restaurant: {
          select: {
            id: true,
            name: true,
            phone: true,
            address: true,
          },
        },
        refunds: {
          orderBy: { created_at: 'desc' },
        },
        payment_transactions: {
          orderBy: { created_at: 'desc' },
          take: 3,
        },
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    })

    // Compute metrics
    let totalCancelledCount = cancelledOrders.length
    let pendingRefundsCount = 0
    let pendingRefundsPaise = 0
    let approvedRefundsPaise = 0

    const formattedOrders = cancelledOrders.map((order) => {
      const activeRefund = order.refunds[0] || null
      const refundStatus = activeRefund ? activeRefund.status : 'not_requested'
      const amountPaise =
        order.total_amount_paise || (order.total_amount ? order.total_amount * 100 : 0)
      const refundAmountPaise =
        activeRefund?.amount_paise ||
        (activeRefund?.amount ? activeRefund.amount * 100 : amountPaise)

      if (refundStatus === 'pending') {
        pendingRefundsCount++
        pendingRefundsPaise += refundAmountPaise
      } else if (refundStatus === 'completed') {
        approvedRefundsPaise += refundAmountPaise
      }

      // Safe parse items
      let itemsList: any[] = []
      if (typeof order.items === 'string') {
        try {
          itemsList = JSON.parse(order.items)
        } catch {
          itemsList = []
        }
      } else if (Array.isArray(order.items)) {
        itemsList = order.items
      }

      return {
        id: order.id,
        status: order.status,
        paymentStatus: order.payment_status,
        paymentMethod: order.payment_method || 'Online UPI',
        utrRef: order.utr_ref,
        createdAt: order.created_at,
        totalAmount: order.total_amount,
        totalAmountPaise: amountPaise,
        subtotal: order.subtotal,
        deliveryFee: order.delivery_fee ?? 0,
        platformFee: order.platform_fee ?? 0,
        handlingFee: order.handling_fee ?? 0,
        packagingFee: order.packaging_fee ?? 0,
        gst: order.gst ?? 0,
        items: itemsList,
        customer: order.customer
          ? {
              id: order.customer.id,
              name: order.customer.name,
              email: order.customer.email,
              phone: order.customer.phone || 'Not provided',
            }
          : {
              id: 'unknown',
              name: 'Customer',
              email: 'guest@crave.local',
              phone: 'Not provided',
            },
        restaurant: order.restaurant
          ? {
              id: order.restaurant.id,
              name: order.restaurant.name,
              phone: order.restaurant.phone,
              address: order.restaurant.address,
            }
          : {
              id: 'unknown',
              name: 'Crave Kitchen',
              phone: null,
              address: null,
            },
        refund: activeRefund
          ? {
              id: activeRefund.id,
              status: activeRefund.status,
              amount: activeRefund.amount,
              amountPaise: activeRefund.amount_paise,
              reason: activeRefund.reason,
              createdAt: activeRefund.created_at,
              processedAt: activeRefund.processed_at,
              gatewayRefundId: activeRefund.gateway_refund_id,
              providerConfirmedAt: activeRefund.provider_confirmed_at,
            }
          : null,
      }
    })

    return NextResponse.json({
      success: true,
      orders: formattedOrders,
      metrics: {
        totalCancelledCount,
        pendingRefundsCount,
        pendingRefundsPaise,
        pendingRefundsRupees: Math.round(pendingRefundsPaise / 100),
        approvedRefundsPaise,
        approvedRefundsRupees: Math.round(approvedRefundsPaise / 100),
      },
    })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireRole(request, 'admin')
    const body = await request.json()
    const { orderId, refundId, action, notes, gatewayRefundId } = body

    if (!orderId || !action) {
      return NextResponse.json({ error: 'orderId and action are required' }, { status: 400 })
    }

    if (!['approve', 'reject', 'confirm'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be approve, reject, or confirm' },
        { status: 400 }
      )
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { refunds: true },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const targetRefund = refundId ? order.refunds.find((r) => r.id === refundId) : order.refunds[0]

    const amountPaise =
      order.total_amount_paise || (order.total_amount ? order.total_amount * 100 : 0)

    const requestedPaise =
      targetRefund?.amount_paise ??
      (targetRefund?.amount != null ? targetRefund.amount * 100 : amountPaise)
    let updatedRefund
    if (action === 'approve') {
      const request = targetRefund
        ? targetRefund
        : (
            await processRefundTx({
              orderId,
              amountPaise: requestedPaise,
              reason: notes || 'Admin approved refund request',
              idempotencyKey: `admin_refund_${orderId}_${requestedPaise}`,
              actorId: admin.id,
            })
          ).refund
      updatedRefund = await approveRefundRequestTx({
        refundId: request.id,
        actorId: admin.id,
        reason: notes || request.reason,
      })
    } else if (action === 'confirm') {
      if (!targetRefund || typeof gatewayRefundId !== 'string' || !gatewayRefundId.trim()) {
        return NextResponse.json(
          { error: 'A refund and Razorpay refund ID are required for confirmation' },
          { status: 400 }
        )
      }
      const outcome = await verifyManualRazorpayRefund({
        refundId: targetRefund.id,
        gatewayRefundId: gatewayRefundId.trim(),
        actorId: admin.id,
      })
      updatedRefund = outcome.refund
    } else {
      if (targetRefund?.status === 'completed' || targetRefund?.status === 'processing') {
        return NextResponse.json(
          {
            error:
              targetRefund.status === 'processing'
                ? 'A provider-submitted refund must be resolved from Razorpay status'
                : 'A provider-confirmed refund cannot be rejected',
          },
          { status: 409 }
        )
      }
      updatedRefund = targetRefund
        ? await prisma.refund.update({
            where: { id: targetRefund.id },
            data: {
              status: 'failed',
              processed_at: new Date(),
              reason: notes ? `${targetRefund.reason} | Note: ${notes}` : targetRefund.reason,
            },
          })
        : await prisma.refund.create({
            data: {
              order_id: orderId,
              idempotency_key: `admin_refund_rejected_${orderId}_${Date.now()}`,
              amount: Math.ceil(requestedPaise / 100),
              amount_paise: requestedPaise,
              reason: notes || 'Admin rejected refund request',
              status: 'failed',
              processed_at: new Date(),
            },
          })
    }

    if (action !== 'approve') {
      await prisma.adminOverrideLog.create({
        data: {
          admin_id: admin.id,
          order_id: orderId,
          action: action === 'confirm' ? 'REFUND_PROVIDER_VERIFIED' : 'REFUND_REJECTED',
          reason:
            notes ||
            (action === 'confirm'
              ? `Verified Razorpay refund ${gatewayRefundId}`
              : 'Refund rejected'),
        },
      })
    }

    // Broadcast live update
    await broadcast('admin_orders', {
      type: 'refund_updated',
      orderId,
      refundStatus: updatedRefund.status,
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      message:
        action === 'approve'
          ? 'Refund approved. Process it in Razorpay, then enter the provider refund ID.'
          : action === 'confirm'
            ? updatedRefund.status === 'completed'
              ? 'Razorpay confirmed the refund and accounting is complete.'
              : `Razorpay refund is ${updatedRefund.status}.`
            : 'Refund has been rejected.',
      refund: updatedRefund,
    })
  } catch (error) {
    return handleAuthError(error)
  }
}
