/**
 * lib/payments/razorpay-split.ts
 *
 * Durable Razorpay Route split-transfer service.
 *
 * Triggered from an outbox worker only after the configured release condition
 * (razorpay_transfer_release: DELIVERY_COMPLETE | ADMIN_APPROVAL) is met.
 *
 * All transfer amounts come from the immutable Order.financial_snapshot:
 *   - Restaurant: vendorPayableNetPaise
 *   - Driver: riderPayablePaise
 *   - Platform remainder: customerPayablePaise - vendorPayableNetPaise - riderPayablePaise
 *
 * Never trusts client amounts. Creates a durable RazorpayTransfer intent before
 * any Razorpay API call. Marks processed only on provider-confirmed state.
 */

import { prisma } from '@/lib/prisma'
import { getRazorpayClient, isRouteEnabled } from '@/lib/payments/razorpay-client'

type Allocation = {
  type: 'RESTAURANT' | 'DRIVER'
  recipientId: string
  amountPaise: number
}

export interface SplitOrderParams {
  orderId: string
  actorId?: string
}

/**
 * Read the active transfer-release condition from the canonical PaymentConfig
 * (the Order model has no such field). Falls back to DELIVERY_COMPLETE.
 */
async function getTransferReleaseCondition(): Promise<'DELIVERY_COMPLETE' | 'ADMIN_APPROVAL'> {
  try {
    const cfg = await prisma.paymentConfig.findFirst({
      where: { is_active: true },
      select: { razorpay_transfer_release: true },
    })
    return cfg?.razorpay_transfer_release === 'ADMIN_APPROVAL'
      ? 'ADMIN_APPROVAL'
      : 'DELIVERY_COMPLETE'
  } catch {
    return 'DELIVERY_COMPLETE'
  }
}

/**
 * Create split Route transfers for an order after the release condition is met.
 * Idempotent: creates one RazorpayTransfer per recipient per order.
 */
export async function createRouteSplits(params: SplitOrderParams) {
  const { orderId } = params

  if (!isRouteEnabled()) {
    throw new Error('Razorpay Route transfers are disabled')
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) {
    throw new Error(`Order not found: ${orderId}`)
  }

  // Confirm order payment is verified
  if (order.payment_status !== 'verified') {
    throw new Error(`Order ${orderId} payment not verified`)
  }

  // Check release condition (read from the canonical PaymentConfig, not Order)
  const releaseCondition = await getTransferReleaseCondition()
  if (releaseCondition === 'DELIVERY_COMPLETE') {
    if (order.status !== 'delivered' && order.status !== 'completed') {
      throw new Error(`Order ${orderId} not yet delivered — release condition not met`)
    }
  } else if (releaseCondition === 'ADMIN_APPROVAL') {
    // Admin approval gate would be checked against an audit record.
    // For now require order status delivered/completed as a safe default.
    if (order.status !== 'delivered' && order.status !== 'completed') {
      throw new Error(`Order ${orderId} not yet delivered — admin approval required`)
    }
  } else {
    throw new Error(`Unknown transfer release condition: ${releaseCondition}`)
  }

  // Parse snapshot
  const snapshot = order.financial_snapshot as {
    customerPayablePaise: number
    vendorPayableNetPaise: number
    riderPayablePaise: number
  } | null
  if (!snapshot) {
    throw new Error(`Financial snapshot missing for order ${orderId}`)
  }

  const { customerPayablePaise, vendorPayableNetPaise, riderPayablePaise } = snapshot

  // Build allocations (only positive amounts)
  const allocations: Allocation[] = []
  if (Number.isSafeInteger(vendorPayableNetPaise) && vendorPayableNetPaise > 0) {
    allocations.push({
      type: 'RESTAURANT',
      recipientId: order.restaurant_id!,
      amountPaise: vendorPayableNetPaise,
    })
  }
  if (Number.isSafeInteger(riderPayablePaise) && riderPayablePaise > 0) {
    allocations.push({
      type: 'DRIVER',
      recipientId: order.rider_id!,
      amountPaise: riderPayablePaise,
    })
  }

  const totalTransfers = allocations.reduce((sum, x) => sum + x.amountPaise, 0)
  if (!Number.isSafeInteger(totalTransfers)) {
    throw new Error('Invalid paise amount in allocations')
  }
  if (totalTransfers > customerPayablePaise) {
    throw new Error('Transfers exceed captured amount')
  }

  // Resolve linked accounts for each recipient
  const transfers = await Promise.all(
    allocations.map(async (alloc) => {
      const linked = await prisma.razorpayLinkedAccount.findFirst({
        where: { entity_type: alloc.type, entity_id: alloc.recipientId },
      })
      if (!linked || linked.status !== 'active') {
        throw new Error(`No active Razorpay linked account for ${alloc.type} ${alloc.recipientId}`)
      }

      // Idempotency key: order:{orderId}:recipient:{type}:{recipientId}:v1
      const idempotencyKey = `order:${orderId}:recipient:${alloc.type}:${alloc.recipientId}:v1`

      // Check if a transfer intent already exists for this recipient/order
      const existing = await prisma.razorpayTransfer.findFirst({
        where: { idempotency_key: idempotencyKey },
      })

      // Already settled at the provider — idempotent no-op.
      if (existing && existing.razorpay_transfer_id && existing.status === 'processed') {
        return { transfer: existing, linked, alloc, idempotencyKey }
      }

      // A prior attempt already reached the provider (it has a transfer id) but
      // isn't confirmed processed. Do NOT create another transfer — that would
      // double-pay. Leave it for the transfer webhook / reconcile to resolve.
      if (existing && existing.razorpay_transfer_id) {
        return { transfer: existing, linked, alloc, idempotencyKey }
      }

      // No provider transfer id yet: safe to (re)issue the intent. Reuse the row
      // when one exists (e.g. a prior attempt threw before the API responded) so we
      // never collide on the unique idempotency_key constraint on retry.
      const transfer = existing
        ? await prisma.razorpayTransfer.update({
            where: { id: existing.id },
            data: {
              status: 'processing',
              failure_reason: null,
              linked_account_id: linked.razorpay_account_id,
              updated_at: new Date(),
            },
          })
        : await prisma.razorpayTransfer.create({
            data: {
              order_id: orderId,
              recipient_type: alloc.type,
              recipient_id: alloc.recipientId,
              linked_account_id: linked.razorpay_account_id,
              razorpay_payment_id: '', // filled below after payment lookup
              idempotency_key: idempotencyKey,
              amount_paise: alloc.amountPaise,
              currency: 'INR',
              status: 'processing',
            },
          })

      return { transfer, linked, alloc, idempotencyKey }
    })
  )

  // Find the Razorpay payment for this order to attach to transfers
  const paymentTx = await prisma.paymentTransaction.findFirst({
    where: { order_id: orderId, gateway: 'RAZORPAY', status: 'verified' },
    orderBy: { verified_at: 'desc' },
  })
  if (!paymentTx || !paymentTx.gateway_payment_id) {
    throw new Error(`No verified Razorpay payment for order ${orderId}`)
  }

  const razorpayPaymentId = paymentTx.gateway_payment_id

  // Ensure cumulative transfers for one captured payment never exceed captured amount
  const existingTransfers = await prisma.razorpayTransfer.findMany({
    where: { order_id: orderId, razorpay_payment_id: razorpayPaymentId },
  })
  const cumulativePaise = existingTransfers.reduce((sum, t) => sum + t.amount_paise, 0)
  if (cumulativePaise + totalTransfers > customerPayablePaise) {
    throw new Error('Cumulative transfers would exceed captured amount')
  }

  // Call Route API for each allocation
  const client = getRazorpayClient()
  const results: any[] = []

  for (const item of transfers) {
    const { transfer, linked, alloc } = item as {
      transfer: any
      linked: any
      alloc: Allocation
    }

    // Skip recipients whose transfer already reached the provider (settled or
    // in-flight — handled above). Never re-call the API for these or we risk
    // creating a duplicate transfer (double-pay).
    if (transfer.razorpay_transfer_id) {
      results.push({
        transferId: transfer.id,
        recipientType: alloc.type,
        recipientId: alloc.recipientId,
        amountPaise: alloc.amountPaise,
        providerTransferId: transfer.razorpay_transfer_id,
        status: transfer.status,
        skipped: true,
      })
      continue
    }

    // Attach the payment ID to the transfer record
    await prisma.razorpayTransfer.update({
      where: { id: transfer.id },
      data: { razorpay_payment_id: razorpayPaymentId },
    })

    // Create Route transfer via Razorpay API
    // Note: Route method signatures depend on the installed SDK version. Validate
    // against your pinned SDK before enabling live Route transfers.
    let providerTransferId: string | undefined
    let providerStatus: string | undefined

    try {
      const routeResp: any = await client.transfers.create({
        account: linked.razorpay_account_id,
        amount: alloc.amountPaise,
        currency: 'INR',
        notes: { crave_order_id: orderId, recipient_type: alloc.type },
      })

      providerTransferId = routeResp.id
      providerStatus = routeResp.status
    } catch (err: any) {
      // Timeout / unknown outcome: mark failed and rely on webhook reconciliation
      await prisma.razorpayTransfer.update({
        where: { id: transfer.id },
        data: {
          status: 'failed',
          failure_reason: String(err?.message ?? 'Route transfer API error'),
          updated_at: new Date(),
        },
      })
      throw err
    }

    // Persist provider transfer ID and actual provider status
    await prisma.razorpayTransfer.update({
      where: { id: transfer.id },
      data: {
        razorpay_transfer_id: providerTransferId,
        status: providerStatus === 'processed' ? 'processed' : 'pending',
        ...(providerStatus === 'processed' ? { processed_at: new Date() } : {}),
        updated_at: new Date(),
      },
    })

    results.push({
      transferId: transfer.id,
      recipientType: alloc.type,
      recipientId: alloc.recipientId,
      amountPaise: alloc.amountPaise,
      providerTransferId,
      status: providerStatus,
    })
  }

  return { orderId, results }
}

/**
 * Handle Razorpay Route transfer webhooks (transfer.processed / failed / reversed).
 * Updates only the matching RazorpayTransfer record and verifies the event payload.
 */
export async function handleRouteTransferWebhook(event: any) {
  const transferEntity = event.payload?.transfer?.entity
  if (!transferEntity) {
    throw new Error('Transfer webhook missing transfer entity')
  }

  const transferId = String(transferEntity.id ?? '')
  const status = String(transferEntity.status ?? '')
  const amount = Number(transferEntity?.amount ?? 0)

  if (!transferId || !status) {
    throw new Error('Transfer webhook missing id/status')
  }

  const transfer = await prisma.razorpayTransfer.findFirst({
    where: { razorpay_transfer_id: transferId },
  })
  if (!transfer) {
    throw new Error(`Unknown Razorpay transfer: ${transferId}`)
  }

  // Verify amount matches
  if (amount !== transfer.amount_paise) {
    throw new Error(`Transfer amount mismatch: webhook ${amount} vs local ${transfer.amount_paise}`)
  }

  const statusMap: Record<string, string> = {
    processed: 'processed',
    failed: 'failed',
    reversed: 'reversed',
  }
  const newStatus = statusMap[status] ?? transfer.status

  await prisma.razorpayTransfer.update({
    where: { id: transfer.id },
    data: {
      status: newStatus,
      ...(newStatus === 'processed' ? { processed_at: new Date() } : {}),
      ...(newStatus === 'failed'
        ? { failure_reason: String(transferEntity?.failure_reason ?? '') }
        : {}),
      updated_at: new Date(),
    },
  })

  return { transferId: transfer.id, status: newStatus }
}

/**
 * Reconcile stale transfer intents without provider IDs.
 * Unknown provider outcome is not failure — query Razorpay first.
 */
export async function reconcileStaleTransfers() {
  const staleCutoff = new Date(Date.now() - 30 * 60 * 1000) // 30 min

  const stale = await prisma.razorpayTransfer.findMany({
    where: {
      status: 'processing',
      created_at: { lt: staleCutoff },
      razorpay_transfer_id: null,
    },
    take: 50,
  })

  const results: any[] = []
  const client = getRazorpayClient()

  for (const t of stale) {
    // Query Razorpay for the transfer by idempotency key / payment
    try {
      const transfers: any = await client.transfers.all({
        from: Date.now() - 7 * 24 * 60 * 60 * 1000,
        count: 100,
      })

      const match = transfers.items.find(
        (item: any) => item.notes?.crave_order_id === t.order_id && item.amount === t.amount_paise
      )

      if (match) {
        await prisma.razorpayTransfer.update({
          where: { id: t.id },
          data: {
            razorpay_transfer_id: match.id,
            status: match.status === 'processed' ? 'processed' : 'failed',
            ...(match.status === 'processed' ? { processed_at: new Date() } : {}),
            updated_at: new Date(),
          },
        })
        results.push({ transferId: t.id, reconciled: match.status })
      } else {
        results.push({ transferId: t.id, reconciled: 'not_found' })
      }
    } catch (err: any) {
      results.push({ transferId: t.id, error: err?.message })
    }
  }

  return { reconciledCount: results.length, results }
}

/**
 * Fire-and-forget settlement entry point. Called after an order reaches
 * delivered/completed (and optionally by an admin "release settlement" action).
 *
 * Reads the release condition from the canonical PaymentConfig. Only releases
 * automatically when the condition is DELIVERY_COMPLETE; ADMIN_APPROVAL is held
 * for explicit admin release. Never throws — failures are logged and left for
 * reconciliation. Safe to call repeatedly: transfer intents are keyed per
 * order+recipient, so duplicates short-circuit.
 */
export async function maybeTriggerRouteSettlement(orderId: string): Promise<{
  triggered: boolean
  skipped?: boolean
  reason?: string
  result?: any
  error?: string
}> {
  if (!isRouteEnabled()) {
    return { triggered: false, skipped: true, reason: 'route_disabled' }
  }

  try {
    const releaseCondition = await getTransferReleaseCondition()

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { payment_status: true, status: true },
    })
    if (!order) {
      return { triggered: false, skipped: true, reason: 'order_not_found' }
    }
    if (order.payment_status !== 'verified') {
      return { triggered: false, skipped: true, reason: 'payment_not_verified' }
    }

    // ADMIN_APPROVAL never auto-releases; the admin settlement route calls
    // createRouteSplits directly once approved.
    if (releaseCondition === 'ADMIN_APPROVAL') {
      return { triggered: false, skipped: true, reason: 'admin_approval_required' }
    }

    // DELIVERY_COMPLETE: require delivered/completed before releasing.
    if (order.status !== 'delivered' && order.status !== 'completed') {
      return { triggered: false, skipped: true, reason: 'release_condition_not_met' }
    }

    const result = await createRouteSplits({ orderId })
    console.log(
      `[razorpay-split] Route settlement triggered for order ${orderId}: ${result.results?.length ?? 0} transfer(s)`
    )
    return { triggered: true, result }
  } catch (err: any) {
    // Non-fatal: durable transfer intents (if created) + reconciliation recover.
    console.error(
      `[razorpay-split] Route settlement trigger failed for order ${orderId}:`,
      err?.message
    )
    return { triggered: false, skipped: true, reason: 'error', error: err?.message }
  }
}
