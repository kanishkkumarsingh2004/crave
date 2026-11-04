import { failRefundFromProviderTx, processRefundTx } from '@/lib/finance/payment-service'
import { getRazorpayClient } from '@/lib/payments/razorpay-client'
import { prisma } from '@/lib/infra/prisma'
import { broadcast } from '@/lib/ws-server'
import { sendWebPushToUsers } from '@/lib/web-push'

type RazorpayRefundEntity = {
  id?: unknown
  payment_id?: unknown
  amount?: unknown
  currency?: unknown
  status?: unknown
  notes?: unknown
  [key: string]: unknown
}

async function notifyCustomerRefundStatus(refund: {
  id: string
  order_id: string
  status: string
  amount_paise: number | null
  amount: number
}) {
  await broadcast('order_update', {
    type: 'refund_updated',
    orderId: refund.order_id,
    refund: {
      status: refund.status,
      amountPaise: refund.amount_paise ?? refund.amount * 100,
    },
  }).catch(() => {})
  const order = await prisma.order.findUnique({
    where: { id: refund.order_id },
    select: { customer_id: true },
  })
  if (order?.customer_id && refund.status === 'failed') {
    await sendWebPushToUsers([order.customer_id], {
      title: 'Refund needs attention',
      body: `The payment provider reported that refund #${refund.id.slice(-8)} failed. Our support team can help.`,
      url: `/user/orders/${encodeURIComponent(refund.order_id)}`,
      tag: `refund-${refund.id}`,
      orderId: refund.order_id,
    }).catch(() => {})
  }
}

async function getRefundContext(refundId: string) {
  const refund = await prisma.refund.findUnique({
    where: { id: refundId },
    include: {
      order: {
        include: {
          payment_transactions: {
            where: { gateway: 'RAZORPAY', status: 'verified' },
            orderBy: { verified_at: 'desc' },
          },
        },
      },
    },
  })
  if (!refund) throw new Error('Refund request not found')
  const payment = refund.order.payment_transactions.find((entry) => entry.gateway_payment_id)
  if (!payment?.gateway_payment_id) {
    throw new Error('The order has no verified Razorpay payment transaction')
  }
  return { refund, paymentId: payment.gateway_payment_id }
}

function validateRefundEntity(params: {
  entity: RazorpayRefundEntity
  gatewayRefundId: string
  paymentId: string
  amountPaise: number
}) {
  const { entity, gatewayRefundId, paymentId, amountPaise } = params
  if (String(entity.id ?? '') !== gatewayRefundId) {
    throw new Error('Razorpay returned a different refund ID')
  }
  if (String(entity.payment_id ?? '') !== paymentId) {
    throw new Error('Razorpay refund does not belong to this order payment')
  }
  if (String(entity.currency ?? '').toUpperCase() !== 'INR') {
    throw new Error('Razorpay refund currency must be INR')
  }
  if (!Number.isSafeInteger(Number(entity.amount)) || Number(entity.amount) !== amountPaise) {
    throw new Error('Razorpay refund amount does not match the approved refund')
  }
  const status = String(entity.status ?? '').toLowerCase()
  if (!['pending', 'processed', 'failed'].includes(status)) {
    throw new Error(`Unsupported Razorpay refund status: ${status || 'missing'}`)
  }
  return status as 'pending' | 'processed' | 'failed'
}

export async function applyVerifiedRazorpayRefundEntity(params: {
  refundId: string
  entity: RazorpayRefundEntity
  actorId: string
}) {
  const { refund, paymentId } = await getRefundContext(params.refundId)
  const gatewayRefundId = String(params.entity.id ?? '')
  const amountPaise = refund.amount_paise ?? refund.amount * 100
  const status = validateRefundEntity({
    entity: params.entity,
    gatewayRefundId,
    paymentId,
    amountPaise,
  })

  if (refund.status === 'completed') {
    if (refund.gateway_refund_id !== gatewayRefundId) {
      throw new Error('Refund was already completed by a different provider transaction')
    }
    return { refund, providerStatus: 'processed' as const, alreadyProcessed: true }
  }

  if (status === 'failed') {
    const failed = await failRefundFromProviderTx({
      orderId: refund.order_id,
      amountPaise,
      gatewayRefundId,
      reason: 'Razorpay reports the refund as failed',
    })
    await notifyCustomerRefundStatus(failed.refund)
    return { refund: failed.refund, providerStatus: status, alreadyProcessed: false }
  }

  if (status === 'pending') {
    const linked = await prisma.refund.update({
      where: { id: refund.id },
      data: {
        status: 'processing',
        gateway_refund_id: gatewayRefundId,
      },
    })
    await notifyCustomerRefundStatus(linked)
    return { refund: linked, providerStatus: status, alreadyProcessed: false }
  }

  const result = await processRefundTx({
    orderId: refund.order_id,
    amountPaise,
    reason: refund.reason,
    idempotencyKey: refund.idempotency_key,
    gatewayRefundId,
    providerConfirmed: true,
    actorId: params.actorId,
  })
  return { ...result, providerStatus: status }
}

export async function verifyManualRazorpayRefund(params: {
  refundId: string
  gatewayRefundId: string
  actorId: string
}) {
  const { paymentId } = await getRefundContext(params.refundId)
  const entity = (await getRazorpayClient().payments.fetchRefund(
    paymentId,
    params.gatewayRefundId
  )) as unknown as RazorpayRefundEntity
  return applyVerifiedRazorpayRefundEntity({
    refundId: params.refundId,
    entity,
    actorId: params.actorId,
  })
}

export async function applySignedRazorpayRefundEvent(params: {
  entity: RazorpayRefundEntity
  actorId: string
}) {
  const gatewayRefundId = String(params.entity.id ?? '')
  const paymentId = String(params.entity.payment_id ?? '')
  const amountPaise = Number(params.entity.amount)
  if (!gatewayRefundId || !paymentId || !Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
    throw new Error('Invalid Razorpay refund payload')
  }

  const payment = await prisma.paymentTransaction.findFirst({
    where: { gateway: 'RAZORPAY', gateway_payment_id: paymentId, status: 'verified' },
    orderBy: { verified_at: 'desc' },
  })
  if (!payment) throw new Error('Unknown Razorpay payment for refund event')

  const refund =
    (await prisma.refund.findUnique({ where: { gateway_refund_id: gatewayRefundId } })) ||
    (await prisma.refund.findFirst({
      where: {
        order_id: payment.order_id,
        amount_paise: amountPaise,
        status: { in: ['processing', 'pending', 'failed'] },
      },
      orderBy: { created_at: 'asc' },
    }))
  if (!refund) throw new Error('No approved refund request matches the Razorpay event')

  return applyVerifiedRazorpayRefundEntity({
    refundId: refund.id,
    entity: params.entity,
    actorId: params.actorId,
  })
}
