import 'dotenv/config'
import { prisma } from '../lib/prisma'
import { hashPassword } from '../lib/password'

async function scrubDbAndResetPasswords() {
  if (!prisma) {
    console.error('❌ Database connection not initialized.')
    process.exit(1)
  }

  console.log('🧹 1. Scrubbing transactional and order data from crave_db...')

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

    // 4. Webhook & Razorpay transfer records if any
    try {
      results.webhook_events = (await (tx as any).webhookEvent.deleteMany({})).count
    } catch {}
    try {
      results.razorpay_transfers = (await (tx as any).razorpayTransfer.deleteMany({})).count
    } catch {}
  })

  console.log('✅ Scrubbed transactional data:')
  console.table(
    Object.entries(results).map(([table, deleted]) => ({
      'Table Name': table,
      'Deleted Rows': deleted,
    }))
  )

  console.log('\n🔑 2. Updating passwords for all test accounts to 123456789...')

  const newPasswordHash = hashPassword('123456789')

  // Update existing users in the database
  const updatedUsers = await prisma.user.updateMany({
    data: {
      password_hash: newPasswordHash,
    },
  })

  console.log(`✓ Updated password_hash for ${updatedUsers.count} existing user account(s).`)

  // Ensure standard test accounts exist with password 123456789
  const standardTestAccounts = [
    {
      id: 'usr_admin_01',
      name: 'System Administrator',
      email: 'admin@crave.com',
      role: 'admin' as const,
      password_hash: newPasswordHash,
      phone: '+919876543210',
    },
    {
      id: 'usr_customer_01',
      name: 'Test Customer',
      email: 'user@crave.com',
      role: 'user' as const,
      password_hash: newPasswordHash,
      phone: '+919876543211',
    },
    {
      id: 'usr_vendor_01',
      name: 'Spice Kitchen Vendor',
      email: 'vendor@crave.com',
      role: 'restaurant_vendor' as const,
      password_hash: newPasswordHash,
      phone: '+919876543212',
      restaurant_name: 'Spice Garden',
      cuisine: 'North Indian',
    },
    {
      id: 'usr_rider_01',
      name: 'Test Delivery Rider',
      email: 'rider@crave.com',
      role: 'rider' as const,
      password_hash: newPasswordHash,
      phone: '+919876543213',
      vehicle_type: 'Electric Scooter',
      license_plate: 'KA-01-EQ-9988',
    },
    {
      id: 'usr_darkstore_01',
      name: 'Dark Store Operator',
      email: 'darkstore@crave.com',
      role: 'cravexp_store_vendor' as const,
      password_hash: newPasswordHash,
      phone: '+919876543214',
      restaurant_name: 'craveXP 10 Store Hub',
    },
  ]

  for (const acc of standardTestAccounts) {
    const existing = await prisma.user.findUnique({ where: { email: acc.email } })
    if (existing) {
      await prisma.user.update({
        where: { email: acc.email },
        data: {
          name: acc.name,
          role: acc.role,
          password_hash: newPasswordHash,
        },
      })
    } else {
      await prisma.user.create({
        data: acc,
      })
    }
    console.log(`  ✓ Test account ready: ${acc.email} (${acc.role}) -> password: 123456789`)
  }

  // Summary counts
  const userCount = await prisma.user.count()
  const restaurantCount = await prisma.restaurant.count()
  const menuItemCount = await prisma.menuItem.count()
  const ordersCount = await prisma.order.count()

  console.log('\n📊 Database State Summary:')
  console.table([
    { Entity: 'Active Users', Count: userCount },
    { Entity: 'Restaurants', Count: restaurantCount },
    { Entity: 'Menu Items', Count: menuItemCount },
    { Entity: 'Orders (Scrubbed)', Count: ordersCount },
  ])

  await prisma.$disconnect()
  console.log('\n🎉 DB scrub and password reset complete!')
}

scrubDbAndResetPasswords().catch((err) => {
  console.error('❌ Failed:', err)
  process.exit(1)
})
