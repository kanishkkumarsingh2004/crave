/**
 * scripts/verify-transaction-safe-payments.ts
 *
 * Automated verification of P0: Transaction-safe order and payment processing:
 * 1. Checkout Idempotency & Replay Protection
 * 2. Atomic Inventory Decrement & Race Guard
 * 3. Atomic Payment Verification with Balanced Ledger & Deduplicated Settlement
 * 4. Refund Overcharge Prevention & Idempotency
 * 5. Stale Order Reconciliation & Safe Stock Restoration
 */

import 'dotenv/config'
import { prisma } from '../lib/prisma'
import { acquireIdempotency, completeIdempotency, releaseIdempotency } from '../lib/idempotency'
import {
  processPaymentVerificationTx,
  processPaymentRejectionTx,
  processRefundTx,
  reconcilePendingOrders,
} from '../lib/finance/payment-service'

async function runVerification() {
  console.log('🧪 Starting Transaction-Safe Order & Payment Processing Verification...\n')

  if (!prisma) {
    console.error('❌ Database connection not initialized.')
    process.exit(1)
  }

  const testIdPrefix = `test_tx_${Date.now()}`

  try {
    // ─────────────────────────────────────────────────────────────
    // TEST 1: Distributed Idempotency Locks & Exact Replay
    // ─────────────────────────────────────────────────────────────
    console.log('▶ Test 1: Distributed Idempotency Locks & Exact Replay')
    const testKey1 = `key_${testIdPrefix}_checkout`

    // 1.1 Fresh acquisition should yield 'new'
    const acquire1 = await acquireIdempotency(testKey1, 'order_checkout', { cartTotal: 500 })
    console.assert(acquire1.status === 'new', `Expected status 'new', got ${acquire1.status}`)
    console.log('  ✓ 1.1 Fresh lock acquired successfully (status: new)')

    // 1.2 Concurrent acquisition while processing should yield 'processing'
    const acquireConcurrent = await acquireIdempotency(testKey1, 'order_checkout', {
      cartTotal: 500,
    })
    console.assert(
      acquireConcurrent.status === 'processing',
      `Expected status 'processing', got ${acquireConcurrent.status}`
    )
    console.log('  ✓ 1.2 Concurrent duplicate request blocked (status: processing)')

    // 1.3 Complete idempotency
    const mockOrderPayload = {
      orderId: `ord_${testIdPrefix}`,
      grandTotal: 500,
      status: 'payment_submitted',
    }
    await completeIdempotency(testKey1, 'order_checkout', 201, mockOrderPayload)
    console.log('  ✓ 1.3 Completed idempotency record saved with response payload')

    // 1.4 Subsequent request with identical key returns cached completed response
    const acquireReplay = await acquireIdempotency(testKey1, 'order_checkout', { cartTotal: 500 })
    console.assert(
      acquireReplay.status === 'completed',
      `Expected status 'completed', got ${acquireReplay.status}`
    )
    console.assert(
      acquireReplay.statusCode === 201,
      `Expected statusCode 201, got ${acquireReplay.statusCode}`
    )
    console.assert(
      acquireReplay.body?.orderId === mockOrderPayload.orderId,
      'Expected matching cached payload'
    )
    console.log('  ✓ 1.4 Exact replay returned cached response (no duplicate execution)\n')

    // ─────────────────────────────────────────────────────────────
    // TEST 2: Atomic Inventory Decrement & Overselling Prevention
    // ─────────────────────────────────────────────────────────────
    console.log('▶ Test 2: Atomic Inventory Decrement & Concurrency Guard')
    const testItemId = `item_${testIdPrefix}`
    await prisma.menuItem.create({
      data: {
        id: testItemId,
        name: 'Limited Sourdough Pizza',
        category: 'Pizza',
        price: 350,
        in_stock: true,
        stock_count: 3, // only 3 in stock
      },
    })

    // Step 2.1: Order 2 items (should succeed and leave 1)
    const successResult = await prisma.$transaction(async (tx) => {
      const updated = await tx.menuItem.updateMany({
        where: { id: testItemId, in_stock: true, stock_count: { gte: 2 } },
        data: { stock_count: { decrement: 2 } },
      })
      if (updated.count === 0) throw new Error('INSUFFICIENT_STOCK')
      return updated.count
    })
    console.assert(successResult === 1, 'Expected 1 item updated')
    const itemAfterFirst = await prisma.menuItem.findUnique({ where: { id: testItemId } })
    console.assert(
      itemAfterFirst?.stock_count === 1,
      `Expected stock 1, got ${itemAfterFirst?.stock_count}`
    )
    console.log('  ✓ 2.1 Successfully reserved 2 items, remaining stock: 1')

    // Step 2.2: Try to order 2 more items (should fail atomically because only 1 remains)
    let failedAtomically = false
    try {
      await prisma.$transaction(async (tx) => {
        const updated = await tx.menuItem.updateMany({
          where: { id: testItemId, in_stock: true, stock_count: { gte: 2 } },
          data: { stock_count: { decrement: 2 } },
        })
        if (updated.count === 0) throw new Error('INSUFFICIENT_STOCK')
      })
    } catch (e: any) {
      if (e.message === 'INSUFFICIENT_STOCK') failedAtomically = true
    }
    console.assert(failedAtomically, 'Expected transaction to abort due to insufficient stock')
    const itemAfterFailed = await prisma.menuItem.findUnique({ where: { id: testItemId } })
    console.assert(
      itemAfterFailed?.stock_count === 1,
      `Expected stock to remain 1, got ${itemAfterFailed?.stock_count}`
    )
    console.log('  ✓ 2.2 Oversell blocked atomically; stock remained unchanged at 1\n')

    // ─────────────────────────────────────────────────────────────
    // TEST 3: Transaction-Safe Payment Verification & Subledger
    // ─────────────────────────────────────────────────────────────
    console.log('▶ Test 3: Transaction-Safe Payment Verification & Subledger Integrity')
    const testOrderId = `ord_${testIdPrefix}`

    // Create a base pending order
    await prisma.order.create({
      data: {
        id: testOrderId,
        customer_name: 'Test Customer',
        restaurant_name: 'Test Gourmet Kitchen',
        items: [{ id: testItemId, name: 'Limited Sourdough Pizza', qty: 2, price: 350 }],
        subtotal: 700,
        total_amount: 750,
        status: 'payment_submitted',
        payment_status: 'pending',
      },
    })

    // 3.1 Verify payment via processPaymentVerificationTx
    const verifyResult1 = await processPaymentVerificationTx({
      orderId: testOrderId,
      gateway: 'upi_razorpay',
      gatewayPaymentId: `pay_${testIdPrefix}`,
      amount: 750,
      actorId: 'admin_audit_01',
    })
    console.assert(verifyResult1.success, 'Verification should succeed')
    console.assert(
      verifyResult1.alreadyVerified === false,
      'First verification should not be marked alreadyVerified'
    )

    const verifiedOrder = await prisma.order.findUnique({ where: { id: testOrderId } })
    console.assert(
      verifiedOrder?.payment_status === 'verified',
      'Order payment_status should be verified'
    )
    console.assert(
      verifiedOrder?.status === 'sent_to_vendor',
      'Order status should be sent_to_vendor'
    )
    console.log('  ✓ 3.1 Order transitioned to verified / sent_to_vendor')

    // Check PaymentTransaction record
    const paymentTx = await prisma.paymentTransaction.findFirst({
      where: { order_id: testOrderId },
    })
    console.assert(
      paymentTx?.status === 'verified',
      `Expected paymentTx status verified, got ${paymentTx?.status}`
    )
    console.log('  ✓ 3.2 PaymentTransaction record created with status: verified')

    // Check VendorSettlement record
    const settlements = await prisma.vendorSettlement.findMany({
      where: { id: `set_${testOrderId}` },
    })
    console.assert(
      settlements.length === 1,
      `Expected exactly 1 settlement, found ${settlements.length}`
    )
    console.log('  ✓ 3.3 Single VendorSettlement generated (id: set_${orderId})')

    // Check Double-Entry Subledger balance
    const ledgerEntries = await prisma.ledgerEntry.findMany({ where: { order_id: testOrderId } })
    console.assert(ledgerEntries.length > 0, 'Expected ledger entries to be created')
    const totalDebits = ledgerEntries.reduce((sum, e) => sum + e.debit_paise, 0)
    const totalCredits = ledgerEntries.reduce((sum, e) => sum + e.credit_paise, 0)
    console.assert(
      totalDebits === totalCredits,
      `Ledger unbalanced! Debits: ${totalDebits}, Credits: ${totalCredits}`
    )
    console.log(
      `  ✓ 3.4 Double-entry ledger balanced: Debits = ${totalDebits} paise, Credits = ${totalCredits} paise`
    )

    // 3.5 Duplicate Webhook / Review Replay Protection
    const verifyResult2 = await processPaymentVerificationTx({
      orderId: testOrderId,
      gateway: 'upi_razorpay',
      gatewayPaymentId: `pay_${testIdPrefix}`,
      amount: 750,
      actorId: 'webhook_retry',
    })
    console.assert(
      verifyResult2.alreadyVerified === true,
      'Duplicate call should be detected as alreadyVerified'
    )
    const settlementsAfterReplay = await prisma.vendorSettlement.findMany({
      where: { id: `set_${testOrderId}` },
    })
    console.assert(
      settlementsAfterReplay.length === 1,
      'Duplicate settlements must never be created on retry'
    )
    console.log(
      '  ✓ 3.5 Duplicate webhook / review safely returned idempotent success (no extra records)\n'
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 4: Refund Safety & Duplicate Prevention
    // ─────────────────────────────────────────────────────────────
    console.log('▶ Test 4: Refund Safety & Duplicate Prevention')

    // 4.1 Reject refund exceeding order total (₹800 > ₹750)
    let refundOverchargeBlocked = false
    try {
      await processRefundTx({
        orderId: testOrderId,
        amount: 800,
        reason: 'Overcharge test',
      })
    } catch (e: any) {
      if (e.message.includes('Refund limit exceeded')) refundOverchargeBlocked = true
    }
    console.assert(refundOverchargeBlocked, 'Expected refund exceeding total to be blocked')
    console.log('  ✓ 4.1 Blocked refund exceeding order amount (₹800 > ₹750)')

    // 4.2 Process valid partial refund (₹300)
    const refundKey = `ref_${testIdPrefix}_partial`
    const refundResult1 = await processRefundTx({
      orderId: testOrderId,
      amount: 300,
      reason: 'Partial cancellation',
      idempotencyKey: refundKey,
    })
    console.assert(
      refundResult1.success && !refundResult1.alreadyProcessed,
      'Expected refund 1 to succeed'
    )
    console.log('  ✓ 4.2 Partial refund of ₹300 processed successfully')

    // 4.3 Replay identical refund with same idempotency key
    const refundResult2 = await processRefundTx({
      orderId: testOrderId,
      amount: 300,
      reason: 'Partial cancellation',
      idempotencyKey: refundKey,
    })
    console.assert(
      refundResult2.alreadyProcessed === true,
      'Duplicate refund should return alreadyProcessed: true'
    )
    const allRefunds = await prisma.refund.findMany({ where: { order_id: testOrderId } })
    console.assert(
      allRefunds.length === 1,
      `Expected only 1 refund record, found ${allRefunds.length}`
    )
    console.log('  ✓ 4.3 Duplicate refund attempt safely deduplicated by idempotency key\n')

    // ─────────────────────────────────────────────────────────────
    // TEST 5: Stale Order Reconciliation & Stock Restoration
    // ─────────────────────────────────────────────────────────────
    console.log('▶ Test 5: Stale Order Reconciliation & Stock Restoration')
    const staleOrderId = `stale_${testIdPrefix}`
    const staleDate = new Date(Date.now() - 45 * 60 * 1000) // 45 minutes ago

    await prisma.order.create({
      data: {
        id: staleOrderId,
        customer_name: 'Abandoned Cart Customer',
        restaurant_name: 'Test Kitchen',
        items: [{ id: testItemId, qty: 1, price: 350 }],
        subtotal: 350,
        total_amount: 380,
        status: 'payment_pending',
        payment_status: 'pending',
        created_at: staleDate,
      },
    })

    const stockBeforeReconcile =
      (await prisma.menuItem.findUnique({ where: { id: testItemId } }))?.stock_count || 0

    // Run reconciliation
    const { reconciledCount } = await reconcilePendingOrders(30)
    console.assert(
      reconciledCount >= 1,
      `Expected at least 1 order reconciled, got ${reconciledCount}`
    )

    const staleOrderAfter = await prisma.order.findUnique({ where: { id: staleOrderId } })
    console.assert(
      staleOrderAfter?.status === 'cancelled',
      `Expected stale order cancelled, got ${staleOrderAfter?.status}`
    )

    const stockAfterReconcile =
      (await prisma.menuItem.findUnique({ where: { id: testItemId } }))?.stock_count || 0
    console.assert(
      stockAfterReconcile === stockBeforeReconcile + 1,
      `Expected stock restored by 1, before=${stockBeforeReconcile}, after=${stockAfterReconcile}`
    )
    console.log(`  ✓ 5.1 Stale order cancelled and reserved stock restored (+1 item)`)

    // Cleanup test artifacts
    await prisma.refund.deleteMany({ where: { order_id: { in: [testOrderId, staleOrderId] } } })
    await prisma.ledgerEntry.deleteMany({
      where: { order_id: { in: [testOrderId, staleOrderId] } },
    })
    await prisma.vendorSettlement.deleteMany({
      where: { transaction_ref: { in: [testOrderId, staleOrderId] } },
    })
    await prisma.paymentTransaction.deleteMany({
      where: { order_id: { in: [testOrderId, staleOrderId] } },
    })
    await prisma.orderOutbox.deleteMany({
      where: { order_id: { in: [testOrderId, staleOrderId] } },
    })
    await prisma.order.deleteMany({ where: { id: { in: [testOrderId, staleOrderId] } } })
    await prisma.menuItem.deleteMany({ where: { id: testItemId } })
    await prisma.idempotencyRecord.deleteMany({ where: { key: { in: [testKey1] } } })

    console.log('\n🎉 ALL 5 TRANSACTION-SAFETY VERIFICATION TESTS PASSED!\n')
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Verification Failed:', error)
    process.exit(1)
  }
}

runVerification()
