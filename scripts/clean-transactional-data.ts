import 'dotenv/config'
import { prisma } from '../lib/prisma'

async function cleanTransactionalData() {
  if (!prisma) {
    console.error('❌ Database connection not initialized.')
    process.exit(1)
  }

  console.log('🧹 Cleaning transactional and test data from crave_db...')

  const results: Record<string, number> = {}

  await prisma.$transaction(async (tx) => {
    // 1. Transactional order dependencies
    results.order_outbox = (await tx.orderOutbox.deleteMany({})).count
    results.payment_reviews = (await tx.paymentReview.deleteMany({})).count
    results.refunds = (await tx.refund.deleteMany({})).count
    results.payment_transactions = (await tx.paymentTransaction.deleteMany({})).count
    results.vendor_settlements = (await tx.vendorSettlement.deleteMany({})).count
    results.ledger_entries = (await tx.ledgerEntry.deleteMany({})).count
    results.picker_metrics = (await tx.pickerMetric.deleteMany({})).count
    results.admin_override_logs = (await tx.adminOverrideLog.deleteMany({})).count

    // 2. Orders table
    results.orders = (await tx.order.deleteMany({})).count

    // 3. Runtime idempotency locks & driver history
    results.idempotency_records = (await tx.idempotencyRecord.deleteMany({})).count
    results.driver_location_history = (await tx.driverLocationHistory.deleteMany({})).count
    results.driver_payouts = (await tx.driverPayout.deleteMany({})).count
    results.driver_incentives = (await tx.driverIncentive.deleteMany({})).count
  })

  console.log('\n✅ Transactional Data Cleared:')
  console.table(
    Object.entries(results).map(([table, deleted]) => ({
      'Table Name': table,
      'Deleted Rows': deleted,
    }))
  )

  // Verify accounts & catalog preserved
  const userCount = await prisma.user.count()
  const restaurantCount = await prisma.restaurant.count()
  const menuItemCount = await prisma.menuItem.count()
  const cravexpProductCount = await prisma.craveXPProduct.count()
  const paymentConfigCount = await prisma.paymentConfig.count()

  console.log('\n🛡️ Preserved Core Entities:')
  console.table([
    { Entity: 'User Accounts', 'Remaining Count': userCount },
    { Entity: 'Restaurants / Dark Stores', 'Remaining Count': restaurantCount },
    { Entity: 'Menu Items', 'Remaining Count': menuItemCount },
    { Entity: 'CraveXP Products', 'Remaining Count': cravexpProductCount },
    { Entity: 'Payment Configs', 'Remaining Count': paymentConfigCount },
  ])

  await prisma.$disconnect()
  console.log('\n✨ Database successfully cleaned and reset for fresh operation!')
}

cleanTransactionalData().catch((err) => {
  console.error('❌ Clean-up failed:', err)
  process.exit(1)
})
