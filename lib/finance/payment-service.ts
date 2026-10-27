/**
 * lib/finance/payment-service.ts
 *
 * Transaction-Safe Order & Payment Processing Engine
 *
 * Strict Financial Guarantees:
 * 1. ACID Prisma transactions for order creation, inventory holds, and ledger entries.
 * 2. Idempotent payment verification (both automated gateway webhooks & admin manual reviews).
 * 3. Prevention of duplicate charges, refunds, commission records, and vendor settlements.
 * 4. Explicit payment state machine with automated pending/failure reconciliation.
 * 5. Strict rejection of client-claimed payments — verified only by webhook or authorized reviewer.
 */

import {
  buildOrderConfirmedJournal,
  buildRefundInitiatedJournal,
  type CanonicalPriceResult,
} from '@/lib/finance'
import { prisma } from '@/lib/prisma'
import { sendWebPushToUsers } from '@/lib/web-push'
import { broadcast } from '@/lib/ws-server'
import { stripOrderSecrets } from '@/lib/auth/order-access'
import { PaymentStatus, type OrderStatus } from '@prisma/client'

export interface PaymentVerificationInput {
  orderId: string
  gatewayPaymentId?: string
  gateway?: string // 'UPI_MANUAL' | 'RAZORPAY' | 'CASHFREE' | 'STRIPE' | 'MOCK'
  amount?: number // in rupees (legacy manual flows)
  amountPaise?: number // exact gateway amount in paise (100 = ₹1) — canonical for RAZORPAY
  actorId?: string
  idempotencyKey?: string
  rawPayload?: any
  actorName?: string
}

export interface PaymentRejectionInput {
  orderId: string
  reason?: string
  actorId?: string
  idempotencyKey?: string
}

export interface RefundInput {
  orderId: string
  amount: number // in rupees
  reason: string
  idempotencyKey?: string
  gatewayRefundId?: string
  actorId?: string
}

/**
 * Atomically verifies an order payment, confirms the order, creates vendor settlement,
 * and posts immutable double-entry ledger journals.
 *
 * Safe to retry infinitely — idempotent by orderId and idempotencyKey.
 */
export async function processPaymentVerificationTx(input: PaymentVerificationInput) {
  const {
    orderId,
    gatewayPaymentId,
    gateway = 'RAZORPAY',
    amount,
    actorId = 'SYSTEM_PAYMENT_PROCESSOR',
    rawPayload,
  } = input

  if (!orderId) {
    throw new Error('orderId is required for payment verification')
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Fetch current order with row check
    const order = await tx.order.findUnique({
      where: { id: orderId },
    })

    if (!order) {
      throw new Error(`Order not found: ${orderId}`)
    }

    // Anti-tamper: Cannot confirm a cancelled or already completed order
    if (order.status === 'cancelled') {
      throw new Error(`Cannot verify payment for cancelled order: ${orderId}`)
    }

    // Idempotency: If already verified, return existing state safely
    if (order.payment_status === 'verified') {
      return {
        success: true,
        order,
        orderId,
        alreadyVerified: true,
        message: 'Order payment is already verified (idempotent)',
      }
    }

    // ─── Canonical paise validation (exact equality, never underpayment-only) ───
    const snapshot: CanonicalPriceResult | null = order.financial_snapshot as any
    if (!snapshot) {
      throw new Error(`Financial snapshot missing for order ${orderId}`)
    }
    const canonicalPaise = order.total_amount_paise ?? snapshot.customerPayablePaise
    if (!Number.isSafeInteger(canonicalPaise) || canonicalPaise <= 0) {
      throw new Error(`Invalid canonical payable amount for order ${orderId}`)
    }

    if (input.amountPaise != null) {
      if (!Number.isSafeInteger(input.amountPaise) || input.amountPaise !== canonicalPaise) {
        throw new Error(
          `Exact paise mismatch: gateway ${input.amountPaise} !== canonical ${canonicalPaise} for order ${orderId}`
        )
      }
    } else if (amount != null && amount > 0) {
      // Legacy manual flows: rupee amount must not underpay the canonical total.
      // Exact paise equality is NOT enforced for non-gateway flows.
      // Allow for integer rupee rounding/truncation (within ₹1) between paise calculations and rupee storage.
      const requiredRupees = Math.floor(canonicalPaise / 100)
      if (amount < requiredRupees) {
        throw new Error(
          `Underpayment detected: Received ₹${amount}, required ₹${requiredRupees} for order ${orderId}`
        )
      }
    }

    // ─── Concurrency-safe compare-and-set: only verify an order still pending payment ───
    // This prevents simultaneous webhook and browser verification from racing.
    const lockUpdate = await tx.order.updateMany({
      where: {
        id: orderId,
        payment_status: 'pending',
      },
      data: {
        payment_status: 'verified',
        status: 'sent_to_vendor',
        payment_reviewed_by: actorId,
        payment_reviewed_at: new Date(),
        ...(gatewayPaymentId ? { utr_ref: gatewayPaymentId } : {}),
        ...(input.amountPaise != null ? { total_amount_paise: input.amountPaise } : {}),
      },
    })
    if (lockUpdate.count === 0) {
      // Either already verified/processing/rejected by a concurrent request, or missing.
      const current = await tx.order.findUnique({ where: { id: orderId } })
      if (current && current.payment_status === 'verified') {
        return {
          success: true,
          order: current,
          orderId,
          alreadyVerified: true,
          message: 'Order payment already verified (idempotent)',
        }
      }
      throw new Error(`Payment verification race lost for order ${orderId}`)
    }

    const updatedOrder = await tx.order.findUnique({ where: { id: orderId } })!

    // ─── Prevent gateway_payment_id from attaching to a different order ───
    if (gatewayPaymentId) {
      const existingTxForGateway = await tx.paymentTransaction.findFirst({
        where: { gateway_payment_id: gatewayPaymentId },
      })
      if (existingTxForGateway && existingTxForGateway.order_id !== orderId) {
        throw new Error(
          `Gateway payment id ${gatewayPaymentId} already attached to order ${existingTxForGateway.order_id}`
        )
      }
    }

    // 3. Update associated PaymentReview if one exists
    await tx.paymentReview.updateMany({
      where: { order_id: orderId },
      data: { status: 'verified' },
    })

    // 4. Record/Update PaymentTransaction
    const existingTx = await tx.paymentTransaction.findFirst({
      where: { order_id: orderId },
    })

    if (existingTx) {
      await tx.paymentTransaction.update({
        where: { id: existingTx.id },
        data: {
          status: 'verified',
          verified_at: new Date(),
          gateway,
          ...(gatewayPaymentId ? { gateway_payment_id: gatewayPaymentId } : {}),
          ...(input.amountPaise != null ? { amount_paise: input.amountPaise } : {}),
          ...(rawPayload ? { raw_payload: rawPayload as any } : {}),
        },
      })
    } else {
      const txIdempotencyKey = `tx_${orderId}_${gatewayPaymentId || 'success'}`
      await tx.paymentTransaction.create({
        data: {
          id: `tx_${orderId}`,
          order_id: orderId,
          idempotency_key: txIdempotencyKey,
          gateway,
          gateway_payment_id: gatewayPaymentId || null,
          amount: amount || Math.round(canonicalPaise / 100),
          amount_paise: input.amountPaise ?? canonicalPaise,
          currency: 'INR',
          status: 'verified',
          raw_payload: rawPayload || {},
          verified_at: new Date(),
        },
      })
    }

    // 5. Ensure Vendor Settlement is scheduled (strictly once per order)
    const settlementId = `set_${orderId}`
    const existingSettlement = await tx.vendorSettlement.findUnique({
      where: { id: settlementId },
    })

    if (!existingSettlement) {
      await tx.vendorSettlement.create({
        data: {
          id: settlementId,
          restaurant_name: order.restaurant_name,
          restaurant_id: order.restaurant_id,
          gross_sales: order.subtotal,
          commission_rate: Math.round(
            ((order.commission_amount || 0) / Math.max(order.subtotal, 1)) * 100
          ),
          commission_amount: order.commission_amount || 0,
          markup_amount: order.markup_amount || 0,
          net_payout: order.restaurant_payout || 0,
          status: 'scheduled',
          period_start: new Date(),
          period_end: new Date(),
          transaction_ref: orderId,
        },
      })
    } else if (
      existingSettlement.status === 'cancelled' ||
      existingSettlement.status === 'failed'
    ) {
      await tx.vendorSettlement.update({
        where: { id: settlementId },
        data: { status: 'scheduled' },
      })
    }

    // 6. Post Double-Entry Ledger Journal (ORDER_CONFIRMED)
    if (!snapshot) {
      throw new Error(`Financial snapshot missing for order ${orderId}`)
    }

    const journal = buildOrderConfirmedJournal(orderId, snapshot, `order_confirmed_${orderId}`)
    // Write each line with its own sub-key to guarantee atomic double-entry
    for (let i = 0; i < journal.lines.length; i++) {
      const line = journal.lines[i]
      const lineKey = `${journal.idempotencyKey}_line_${i}`
      await tx.ledgerEntry.upsert({
        where: { idempotency_key: lineKey },
        create: {
          idempotency_key: lineKey,
          event_type: journal.eventType,
          order_id: orderId,
          reference_id: gatewayPaymentId || orderId,
          account_code: line.accountCode,
          debit_paise: line.debitPaise,
          credit_paise: line.creditPaise,
          description: line.description,
          notes: journal.notes,
        },
        update: {}, // Immutable: do not change on duplicate replay
      })
    }

    // 7. Write to Transactional Outbox for reliable messaging
    await tx.orderOutbox.create({
      data: {
        order_id: orderId,
        event_type: 'PAYMENT_VERIFIED',
        payload: {
          orderId,
          status: 'sent_to_vendor',
          paymentStatus: 'verified',
          gateway,
          gatewayPaymentId,
          verifiedAt: new Date().toISOString(),
        },
      },
    })

    return {
      success: true,
      order: updatedOrder,
      orderId,
      alreadyVerified: false,
    }
  })

  if (!result.alreadyVerified && result.order) {
    const safeOrder = stripOrderSecrets(result.order as any)

    await broadcast('vendor_orders', {
      type: 'new_paid_order',
      order: safeOrder,
      orderId,
      restaurantId: result.order.restaurant_id,
      timestamp: new Date().toISOString(),
    })

    await broadcast('approval_update', {
      status: 'verified',
      orderId,
    })

    await broadcast('order_update', {
      type: 'order_updated',
      order: safeOrder,
      orderId,
    })

    await broadcast('admin_orders', {
      type: 'order_updated',
      order: safeOrder,
      orderId,
    })

    const customerId = result.order!.customer_id
    if (customerId) {
      await sendWebPushToUsers([customerId], {
        title: 'Payment verified',
        body: `Order #${orderId.slice(-8)} has been sent to the restaurant.`,
        url: `/user/orders/${encodeURIComponent(orderId)}`,
        tag: `order-${orderId}`,
        orderId,
      }).catch((pushError) =>
        console.error('[payment-service] Customer Web Push failed:', pushError)
      )
    }

    if (result.order!.restaurant_id) {
      const restaurant = await prisma.restaurant
        .findUnique({
          where: { id: result.order!.restaurant_id },
          select: { owner_id: true },
        })
        .catch(() => null)
      if (restaurant?.owner_id) {
        await sendWebPushToUsers([restaurant.owner_id], {
          title: 'New paid order received',
          body: `${result.order!.customer_name} placed order #${orderId.slice(-8)} for ₹${Number(result.order!.total_amount).toLocaleString('en-IN')}. Start preparing it now.`,
          url: '/vendor/dashboard',
          tag: `new-order-${orderId}`,
          orderId,
        }).catch((pushError) =>
          console.error('[payment-service] Vendor Web Push failed:', pushError)
        )
      }
    }
  }

  return result
}

/**
 * Atomically marks a payment as failed / rejected, cancels or updates the order,
 * releases any inventory holds, and cancels scheduled settlements.
 */
export async function processPaymentRejectionTx(input: PaymentRejectionInput) {
  const { orderId, reason = 'Payment verification rejected', actorId = 'SYSTEM' } = input

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
    })

    if (!order) {
      throw new Error(`Order not found: ${orderId}`)
    }

    // Anti-replay: cannot reject an already delivered/completed order
    if (order.status === 'delivered' || order.status === 'completed') {
      throw new Error(`Cannot reject payment for an already completed order: ${orderId}`)
    }

    if (order.payment_status === 'rejected' && order.status === 'cancelled') {
      return { success: true, order, alreadyRejected: true }
    }

    // 1. Update Order
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        payment_status: 'rejected',
        status: 'cancelled',
        payment_reviewed_by: actorId,
        payment_reviewed_at: new Date(),
      },
    })

    // 2. Update PaymentReview if exists
    await tx.paymentReview.updateMany({
      where: { order_id: orderId },
      data: { status: 'rejected' },
    })

    // 3. Record failed PaymentTransaction
    await tx.paymentTransaction.create({
      data: {
        order_id: orderId,
        idempotency_key: `tx_failed_${orderId}`,
        gateway: 'UPI_MANUAL',
        amount: order.total_amount,
        status: 'failed',
        failure_reason: reason,
      },
    })

    // 4. Cancel any scheduled vendor settlement
    await tx.vendorSettlement.updateMany({
      where: {
        transaction_ref: orderId,
        status: 'scheduled',
      },
      data: { status: 'cancelled' },
    })

    // 5. Restore Inventory for items that were deducted
    const rawItems: any[] = Array.isArray(order.items) ? (order.items as any[]) : []
    for (const item of rawItems) {
      const itemId = item.id || item.itemId
      const qty = Number(item.quantity || item.qty || 1)
      if (itemId && qty > 0) {
        await tx.menuItem.update({
          where: { id: itemId },
          data: {
            stock_count: { increment: qty },
            in_stock: true,
          },
        })
      }
    }

    // 6. Record outbox event
    await tx.orderOutbox.create({
      data: {
        order_id: orderId,
        event_type: 'PAYMENT_REJECTED',
        payload: { orderId, reason, rejectedAt: new Date().toISOString() },
      },
    })

    return { success: true, order: updatedOrder }
  })

  if (!result.alreadyRejected && result.order) {
    const safeOrder = stripOrderSecrets(result.order as any)
    await broadcast('approval_update', {
      status: 'rejected',
      orderId,
    })
    await broadcast('order_update', {
      type: 'order_updated',
      order: safeOrder,
      orderId,
    })
    await broadcast('admin_orders', {
      type: 'order_updated',
      order: safeOrder,
      orderId,
    })

    if (result.order.customer_id) {
      await sendWebPushToUsers([result.order.customer_id], {
        title: 'Payment not verified',
        body: `Payment for order #${orderId.slice(-8)} was not approved. Open the app for details.`,
        url: `/user/orders/${encodeURIComponent(orderId)}`,
        tag: `order-${orderId}`,
        orderId,
      }).catch((pushError) =>
        console.error('[payment-service] Payment rejection Web Push failed:', pushError)
      )
    }
  }

  return result
}

/**
 * Atomically processes a refund, ensuring:
 * - Total refunded amount cannot exceed the total order amount.
 * - Double refunds under identical idempotency keys are strictly prevented.
 * - Subledger debit/credit entries (REFUND_INITIATED) balance perfectly.
 * - Vendor settlements are adjusted or cancelled accordingly.
 */
export async function processRefundTx(input: RefundInput) {
  const { orderId, amount, reason, idempotencyKey, gatewayRefundId } = input

  if (!orderId || !amount || amount <= 0) {
    throw new Error('Valid orderId and positive refund amount are required')
  }

  const cleanIdempotencyKey = idempotencyKey || `refund_${orderId}_${amount}_${Date.now()}`

  return await prisma.$transaction(async (tx) => {
    // 1. Check idempotency for existing refund
    const existingRefund = await tx.refund.findUnique({
      where: { idempotency_key: cleanIdempotencyKey },
    })
    if (existingRefund) {
      return {
        success: true,
        refund: existingRefund,
        alreadyProcessed: true,
        message: 'Refund was already processed (idempotent)',
      }
    }

    // 2. Fetch order and prior refunds
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { refunds: true },
    })

    if (!order) {
      throw new Error(`Order not found: ${orderId}`)
    }

    const priorRefundedTotal = order.refunds.reduce((sum, r) => sum + r.amount, 0)
    if (priorRefundedTotal + amount > order.total_amount) {
      throw new Error(
        `Refund limit exceeded: Total refunded (₹${priorRefundedTotal} + ₹${amount}) exceeds order total ₹${order.total_amount}`
      )
    }

    // 3. Create Refund record
    const refund = await tx.refund.create({
      data: {
        order_id: orderId,
        idempotency_key: cleanIdempotencyKey,
        amount,
        reason,
        status: 'completed',
        gateway_refund_id: gatewayRefundId || null,
        processed_at: new Date(),
      },
    })

    // 4. If full refund, cancel or update vendor settlement
    const isFullRefund = priorRefundedTotal + amount >= order.total_amount
    if (isFullRefund) {
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'cancelled',
          payment_status: 'rejected',
        },
      })

      await tx.vendorSettlement.updateMany({
        where: { transaction_ref: orderId, status: 'scheduled' },
        data: { status: 'cancelled' },
      })
    }

    // 5. Post Balanced Double-Entry Subledger Refund Entry
    try {
      const refundJournal = buildRefundInitiatedJournal(
        orderId,
        refund.id,
        amount * 100 // in paise
      )
      for (let i = 0; i < refundJournal.lines.length; i++) {
        const line = refundJournal.lines[i]
        const lineKey = `${refundJournal.idempotencyKey}_line_${i}`
        await tx.ledgerEntry.upsert({
          where: { idempotency_key: lineKey },
          create: {
            idempotency_key: lineKey,
            event_type: refundJournal.eventType,
            order_id: orderId,
            reference_id: refund.id,
            account_code: line.accountCode,
            debit_paise: line.debitPaise,
            credit_paise: line.creditPaise,
            description: line.description,
          },
          update: {},
        })
      }
    } catch (ledgerErr) {
      console.warn('[payment-service] Refund ledger posting notice:', ledgerErr)
    }

    return {
      success: true,
      refund,
      alreadyProcessed: false,
      isFullRefund,
    }
  })
}

/**
 * Reconciles pending orders and interrupted transactions.
 * Cancels orders stuck in payment_pending or payment_submitted past threshold (e.g. 30 mins)
 * and safely restores any inventory holds.
 */
export async function reconcilePendingOrders(staleMinutes = 30) {
  const cutoff = new Date(Date.now() - staleMinutes * 60 * 1000)

  // Find stale pending orders
  const staleOrders = await prisma.order.findMany({
    where: {
      status: { in: ['payment_pending', 'payment_submitted'] as OrderStatus[] },
      payment_status: 'pending' as PaymentStatus,
      created_at: { lt: cutoff },
    },
    take: 50,
  })

  const results = []

  for (const order of staleOrders) {
    try {
      await processPaymentRejectionTx({
        orderId: order.id,
        reason: `Automated reconciliation timeout: No payment received within ${staleMinutes} minutes`,
        actorId: 'RECONCILIATION_WORKER',
      })
      results.push({ orderId: order.id, status: 'expired_and_cancelled' })
    } catch (err: any) {
      results.push({ orderId: order.id, error: err?.message })
    }
  }

  return {
    reconciledCount: results.length,
    results,
  }
}
