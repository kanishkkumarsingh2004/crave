import 'dotenv/config'
import { prisma } from '../lib/prisma'
import { hashPassword } from '../lib/password'

async function seedCompleteData() {
  if (!prisma) {
    console.error('❌ Database client not initialized. Ensure DATABASE_URL is configured.')
    process.exit(1)
  }

  console.log('========================================================')
  console.log('🌱 CRAVE Complete Test Database Seeder')
  console.log('========================================================\n')

  // Hardcoded test credentials for example/test purposes only
  const seedPassword = 'TestPass123!'
  const seedEmails = {
    admin: 'admin@crave.com',
    customer: 'user@crave.com',
    vendor: 'vendor@crave.com',
    store: 'darkstore@crave.com',
    rider: 'rider@crave.com',
  }

  // 1. Seed Core Users Across All 5 Roles
  console.log('👥 Seeding Users for All 5 Roles...')
  const users = [
    {
      id: 'usr_admin_01',
      name: 'System Administrator',
      email: seedEmails.admin,
      role: 'admin' as const,
      password_hash: hashPassword(seedPassword),
      phone: '+919876543210',
    },
    {
      id: 'usr_customer_01',
      name: 'Priya Sharma (Customer)',
      email: seedEmails.customer,
      role: 'user' as const,
      password_hash: hashPassword(seedPassword),
      phone: '+919876543211',
    },
    {
      id: 'usr_vendor_01',
      name: 'Chef Marco (Kitchen Vendor)',
      email: seedEmails.vendor,
      role: 'restaurant_vendor' as const,
      password_hash: hashPassword(seedPassword),
      restaurant_name: 'Spice Garden',
      cuisine: 'North Indian & Mughlai',
      phone: '+919876543212',
    },
    {
      id: 'usr_darkstore_01',
      name: 'Dark Store Operator',
      email: seedEmails.store,
      role: 'cravexp_store_vendor' as const,
      password_hash: hashPassword(seedPassword),
      restaurant_name: 'craveXP 10 Store Hub',
      cuisine: 'Instant Groceries & Daily Needs',
      phone: '+919876543213',
    },
    {
      id: 'usr_rider_01',
      name: 'Rider Rahul (Fleet Driver)',
      email: seedEmails.rider,
      role: 'rider' as const,
      password_hash: hashPassword(seedPassword),
      vehicle_type: 'Electric Scooter',
      license_plate: 'KA-01-EQ-9988',
      phone: '+919876543214',
    },
  ]

  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {
        name: u.name,
        email: u.email,
        role: u.role,
        password_hash: u.password_hash,
        phone: u.phone,
      },
      create: u,
    })
    console.log(`  ✓ User: ${u.email} (${u.role})`)
  }

  // 2. Seed Customer Delivery Addresses
  console.log('\n📍 Seeding Customer Delivery Addresses...')
  const addresses = [
    {
      id: 'addr_home_01',
      customer_id: 'usr_customer_01',
      label: 'Home',
      address:
        '124, 4th Cross, Koramangala 4th Block, Near Wipro Park, Bengaluru, Karnataka 560034',
      latitude: 12.9352,
      longitude: 77.6245,
      is_default: true,
    },
    {
      id: 'addr_work_01',
      customer_id: 'usr_customer_01',
      label: 'Work',
      address: 'Indiranagar Tech Hub, 100ft Road, Floor 3, Bengaluru, Karnataka 560038',
      latitude: 12.9784,
      longitude: 77.6408,
      is_default: false,
    },
  ]

  for (const addr of addresses) {
    await prisma.customerAddress.upsert({
      where: { id: addr.id },
      update: addr,
      create: addr,
    })
    console.log(`  ✓ Address: ${addr.label} (${addr.address})`)
  }

  // 3. Seed CraveXP Dark Store (Vendor-registered kitchens are registered dynamically)
  console.log('\n🏪 Seeding craveXP Dark Store Hub...')
  const darkStore = {
    id: 'cravexp_dark_store_01',
    name: 'craveXP 10 Store Hub',
    cuisine: 'craveXP Instamart 10-Min Store',
    address: 'Kanakapura Road Central Warehouse, Bengaluru',
    rating: 4.9,
    rating_count: 5200,
    delivery_minutes: 10,
    cost_for_two: 200,
    is_open: true,
    is_pure_veg: false,
    is_dark_store: true,
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500',
    latitude: 12.68,
    longitude: 77.47,
    owner_id: 'usr_darkstore_01',
    commission_rate: 10.0,
    fssai_license: '22334455667788',
    gstin: '29FGHIJ5678K1Z9',
  }

  await prisma.restaurant.upsert({
    where: { id: darkStore.id },
    update: darkStore,
    create: darkStore,
  })
  console.log(`  ✓ Dark Store: ${darkStore.name} (${darkStore.cuisine})`)

  // 4. Note on Kitchens: Food partner kitchens are registered live by vendors via /vendor/dashboard
  console.log('\n🍽️ Partner Kitchens: Dynamic vendor registration active (no mock restaurants seeded)')

  // 5. Seed Coupons
  console.log('\n🎟️ Seeding Promo Codes & Coupons...')
  const coupons = [
    {
      id: 'cpn_50',
      code: 'CRAVE50',
      description: '50% OFF up to ₹100 on orders above ₹199',
      discount_type: 'percentage' as const,
      discount_value: 50,
      max_discount: 100,
      min_order_amount: 199,
      is_active: true,
    },
    {
      id: 'cpn_100',
      code: 'WELCOME100',
      description: 'Flat ₹100 OFF on your first gourmet order above ₹299',
      discount_type: 'flat' as const,
      discount_value: 100,
      max_discount: 100,
      min_order_amount: 299,
      is_active: true,
    },
  ]

  for (const c of coupons) {
    await prisma.coupon.upsert({
      where: { code: c.code },
      update: c,
      create: c,
    })
    console.log(`  ✓ Coupon: ${c.code} (${c.description})`)
  }

  // 6. Seed Payment Configuration
  console.log('\n💳 Seeding Platform Commercial & UPI Config...')
  await prisma.paymentConfig.upsert({
    where: { id: 'default_config' },
    update: {
      name: 'Default Platform Config',
      merchant_vpa: 'crave@upi',
      merchant_name: 'crave. Hyperlocal Delivery',
      delivery_fee: 30,
      per_km_rate: 10,
      platform_fee: 5,
      packaging_cap: 25,
      vendor_commission: 15,
      driver_payout_share: 70,
      is_active: true,
      razorpay_enabled: true,
      razorpay_route_enabled: true,
      razorpay_transfer_release: 'DELIVERY_COMPLETE',
    },
    create: {
      id: 'default_config',
      name: 'Default Platform Config',
      merchant_vpa: 'crave@upi',
      merchant_name: 'crave. Hyperlocal Delivery',
      delivery_fee: 30,
      per_km_rate: 10,
      platform_fee: 5,
      packaging_cap: 25,
      vendor_commission: 15,
      driver_payout_share: 70,
      is_active: true,
      razorpay_enabled: true,
      razorpay_route_enabled: true,
      razorpay_transfer_release: 'DELIVERY_COMPLETE',
    },
  })
  console.log('  ✓ Payment Config: crave@upi with Razorpay enabled + Route split')

  // 7. Seed Razorpay Linked Accounts (Driver linked accounts)
  console.log('\n🏦 Seeding Razorpay Route Linked Accounts...')
  const linkedAccounts = [
    {
      entity_type: 'DRIVER',
      entity_id: 'usr_rider_01',
      razorpay_account_id: 'ra_driver_rahul_01',
      status: 'active' as const,
      verified_at: new Date(),
    },
  ]

  for (const la of linkedAccounts) {
    await prisma.razorpayLinkedAccount.upsert({
      where: { entity_type_entity_id: { entity_type: la.entity_type, entity_id: la.entity_id } },
      update: {
        razorpay_account_id: la.razorpay_account_id,
        status: la.status,
        verified_at: la.verified_at,
      },
      create: la,
    })
    console.log(
      `  ✓ Razorpay Linked Account: ${la.entity_type} ${la.entity_id} -> ${la.razorpay_account_id}`
    )
  }

  console.log('\n========================================================')
  console.log('🎉 Seeding Complete! The database is fully populated and ready.')
  console.log('========================================================\n')
}

seedCompleteData()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma?.$disconnect()
  })
