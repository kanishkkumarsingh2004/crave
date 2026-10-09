import 'dotenv/config'
import { prisma } from '../lib/prisma'
import crypto from 'crypto'

function hashPassword(password: string, email: string): string {
  return crypto.scryptSync(password, email.trim().toLowerCase(), 64).toString('hex')
}

export async function seedSingleIdPerRole() {
  if (!prisma) {
    console.error('❌ Database connection not initialized.')
    process.exit(1)
  }

  const defaultPassword = process.env.ADMIN_PASSWORD || '1234567890'

  const accounts = [
    {
      id: 'usr_admin_01',
      name: 'System Administrator',
      email: 'admin@crave.com',
      role: 'admin' as const,
      password: defaultPassword,
    },
    {
      id: 'usr_customer_01',
      name: 'Crave Customer',
      email: 'user@crave.com',
      role: 'user' as const,
      phone: '+919876543210',
      address: 'Indiranagar 100ft Rd, Bengaluru',
      password: defaultPassword,
    },
    {
      id: 'usr_vendor_01',
      name: 'Chef Marco',
      email: 'vendor@crave.com',
      role: 'restaurant_vendor' as const,
      restaurant_name: 'Spice Garden',
      cuisine: 'North Indian & Fast Food',
      password: defaultPassword,
    },
    {
      id: 'usr_darkstore_01',
      name: 'Dark Store Operator',
      email: 'darkstore@crave.com',
      role: 'cravexp_store_vendor' as const,
      restaurant_name: 'CraveXP 10-Min Dark Store',
      cuisine: 'Instant Groceries & Snacks',
      password: defaultPassword,
    },
    {
      id: 'usr_rider_01',
      name: 'Rider Rahul',
      email: 'rider@crave.com',
      role: 'rider' as const,
      vehicle_type: 'Electric Scooter',
      license_plate: 'KA-01-CR-2026',
      phone: '+919988776655',
      password: defaultPassword,
    },
  ]

  console.log('🌱 Seeding 1 ID per user role into local database...')

  for (const acc of accounts) {
    const password_hash = hashPassword(acc.password, acc.email)
    const existing = await prisma.user.findUnique({ where: { email: acc.email } })

    if (existing) {
      await prisma.user.update({
        where: { email: acc.email },
        data: {
          name: acc.name,
          role: acc.role,
          password_hash,
          phone: acc.phone || null,
          address: acc.address || null,
          restaurant_name: acc.restaurant_name || null,
          cuisine: acc.cuisine || null,
          vehicle_type: acc.vehicle_type || null,
          license_plate: acc.license_plate || null,
        },
      })
      console.log(`  ✓ Updated role [${acc.role}]: ID = ${existing.id} (${acc.email})`)
    } else {
      const created = await prisma.user.create({
        data: {
          id: acc.id,
          name: acc.name,
          email: acc.email,
          role: acc.role,
          password_hash,
          phone: acc.phone || null,
          address: acc.address || null,
          restaurant_name: acc.restaurant_name || null,
          cuisine: acc.cuisine || null,
          vehicle_type: acc.vehicle_type || null,
          license_plate: acc.license_plate || null,
          locale: 'en',
        },
      })
      console.log(`  ✓ Created role [${acc.role}]: ID = ${created.id} (${acc.email})`)
    }
  }

  // Provision 1 Food Restaurant linked to usr_vendor_01
  await prisma.restaurant.upsert({
    where: { id: 'rest_01' },
    update: { owner_id: 'usr_vendor_01', is_open: true },
    create: {
      id: 'rest_01',
      name: 'Spice Garden',
      cuisine: 'North Indian & Mughlai',
      rating: 4.8,
      owner_id: 'usr_vendor_01',
      is_dark_store: false,
      is_open: true,
      address: '100ft Road, Indiranagar, Bengaluru',
      commission_rate: 15.0,
      delivery_minutes: 25,
      cost_for_two: 400,
    },
  })
  console.log(`  ✓ Seeded Restaurant: ID = rest_01 (Spice Garden)`)

  // Provision 1 Dark Store linked to usr_darkstore_01
  await prisma.restaurant.upsert({
    where: { id: 'darkstore_01' },
    update: { owner_id: 'usr_darkstore_01', is_open: true },
    create: {
      id: 'darkstore_01',
      name: 'CraveXP 10-Min Dark Store',
      cuisine: 'Instant Groceries & Daily Needs',
      rating: 4.9,
      owner_id: 'usr_darkstore_01',
      is_dark_store: true,
      is_open: true,
      address: 'Koramangala 5th Block, Bengaluru',
      commission_rate: 10.0,
      delivery_minutes: 10,
      cost_for_two: 200,
    },
  })
  console.log(`  ✓ Seeded Dark Store: ID = darkstore_01 (CraveXP 10-Min Dark Store)`)

  // Provision Default Active PaymentConfig
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
  console.log(`  ✓ Seeded Payment Config: ID = default_config`)
  console.log('✅ Local Seeding Complete: Exactly 1 ID per role provisioned!\n')
}

if (require.main === module) {
  seedSingleIdPerRole()
    .catch((err) => {
      console.error('❌ Seeding failed:', err)
      process.exit(1)
    })
    .finally(async () => {
      await prisma?.$disconnect()
    })
}
