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
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword && process.env.NODE_ENV === 'production') {
    console.error(
      '❌ Error: ADMIN_PASSWORD environment variable must be explicitly provided in production environment.'
    )
    process.exit(1)
  }
  const effectivePassword = adminPassword || '1234567890'
  const adminName = process.env.ADMIN_NAME || 'System Administrator'

  console.log(`\n========================================`)
  console.log(` 🛡️  Crave Admin Credential Provisioner`)
  console.log(`========================================`)
  console.log(`Target Email:    ${adminEmail}`)
  console.log(`Role:            admin`)

  const passwordHash = crypto.scryptSync(effectivePassword, adminEmail, 64).toString('hex')
  const userId = `usr_admin_${crypto.randomUUID().slice(0, 8)}`

  try {
    const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } })
    let adminRecord: any = null

    if (existingAdmin) {
      adminRecord = await prisma.user.update({
        where: { email: adminEmail },
        data: {
          name: adminName,
          password_hash: passwordHash,
          role: 'admin',
        },
      })
      console.log(`\n✅ Existing administrator account credentials updated.`)
    } else {
      adminRecord = await prisma.user.create({
        data: {
          id: userId,
          name: adminName,
          email: adminEmail,
          role: 'admin',
          password_hash: passwordHash,
          locale: 'en',
        },
      })
      console.log(`\n✅ Administrator account created successfully.`)
    }

    await prisma.paymentConfig.upsert({
      where: { id: 'default_config' },
      update: { is_active: true },
      create: {
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

    console.log(`   User ID:  ${adminRecord.id}`)
    console.log(`   Email:    ${adminRecord.email}`)
    console.log(`   Password: ${effectivePassword}`)
    console.log(`   Role:     ${adminRecord.role}`)
  } catch (error: any) {
    console.error(`\n❌ Failed to provision admin credentials:`, error?.message || error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

createAdminCredentials()
