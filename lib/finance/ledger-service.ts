/**
 * lib/finance/ledger-service.ts
 *
 * Double-Entry Financial Subledger for CRAVE — Phase 2 of Billing Engine 2.0
 *
 * Principles (docs/payment_audit.md §14):
 *  - Every financial state change creates balanced debit/credit journal entries.
 *  - sum(debits) === sum(credits) within every journal transaction.
 *  - All amounts in integer PAISE.
 *  - Entries are immutable; corrections use explicit reversal entries.
 *  - Idempotency: each event has a unique idempotency key; replay is safe.
 *
 * Chart of Accounts:
 *   PAYMENT_CLEARING          — customer payment received but not yet settled
 *   CUSTOMER_REFUND_PAYABLE   — liability for pending refunds
 *   VENDOR_PAYABLE            — amounts owed to restaurants
 *   RIDER_PAYABLE             — amounts owed to riders
 *   RIDER_TIP_CLEARING        — tip in transit (must pass through 100%)
 *   PLATFORM_COMMISSION_REV   — platform commission revenue
 *   PLATFORM_FEE_REV          — platform convenience + handling fee revenue
 *   GST_OUTPUT_PAYABLE        — GST collected, payable to government
 *   DISCOUNT_EXPENSE          — platform-funded discount cost
 *   DELIVERY_REVENUE          — net delivery revenue retained by platform
 */

import { prisma } from '../prisma'
import type { CanonicalPriceResult } from './pricing-engine'

// ─── Account Codes (Chart of Accounts) ────────────────────────────────────────

export type AccountCode =
  | 'PAYMENT_CLEARING'
  | 'CUSTOMER_REFUND_PAYABLE'
  | 'VENDOR_PAYABLE'
  | 'RIDER_PAYABLE'
  | 'RIDER_TIP_CLEARING'
  | 'PLATFORM_COMMISSION_REV'
  | 'PLATFORM_FEE_REV'
  | 'GST_OUTPUT_PAYABLE'
  | 'DISCOUNT_EXPENSE'
  | 'DELIVERY_REVENUE'
  | 'BANK_SETTLEMENT'

// Normal balance: DEBIT increases asset/expense; CREDIT increases liability/revenue
export type NormalBalance = 'DEBIT' | 'CREDIT'
export type AccountType = 'ASSET' | 'LIABILITY' | 'REVENUE' | 'EXPENSE' | 'EQUITY'

export const CHART_OF_ACCOUNTS: Record<
  AccountCode,
  { type: AccountType; normalBalance: NormalBalance; description: string }
> = {
  PAYMENT_CLEARING: {
    type: 'ASSET',
    normalBalance: 'DEBIT',
    description: 'Customer payment received, pending settlement',
  },
  CUSTOMER_REFUND_PAYABLE: {
    type: 'LIABILITY',
    normalBalance: 'CREDIT',
    description: 'Refunds approved but not yet disbursed',
  },
  VENDOR_PAYABLE: {
    type: 'LIABILITY',
    normalBalance: 'CREDIT',
    description: 'Amounts owed to restaurant partners',
  },
  RIDER_PAYABLE: {
    type: 'LIABILITY',
    normalBalance: 'CREDIT',
    description: 'Amounts owed to delivery riders',
  },
  RIDER_TIP_CLEARING: {
    type: 'LIABILITY',
    normalBalance: 'CREDIT',
    description: 'Customer tip in transit to rider (100% pass-through)',
  },
  PLATFORM_COMMISSION_REV: {
    type: 'REVENUE',
    normalBalance: 'CREDIT',
    description: 'Commission earned from restaurants',
  },
  PLATFORM_FEE_REV: {
    type: 'REVENUE',
    normalBalance: 'CREDIT',
    description: 'Platform convenience and handling fee revenue',
  },
  GST_OUTPUT_PAYABLE: {
    type: 'LIABILITY',
    normalBalance: 'CREDIT',
    description: 'GST collected from customers, payable to government',
  },
  DISCOUNT_EXPENSE: {
    type: 'EXPENSE',
    normalBalance: 'DEBIT',
    description: 'Platform-funded discount cost',
  },
  DELIVERY_REVENUE: {
    type: 'REVENUE',
    normalBalance: 'CREDIT',
    description: 'Net delivery revenue retained after rider share',
  },
  BANK_SETTLEMENT: {
    type: 'ASSET',
    normalBalance: 'DEBIT',
    description: 'Confirmed bank settlement / payout completion',
  },
}

// ─── Journal Entry Types ───────────────────────────────────────────────────────

export type JournalEventType =
  | 'ORDER_CONFIRMED' // Customer payment captured — initial ledger posting
  | 'VENDOR_SETTLEMENT' // Restaurant payout processed
  | 'RIDER_SETTLEMENT' // Rider payout processed
  | 'REFUND_INITIATED' // Refund approved
  | 'REFUND_COMPLETED' // Refund confirmed by bank
  | 'REVERSAL' // Correction/reversal of a prior entry

export interface JournalLine {
  accountCode: AccountCode
  debitPaise: number // 0 if credit entry
  creditPaise: number // 0 if debit entry
  description: string
}

export interface JournalTransaction {
  idempotencyKey: string
  eventType: JournalEventType
  orderId: string
  referenceId?: string // e.g. settlement ID, payout ID, UTR
  lines: JournalLine[]
  notes?: string
}

// ─── Validation ────────────────────────────────────────────────────────────────

/**
 * Validates that a journal transaction balances: sum(debits) === sum(credits).
 * Throws if unbalanced — this is a hard programming error, not a runtime exception.
 */
export function validateJournalBalance(transaction: JournalTransaction): void {
  const totalDebit = transaction.lines.reduce((s, l) => s + l.debitPaise, 0)
  const totalCredit = transaction.lines.reduce((s, l) => s + l.creditPaise, 0)

  if (totalDebit !== totalCredit) {
    throw new Error(
      `Unbalanced journal transaction [${transaction.idempotencyKey}]: ` +
        `debit=${totalDebit} paise, credit=${totalCredit} paise. ` +
        `Difference=${totalDebit - totalCredit} paise. This is a programming error.`
    )
  }

  for (const line of transaction.lines) {
    if (line.debitPaise < 0 || line.creditPaise < 0) {
      throw new Error(`Journal line has negative amount in [${transaction.idempotencyKey}]`)
    }
    if (line.debitPaise > 0 && line.creditPaise > 0) {
      throw new Error(
        `Journal line cannot have both debit and credit in [${transaction.idempotencyKey}]`
      )
    }
  }
}

// ─── Transaction Builders ──────────────────────────────────────────────────────

/**
 * Build the ORDER_CONFIRMED journal transaction from a canonical price result.
 *
 * Double-entry logic:
 *   Dr PAYMENT_CLEARING          = customerPayable
 *   Cr VENDOR_PAYABLE            = vendorPayableNet
 *   Cr RIDER_PAYABLE             = riderPayable - riderTip
 *   Cr RIDER_TIP_CLEARING        = riderTip (100% tip pass-through)
 *   Cr PLATFORM_COMMISSION_REV   = grossCommission
 *   Cr PLATFORM_FEE_REV          = platformFee + handlingFee + deliveryRevenue
 *   Cr GST_OUTPUT_PAYABLE        = totalGstCollected
 *   Dr DISCOUNT_EXPENSE          = platformFundedDiscount (contra-revenue)
 *   Cr PAYMENT_CLEARING          = platformFundedDiscount (offsets clearing)
 */
export function buildOrderConfirmedJournal(
  orderId: string,
  snapshot: CanonicalPriceResult,
  idempotencyKey?: string
): JournalTransaction {
  const key = idempotencyKey || `order_confirmed_${orderId}`

  const totalGstPaise =
    snapshot.restaurantServiceTaxBreakdown.totalGstPaise +
    snapshot.platformServiceTaxBreakdown.totalGstPaise

  // Delivery revenue retained by platform (after rider share)
  const riderDeliverySharePaise =
    snapshot.riderBasePayPaise +
    snapshot.riderDistancePayPaise +
    snapshot.riderSurgeIncentivePaise +
    snapshot.riderRainIncentivePaise +
    snapshot.riderNightIncentivePaise

  const platformDeliveryRevenuePaise = Math.max(
    0,
    snapshot.grossDeliveryFeePaise - riderDeliverySharePaise
  )

  const riderPayableExTipPaise = snapshot.riderPayablePaise - snapshot.riderTipPaise

  const lines: JournalLine[] = [
    // Assets / debits
    {
      accountCode: 'PAYMENT_CLEARING',
      debitPaise: snapshot.customerPayablePaise,
      creditPaise: 0,
      description: `Customer payment received for order ${orderId}`,
    },

    // Liabilities / credits — vendor
    {
      accountCode: 'VENDOR_PAYABLE',
      debitPaise: 0,
      creditPaise: snapshot.vendorPayableNetPaise,
      description: `Restaurant payable for order ${orderId} (${snapshot.restaurantName})`,
    },

    // Liabilities / credits — rider (excluding tip)
    ...(riderPayableExTipPaise > 0
      ? [
          {
            accountCode: 'RIDER_PAYABLE' as AccountCode,
            debitPaise: 0,
            creditPaise: riderPayableExTipPaise,
            description: `Rider delivery compensation for order ${orderId}`,
          },
        ]
      : []),

    // Liabilities / credits — tip clearing (100% pass-through)
    ...(snapshot.riderTipPaise > 0
      ? [
          {
            accountCode: 'RIDER_TIP_CLEARING' as AccountCode,
            debitPaise: 0,
            creditPaise: snapshot.riderTipPaise,
            description: `Customer tip in transit to rider for order ${orderId}`,
          },
        ]
      : []),

    // Revenue — commission
    ...(snapshot.grossCommissionPaise > 0
      ? [
          {
            accountCode: 'PLATFORM_COMMISSION_REV' as AccountCode,
            debitPaise: 0,
            creditPaise: snapshot.grossCommissionPaise,
            description: `Platform commission (${snapshot.commissionRatePercent}%) on order ${orderId}`,
          },
        ]
      : []),

    // Revenue — platform fees
    {
      accountCode: 'PLATFORM_FEE_REV',
      debitPaise: 0,
      creditPaise:
        snapshot.platformFeePaise + snapshot.handlingFeePaise + platformDeliveryRevenuePaise,
      description: `Platform fee + handling + delivery revenue for order ${orderId}`,
    },

    // Liability — GST collected
    ...(totalGstPaise > 0
      ? [
          {
            accountCode: 'GST_OUTPUT_PAYABLE' as AccountCode,
            debitPaise: 0,
            creditPaise: totalGstPaise,
            description: `GST collected for order ${orderId}`,
          },
        ]
      : []),

    // Expense — platform-funded discount (debit)
    ...(snapshot.platformFundedDiscountPaise > 0
      ? [
          {
            accountCode: 'DISCOUNT_EXPENSE' as AccountCode,
            debitPaise: snapshot.platformFundedDiscountPaise,
            creditPaise: 0,
            description: `Platform-funded discount for order ${orderId}`,
          },
          {
            // offset against payment clearing (reduces what we actually received)
            accountCode: 'PAYMENT_CLEARING' as AccountCode,
            debitPaise: 0,
            creditPaise: snapshot.platformFundedDiscountPaise,
            description: `Discount offset on payment clearing for order ${orderId}`,
          },
        ]
      : []),
  ]

  const transaction: JournalTransaction = {
    idempotencyKey: key,
    eventType: 'ORDER_CONFIRMED',
    orderId,
    lines,
    notes: `Snapshot ${snapshot.snapshotId}, engine v${snapshot.engineVersion}`,
  }

  validateJournalBalance(transaction)
  return transaction
}

/**
 * Build the VENDOR_SETTLEMENT journal transaction.
 * Dr VENDOR_PAYABLE  = settlementAmount
 * Cr BANK_SETTLEMENT = settlementAmount
 */
export function buildVendorSettlementJournal(
  orderId: string,
  restaurantId: string,
  settlementId: string,
  amountPaise: number
): JournalTransaction {
  const transaction: JournalTransaction = {
    idempotencyKey: `vendor_settlement_${settlementId}`,
    eventType: 'VENDOR_SETTLEMENT',
    orderId,
    referenceId: settlementId,
    lines: [
      {
        accountCode: 'VENDOR_PAYABLE',
        debitPaise: amountPaise,
        creditPaise: 0,
        description: `Restaurant ${restaurantId} settlement ${settlementId}`,
      },
      {
        accountCode: 'BANK_SETTLEMENT',
        debitPaise: 0,
        creditPaise: amountPaise,
        description: `Bank transfer for restaurant ${restaurantId}`,
      },
    ],
  }
  validateJournalBalance(transaction)
  return transaction
}

/**
 * Build the RIDER_SETTLEMENT journal transaction (payout + tip).
 * Dr RIDER_PAYABLE       = deliveryEarnings
 * Dr RIDER_TIP_CLEARING  = tipAmount
 * Cr BANK_SETTLEMENT     = totalAmount
 */
export function buildRiderSettlementJournal(
  orderId: string,
  riderId: string,
  payoutId: string,
  deliveryEarningsPaise: number,
  tipPaise: number
): JournalTransaction {
  const totalPaise = deliveryEarningsPaise + tipPaise
  const lines: JournalLine[] = [
    {
      accountCode: 'RIDER_PAYABLE',
      debitPaise: deliveryEarningsPaise,
      creditPaise: 0,
      description: `Rider ${riderId} delivery earnings`,
    },
    ...(tipPaise > 0
      ? [
          {
            accountCode: 'RIDER_TIP_CLEARING' as AccountCode,
            debitPaise: tipPaise,
            creditPaise: 0,
            description: `Rider ${riderId} tip`,
          },
        ]
      : []),
    {
      accountCode: 'BANK_SETTLEMENT',
      debitPaise: 0,
      creditPaise: totalPaise,
      description: `Bank payout to rider ${riderId}`,
    },
  ]
  const transaction: JournalTransaction = {
    idempotencyKey: `rider_payout_${payoutId}`,
    eventType: 'RIDER_SETTLEMENT',
    orderId,
    referenceId: payoutId,
    lines,
  }
  validateJournalBalance(transaction)
  return transaction
}

/**
 * Build the REFUND_INITIATED journal transaction.
 * Dr CUSTOMER_REFUND_PAYABLE  = refundAmount
 * Cr PAYMENT_CLEARING         = refundAmount
 */
export function buildRefundInitiatedJournal(
  orderId: string,
  refundId: string,
  refundAmountPaise: number
): JournalTransaction {
  const transaction: JournalTransaction = {
    idempotencyKey: `refund_initiated_${refundId}`,
    eventType: 'REFUND_INITIATED',
    orderId,
    referenceId: refundId,
    lines: [
      {
        accountCode: 'CUSTOMER_REFUND_PAYABLE',
        debitPaise: refundAmountPaise,
        creditPaise: 0,
        description: `Refund approved for order ${orderId}`,
      },
      {
        accountCode: 'PAYMENT_CLEARING',
        debitPaise: 0,
        creditPaise: refundAmountPaise,
        description: `Refund reserve on clearing for order ${orderId}`,
      },
    ],
  }
  validateJournalBalance(transaction)
  return transaction
}

// ─── Persistence (requires LedgerEntry model in Prisma schema) ─────────────────

/**
 * Persist a journal transaction atomically in the database.
 * Uses Prisma transaction to ensure all lines are written or none.
 * If the idempotency key already exists, returns without error (idempotent replay).
 *
 * NOTE: Requires `LedgerEntry` model to exist in prisma/schema.prisma.
 * If schema has not yet been migrated, this will throw a Prisma error.
 * During migration period, catch and log the error rather than blocking the order.
 */
export async function persistJournalTransaction(transaction: JournalTransaction): Promise<void> {
  // Check if already persisted (idempotency)
  try {
    const existingCount = await (prisma as any).ledgerEntry.count({
      where: {
        OR: [
          { idempotency_key: transaction.idempotencyKey },
          { idempotency_key: { startsWith: `${transaction.idempotencyKey}_line_` } },
        ],
      },
    })

    if (existingCount > 0) {
      console.log(
        `[Ledger] Idempotent replay — skipping already-persisted transaction: ${transaction.idempotencyKey}`
      )
      return
    }

    // Persist all lines atomically
    await prisma.$transaction(
      transaction.lines.map((line, index) =>
        (prisma as any).ledgerEntry.create({
          data: {
            idempotency_key: `${transaction.idempotencyKey}_line_${index}`,
            event_type: transaction.eventType,
            order_id: transaction.orderId,
            reference_id: transaction.referenceId || null,
            account_code: line.accountCode,
            debit_paise: line.debitPaise,
            credit_paise: line.creditPaise,
            description: line.description,
            notes: transaction.notes || null,
          },
        })
      )
    )

    console.log(
      `[Ledger] Posted ${transaction.lines.length}-line journal: ${transaction.idempotencyKey}`
    )
  } catch (err: any) {
    if (err?.code === 'P2002' || err?.message?.includes('Unique constraint')) {
      console.log(
        `[Ledger] Idempotent replay detected via DB constraint — skipping duplicate: ${transaction.idempotencyKey}`
      )
      return
    }
    // During schema migration period: LedgerEntry table may not exist yet
    // Log prominently but do not block the business flow
    console.error(
      `[Ledger] WARNING: Could not persist ledger entry ${transaction.idempotencyKey}. ` +
        `Run Prisma migration to add LedgerEntry model. Error: ${(err as Error).message}`
    )
  }
}
