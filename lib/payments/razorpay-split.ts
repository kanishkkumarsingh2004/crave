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
 * CR-11: This service uses PAYMENT-LINKED batch transfers, not direct transfers.
 * The customer's captured payment is the source of funds. Each transfer is
 * anchored to the payment via client.payments.transfer(paymentId, { transfers: [...] }).
 * Direct transfers (client.transfers.create) are NOT used — they pull from
 * the merchant account balance, not from the captured payment.
 *
 * The batch endpoint creates all transfers for a payment in one call and
 * returns { entity, count, items: RazorpayTransfer[] }. Razorpay describes
 * payment-linked transfers as deduplicated on the payment ID, but this
 * service does NOT rely on that as its sole duplicate guard — it enforces an
 * atomic pending → processing single-flight lock in PostgreSQL before any
 * provider call. No per-transfer idempotency header is needed.
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
 * (the Order model has no such field). Falls back to DELIVERY_COMPLETE only
 * when the database has been successfully queried and no active configuration
 * exists.
 *
 * CR-16: A database error must NOT silently fall back to DELIVERY_COMPLETE.
 * If the platform is configured for ADMIN_APPROVAL and the config query
 * temporarily fails, falling back to automatic settlement is the opposite
 * of what a financial release-control system should do. Fail closed: throw
 * so the caller surfaces an error and the settlement is held until the
 * configuration can be read.
 */
async function getTransferReleaseCondition(): Promise<'DELIVERY_COMPLETE' | 'ADMIN_APPROVAL'> {
  const cfg = await prisma.paymentConfig.findFirst({
    where: { is_active: true },
    select: { razorpay_transfer_release: true },
  })

  // CR-16: Only use the default when the DB query succeeded and no active
  // configuration exists. A missing config means "no release condition has
  // been explicitly set" — defaulting to the more restrictive manual review
  // would be safer, but DELIVERY_COMPLETE is the documented default for a
  // fresh install. The key invariant: this branch is unreachable on DB error.
  return cfg?.razorpay_transfer_release === 'ADMIN_APPROVAL'
    ? 'ADMIN_APPROVAL'
    : 'DELIVERY_COMPLETE'
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

      // Atomic single-flight settlement lock: only transition pending → processing.
      // If another worker already set this row to processing, updateMany matches
      // zero rows and we skip — the row is in-flight and must not be re-submitted
      // just because its provider ID hasn't been persisted yet.
      let transfer: any
      if (existing) {
        const updated = await prisma.razorpayTransfer.updateMany({
          where: { id: existing.id, status: 'pending' },
          data: {
            status: 'processing',
            failure_reason: null,
            linked_account_id: linked.razorpay_account_id,
            updated_at: new Date(),
          },
        })
        if (updated.count === 0) {
          // In-flight by another worker (processing/failed/unknown). Do not
          // re-submit — leave for reconcileStaleTransfers() to resolve.
          const current = await prisma.razorpayTransfer.findUnique({
            where: { id: existing.id },
          })
          return { transfer: current, linked, alloc, idempotencyKey }
        }
        transfer = await prisma.razorpayTransfer.findUnique({
          where: { id: existing.id },
        })
      } else {
        try {
          transfer = await prisma.razorpayTransfer.create({
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
        } catch (err: any) {
          // P2002: another concurrent call created the row first (unique
          // idempotency_key). Re-read and treat as existing — if it's
          // processing, the guard below will skip it.
          if (err?.code === 'P2002') {
            const current = await prisma.razorpayTransfer.findFirst({
              where: { idempotency_key: idempotencyKey },
            })
            if (current) {
              return { transfer: current, linked, alloc, idempotencyKey }
            }
          }
          throw err
        }
      }

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

  // Separate allocations into "already settled" (skip) and "needs creation".
  // The batch transfer endpoint creates all transfers for a payment in one
  // call and returns { entity, count, items: RazorpayTransfer[] }. Razorpay
  // describes payment-linked transfers as deduplicated on the payment ID, but
  // this service does NOT rely on that as its sole duplicate guard — the
  // atomic pending → processing lock above already prevents re-submission.
  //
  // CR-11: Use PAYMENT-LINKED batch transfers (client.payments.transfer),
  // not direct transfers (client.transfers.create). Direct transfers pull
  // from the merchant account balance — the wrong source of funds. The
  // batch endpoint anchors every transfer to the customer's captured
  // payment, which is the intended settlement source.
  const pending: typeof transfers = []
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
    // A processing row means another worker owns this settlement — it must
    // not be submitted again just because its provider ID isn't persisted yet.
    if (
      transfer.razorpay_transfer_id ||
      transfer.status === 'unknown' ||
      transfer.status === 'processing'
    ) {
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

    // Attach the payment ID to the transfer record before the batch call so
    // reconcileStaleTransfers() can later query payment-linked transfers.
    await prisma.razorpayTransfer.update({
      where: { id: transfer.id },
      data: { razorpay_payment_id: razorpayPaymentId },
    })

    pending.push(item)
  }

  if (pending.length > 0) {
    let batchResp: any

    try {
      batchResp = await client.payments.transfer(razorpayPaymentId, {
        transfers: pending.map(({ alloc, linked }) => ({
          account: linked.razorpay_account_id,
          amount: alloc.amountPaise,
          currency: 'INR',
          notes: { crave_order_id: orderId, recipient_type: alloc.type },
        })),
      })
    } catch (err: any) {
      // CR-03-A: A caught error does NOT prove Razorpay rejected the transfers.
      // Timeouts and network failures frequently occur *after* the provider has
      // processed the request but before the response arrives.
      //
      // Setting status='failed' here and retrying would re-submit the batch,
      // potentially causing duplicate payments.
      //
      // Use status='unknown' for every pending row: no razorpay_transfer_id is
      // set, so the guard above blocks any future re-submission.
      // reconcileStaleTransfers() will query Razorpay and transition rows to
      // 'processed' or 'failed' once the true outcome is confirmed.
      for (const item of pending) {
        const { transfer } = item as { transfer: any }
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
      }
      throw err
    }

    // Match batch response items back to local transfer records by recipient
    // and amount. The batch response returns provider transfer IDs and
    // statuses; we persist each one on the matching local row.
    const batchItems: any[] = batchResp.items ?? []
    for (const item of pending) {
      const { transfer, alloc } = item as { transfer: any; alloc: Allocation }
      const match = batchItems.find(
        (b: any) =>
          b.recipient === alloc.recipientId ||
          (b.notes?.crave_order_id === orderId &&
            b.notes?.recipient_type === alloc.type &&
            b.amount === alloc.amountPaise)
      )

      if (!match) {
        // Provider did not return a matching transfer — leave the row in
        // 'unknown' so reconcileStaleTransfers() can resolve it.
        await prisma.razorpayTransfer.update({
          where: { id: transfer.id },
          data: {
            status: 'unknown',
            failure_reason: 'No matching transfer in batch response — pending reconciliation',
            updated_at: new Date(),
          },
        })
        results.push({
          transferId: transfer.id,
          recipientType: alloc.type,
          recipientId: alloc.recipientId,
          amountPaise: alloc.amountPaise,
          providerTransferId: null,
          status: 'unknown',
        })
        continue
      }

      const providerStatus = String(match.status ?? '')
      await prisma.razorpayTransfer.update({
        where: { id: transfer.id },
        data: {
          razorpay_transfer_id: match.id,
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
        providerTransferId: match.id,
        status: providerStatus,
      })
    }
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
    created: 'pending',
    pending: 'pending',
    processed: 'processed',
    failed: 'failed',
    reversed: 'reversed',
    partially_reversed: 'reversed',
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
 * CR-11: Queries payment-linked transfers via client.payments.fetchTransfer(paymentId),
 * which returns { entity, count, items: RazorpayTransfer[] } for transfers
 * attached to a specific captured payment. Each stale row carries its
 * razorpay_payment_id, so we look up transfers attached to that specific
 * payment rather than scanning the merchant's transfer history.
 *
 * CR-15: A match requires ALL of:
 *   - amount matches
 *   - recipient (linked account ID) matches the expected linked account
 *   - notes.crave_order_id matches the order reference
 *   - notes.recipient_type matches the recipient type (RESTAURANT | DRIVER)
 *
 * A missing result is NOT definitive evidence that a transfer was never
 * processed — the listing may be paginated or the provider may not have
 * returned the record in this batch. Ambiguous outcomes are kept in
 * reconciliation until conclusively resolved; they are never marked
 * 'failed' solely because a limited listing returned no match.
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
      // CR-15: Do NOT mark as failed — an ambiguous outcome must stay in
      // reconciliation. Marking failed here would authorize a retry that
      // could double-pay. Keep the row in 'unknown' so the next run can try
      // again once the payment ID is available.
      await prisma.razorpayTransfer.update({
        where: { id: t.id },
        data: {
          status: 'unknown',
          failure_reason:
            'Missing razorpay_payment_id — cannot query payment-linked transfers; remaining in reconciliation',
          updated_at: new Date(),
        },
      })
      results.push({ transferId: t.id, reconciled: 'missing_payment_id_kept_unknown' })
      continue
    }

    // CR-15: Resolve the expected linked account for this recipient so the
    // match can verify the provider transfer belongs to the correct account.
    const linked = await prisma.razorpayLinkedAccount.findFirst({
      where: { entity_type: t.recipient_type, entity_id: t.recipient_id },
      select: { razorpay_account_id: true },
    })

    try {
      // CR-11: Query payment-linked transfers for this specific payment.
      const transfers: any = await client.payments.fetchTransfer(t.razorpay_payment_id)
      const items: any[] = transfers.items ?? []

      // CR-15: A match requires amount, recipient account, order reference,
      // AND recipient type. Matching on order ID + amount alone is insufficient:
      // two different orders could share an amount, and the recipient account
      // is the authoritative destination.
      const match = items.find(
        (item: any) =>
          Number(item.amount) === t.amount_paise &&
          item.recipient === linked?.razorpay_account_id &&
          item.notes?.crave_order_id === t.order_id &&
          item.notes?.recipient_type === t.recipient_type
      )

      if (match) {
        // Provider confirms a matching transfer — record the outcome.
        // Map every Razorpay transfer status explicitly instead of treating
        // anything other than 'processed' as failed (a transfer may legitimately
        // be 'created' or 'pending', and 'reversed'/'partially_reversed' are not
        // simple failures).
        const providerStatus = String(match.status ?? '').toLowerCase()
        const statusMap: Record<string, string> = {
          created: 'pending',
          pending: 'pending',
          processed: 'processed',
          failed: 'failed',
          reversed: 'reversed',
          partially_reversed: 'reversed',
        }
        const resolvedStatus = statusMap[providerStatus] ?? 'unknown'
        await prisma.razorpayTransfer.update({
          where: { id: t.id },
          data: {
            razorpay_transfer_id: match.id,
            status: resolvedStatus,
            ...(resolvedStatus === 'processed' ? { processed_at: new Date() } : {}),
            failure_reason:
              resolvedStatus === 'failed' || resolvedStatus === 'reversed'
                ? String(match.failure_reason ?? `Provider reported ${providerStatus} during reconciliation`)
                : null,
            updated_at: new Date(),
          },
        })
        results.push({ transferId: t.id, reconciled: match.status, providerTransferId: match.id })
      } else {
        // CR-15: A missing result is NOT definitive evidence that a transfer
        // was never processed. The listing may be paginated (the provider
        // returns `count` alongside `items`) or the record may not yet be
        // present. Do NOT mark as failed — that would authorize a retry that
        // could double-pay. Keep the row in 'unknown' so the next run can try
        // again with a fresh listing.
        const totalCount = Number(transfers.count ?? items.length)
        await prisma.razorpayTransfer.update({
          where: { id: t.id },
          data: {
            status: 'unknown',
            failure_reason:
              `No matching transfer in provider listing (count=${totalCount}) for ` +
              `payment=${t.razorpay_payment_id} order=${t.order_id} ` +
              `recipient=${linked?.razorpay_account_id ?? 'unknown'} amount=${t.amount_paise}; ` +
              `remaining in reconciliation`,
            updated_at: new Date(),
          },
        })
        results.push({
          transferId: t.id,
          reconciled: 'not_found_kept_unknown',
          providerCount: totalCount,
        })
      }
    } catch (err: any) {
      // CR-15: A provider error during reconciliation is ambiguous. Keep the
      // row in 'unknown' rather than marking it failed — a failed mark would
      // authorize a retry that could double-pay.
      await prisma.razorpayTransfer.update({
        where: { id: t.id },
        data: {
          status: 'unknown',
          failure_reason: `Provider reconciliation error: ${err?.message ?? 'unknown error'}; remaining in reconciliation`,
          updated_at: new Date(),
        },
      })
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
