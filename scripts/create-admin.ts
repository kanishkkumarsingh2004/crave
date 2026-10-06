import 'dotenv/config'
import { prisma } from '../lib/prisma'
import crypto from 'crypto'

async function createAdminCredentials() {
  if (!prisma) {
    console.error(
      '❌ PostgreSQL connection error: Check DATABASE_URL in .env file and ensure database is running.'
    )
    process.exit(1)
  }

  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@crave.com').trim().toLowerCase()
  const adminPassword = process.env.ADMIN_PASSWORD || '1234567890'
  const adminName = process.env.ADMIN_NAME || 'System Administrator'

  console.log(`\n========================================`)
  console.log(` 🛡️  Crave Admin Credential Provisioner`)
  console.log(`========================================`)
  console.log(`Target Email:    ${adminEmail}`)
  console.log(`Role:            admin`)

  const passwordHash = crypto.scryptSync(adminPassword, adminEmail, 64).toString('hex')
  const userId = `usr_admin_${crypto.randomUUID().slice(0, 8)}`

  try {
    console.log(`\n🧹 Clearing all existing database data (users, restaurants, orders, etc)...`)
    await prisma.paymentReview.deleteMany()
    await prisma.vendorSettlement.deleteMany()
    await prisma.driverPayout.deleteMany()
    await prisma.driverUpiAccount.deleteMany()
    await prisma.driverIncentive.deleteMany()
    await prisma.customerAddress.deleteMany()
    await prisma.coldChainSensor.deleteMany()
    await prisma.pickerMetric.deleteMany()
    await prisma.coupon.deleteMany()
    await prisma.menuItem.deleteMany()
    await prisma.order.deleteMany()
    await prisma.restaurant.deleteMany()
    await prisma.paymentConfig.deleteMany()
    await prisma.user.deleteMany()
    console.log(`✅ Database wiped clean successfully!`)

    const created = await prisma.user.create({
      data: {
        id: userId,
        name: adminName,
        email: adminEmail,
        role: 'admin',
        password_hash: passwordHash,
        locale: 'en',
      },
    })

    await prisma.paymentConfig.create({
      data: {
        id: 'default_config',
        name: 'Default Active Config',
        merchant_vpa: 'crave@upi',
        merchant_name: 'crave Food Delivery Services',
        merchant_category_code: '5812',
        is_active: true,
        delivery_fee: 30,
        handling_fee: 5,
        free_delivery_threshold: 500,
        updated_at: new Date(),
      },
    })

    console.log(`\n✅ Admin account created successfully!`)
    console.log(`   User ID:  ${created.id}`)
    console.log(`   Email:    ${created.email}`)
    console.log(`   Password: ${adminPassword}`)
    console.log(`   Role:     ${created.role}`)
    console.log(`\n🔒 Database now contains ONLY the Admin account and active payment configuration.`)
  } catch (error: any) {
    console.error(`\n❌ Failed to provision admin credentials:`, error?.message || error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

createAdminCredentials()
