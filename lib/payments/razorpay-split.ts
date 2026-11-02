/**
 * lib/payments/razorpay-split.ts
 *
 * Durable Razorpay payment-linked Route split-transfer service.
 *
 * Triggered from an outbox worker only after the configured release condition
 * (razorpay_transfer_release: DELIVERY_COMPLETE | ADMIN_APPROVAL) is met.
 *
 * All transfer amounts come from the immutable Order.financial_snapshot:
 *   - Restaurant: vendorPayableNetPaise
 *   - Driver:     riderPayablePaise
 *   - Platform remainder: customerPayablePaise - vendorPayableNetPaise - riderPayablePaise
 *
 * Never trusts client amounts. Creates a durable RazorpayTransfer intent before
 * any Razorpay API call. Marks processed only on provider-confirmed state.
 *
 * Transfer status lifecycle
 * ─────────────────────────
 *   pending     – intent created, no API call attempted yet
 *   processing  – API call in-flight or failed before a response was received
 *   unknown     – API call timed-out / network error; provider outcome is
 *                 ambiguous. Must NOT be re-submitted until reconciled.
 *   processed   – provider confirmed successful transfer
 *   failed      – provider confirmed rejection (terminal)
 *   reversed    – provider reversed the transfer (terminal)
 *
 * CR-11: This service uses PAYMENT-LINKED transfers, not direct transfers.
 * The customer's captured payment is the source of funds. Each transfer is
 * anchored to the payment via client.payments.transfers.create(paymentId, ...).
 * Direct transfers (client.transfers.create) are NOT used — they pull from
 * the merchant account balance, not from the captured payment.
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
 * CR-03-C: Verify that an admin has explicitly approved settlement for this
 * order by checking for a corresponding AdminOverrideLog entry with
 * action = 'settlement_approved'. Order status (delivered/completed) is
 * still checked as a secondary guard — admin approval does not bypass it.
 *
 * The ADMIN_APPROVAL release condition previously only checked order.status,
 * which is the same check used by DELIVERY_COMPLETE. An independent approval
 * record is required to meaningfully distinguish the two modes.
 */
async function assertAdminApproval(orderId: string): Promise<void> {
  const approvalRecord = await prisma.adminOverrideLog.findFirst({
    where: {
      order_id: orderId,
      action: 'settlement_approved',
    },
    select: { id: true, admin_id: true, created_at: true },
  })

  if (!approvalRecord) {
    throw new Error(
      `Order ${orderId} requires an explicit admin approval record ` +
        `(AdminOverrideLog.action='settlement_approved') before settlement can be released.`
    )
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
    // CR-03-C: Require order status AND an independently persisted admin
    // approval record. Order status alone is insufficient — it does not prove
    // an admin reviewed and released this specific settlement.
    if (order.status !== 'delivered' && order.status !== 'completed') {
      throw new Error(`Order ${orderId} not yet delivered — admin approval required`)
    }
    await assertAdminApproval(orderId)
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

  // CR-03-D: Validate recipient IDs before building allocations. The non-null
  // assertion operators (!) do not validate at runtime — they only suppress
  // TypeScript errors. An undefined restaurant_id or rider_id would silently
  // pass a `null` to the linked-account lookup, producing a confusing error.
  const allocations: Allocation[] = []
  if (Number.isSafeInteger(vendorPayableNetPaise) && vendorPayableNetPaise > 0) {
    if (!order.restaurant_id) {
      throw new Error(
        `Order ${orderId} has a non-zero vendor allocation but restaurant_id is null — cannot settle`
      )
    }
    allocations.push({
      type: 'RESTAURANT',
      recipientId: order.restaurant_id,
      amountPaise: vendorPayableNetPaise,
    })
  }
  if (Number.isSafeInteger(riderPayablePaise) && riderPayablePaise > 0) {
    if (!order.rider_id) {
      throw new Error(
        `Order ${orderId} has a non-zero driver allocation but rider_id is null — cannot settle`
      )
    }
    allocations.push({
      type: 'DRIVER',
      recipientId: order.rider_id,
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

      // CR-03-A: An 'unknown' status means a previous API call timed out and
      // the provider outcome is ambiguous. We MUST NOT re-submit — doing so
      // risks creating a duplicate payment if the provider did process it.
      // Leave for reconcileStaleTransfers() to resolve.
      if (existing && existing.status === 'unknown') {
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
    const { transfer, linked, alloc, idempotencyKey } = item as {
      transfer: any
      linked: any
      alloc: Allocation
      idempotencyKey: string
    }

    // Skip recipients whose transfer already reached the provider (settled,
    // in-flight, or unknown-outcome — see guard above). Never re-call the API
    // for these or we risk creating a duplicate transfer (double-pay).
    if (transfer.razorpay_transfer_id || transfer.status === 'unknown') {
      results.push({
        transferId: transfer.id,
        recipientType: alloc.type,
        recipientId: alloc.recipientId,
        amountPaise: alloc.amountPaise,
        providerTransferId: transfer.razorpay_transfer_id ?? null,
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

    // CR-11: Use PAYMENT-LINKED transfers, not direct transfers.
    // client.payments.transfers.create(paymentId, params) anchors the transfer
    // to the customer's captured payment. Direct transfers (client.transfers.create)
    // pull from the merchant account balance — the wrong source of funds.
    //
    // CR-11: Use the documented idempotency contract for this endpoint.
    // Razorpay's payment-linked transfer idempotency header is
    // X-Transfer-Idempotency, not the generic X-Idempotency-Key. The generic
    // header is not honored by the transfers endpoint, so provider-side
    // deduplication was never actually enabled.
    let providerTransferId: string | undefined
    let providerStatus: string | undefined

    try {
      const routeResp: any = await client.payments.transfers.create(
        razorpayPaymentId,
        {
          account: linked.razorpay_account_id,
          amount: alloc.amountPaise,
          currency: 'INR',
          notes: { crave_order_id: orderId, recipient_type: alloc.type },
        },
        // Razorpay Node SDK passes extra options (including custom headers) as
        // the second argument to resource methods.
        { headers: { 'X-Transfer-Idempotency': idempotencyKey } } as any
      )

      providerTransferId = routeResp.id
      providerStatus = routeResp.status
    } catch (err: any) {
      // CR-03-A: A caught error does NOT prove Razorpay rejected the transfer.
      // Timeouts and network failures frequently occur *after* the provider has
      // processed the request but before the response arrives.
      //
      // Setting status='failed' here and retrying would re-submit the transfer,
      // potentially causing a duplicate payment.
      //
      // Use status='unknown' instead: no razorpay_transfer_id is set, so the
      // guard above blocks any future re-submission. reconcileStaleTransfers()
      // will query Razorpay and transition to 'processed' or 'failed' once the
      // true outcome is confirmed.
      await prisma.razorpayTransfer.update({
        where: { id: transfer.id },
        data: {
          status: 'unknown',
          failure_reason:
            `Ambiguous provider outcome — pending reconciliation: ` +
            String(err?.message ?? 'Route transfer API error'),
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
 *
 * CR-03-A: Also reconciles rows in 'unknown' status — not only 'processing'.
 * Unknown-outcome rows have no razorpay_transfer_id and are blocked from
 * re-submission until the provider state is confirmed here. Once the
 * provider outcome is known, this job transitions rows to the correct status
 * ('processed' or 'failed'), unblocking any subsequent retry if needed.
 *
 * CR-11: Queries payment-linked transfers via client.payments.transfers.all(paymentId),
 * not the direct transfers endpoint. Each stale row carries its
 * razorpay_payment_id, so we look up transfers attached to that specific
 * payment rather than scanning the merchant's transfer history.
 */
export async function reconcileStaleTransfers() {
  const staleCutoff = new Date(Date.now() - 30 * 60 * 1000) // 30 min

  const stale = await prisma.razorpayTransfer.findMany({
    where: {
      // CR-03-A: include 'unknown' alongside 'processing' — both lack a
      // razorpay_transfer_id and require provider-side reconciliation.
      status: { in: ['processing', 'unknown'] },
      created_at: { lt: staleCutoff },
      razorpay_transfer_id: null,
    },
    take: 50,
  })

  const results: any[] = []
  const client = getRazorpayClient()

  for (const t of stale) {
    if (!t.razorpay_payment_id) {
      // CR-11: Cannot reconcile a payment-linked transfer without its payment ID.
      await prisma.razorpayTransfer.update({
        where: { id: t.id },
        data: {
          status: 'failed',
          failure_reason: 'Missing razorpay_payment_id — cannot query payment-linked transfers',
          updated_at: new Date(),
        },
      })
      results.push({ transferId: t.id, reconciled: 'missing_payment_id' })
      continue
    }

    try {
      // CR-11: Query payment-linked transfers for this specific payment.
      const transfers: any = await client.payments.transfers.all(t.razorpay_payment_id, {
        count: 100,
      })

      const match = transfers.items?.find(
        (item: any) =>
          item.notes?.crave_order_id === t.order_id &&
          item.amount === t.amount_paise
      )

      if (match) {
        // Provider confirms a matching transfer — record the outcome.
        const resolvedStatus = match.status === 'processed' ? 'processed' : 'failed'
        await prisma.razorpayTransfer.update({
          where: { id: t.id },
          data: {
            razorpay_transfer_id: match.id,
            status: resolvedStatus,
            ...(resolvedStatus === 'processed' ? { processed_at: new Date() } : {}),
            failure_reason:
              resolvedStatus === 'failed'
                ? String(match.failure_reason ?? 'Provider reported failure during reconciliation')
                : null,
            updated_at: new Date(),
          },
        })
        results.push({ transferId: t.id, reconciled: match.status, providerTransferId: match.id })
      } else {
        // Provider has no record — the transfer was never created on its side.
        // Safe to mark failed and allow a retry on the next settlement attempt.
        await prisma.razorpayTransfer.update({
          where: { id: t.id },
          data: {
            status: 'failed',
            failure_reason: 'Not found at provider during reconciliation — safe to retry',
            updated_at: new Date(),
          },
        })
        results.push({ transferId: t.id, reconciled: 'not_found_marked_failed' })
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
