import 'dotenv/config'
import { prisma } from '../lib/prisma'
import crypto from 'crypto'

function hashPassword(password: string): string {
  // Use 16-byte random salt format matching app/api/auth/signup/route.ts
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

async function seedCompleteData() {
  if (!prisma) {
    console.error('❌ Database client not initialized. Ensure DATABASE_URL is configured.')
    process.exit(1)
  }

  console.log('========================================================')
  console.log('🌱 CRAVE Complete Test Database Seeder')
  console.log('========================================================\n')

  const defaultPassword = 'Password123!'
  const defaultHash = hashPassword(defaultPassword)

  // 1. Seed Core Users Across All 5 Roles
  console.log('👥 Seeding Users for All 5 Roles...')
  const users = [
    {
      id: 'usr_admin_01',
      name: 'System Administrator',
      email: 'admin@crave.com',
      role: 'admin' as const,
      password_hash: defaultHash,
      phone: '+919876543210',
    },
    {
      id: 'usr_customer_01',
      name: 'Priya Sharma (Customer)',
      email: 'user@crave.com',
      role: 'user' as const,
      password_hash: defaultHash,
      phone: '+919876543211',
    },
    {
      id: 'usr_vendor_01',
      name: 'Chef Marco (Kitchen Vendor)',
      email: 'vendor@crave.com',
      role: 'restaurant_vendor' as const,
      password_hash: defaultHash,
      restaurant_name: 'Spice Garden',
      cuisine: 'North Indian & Mughlai',
      phone: '+919876543212',
    },
    {
      id: 'usr_darkstore_01',
      name: 'Dark Store Operator',
      email: 'darkstore@crave.com',
      role: 'cravexp_store_vendor' as const,
      password_hash: defaultHash,
      restaurant_name: 'craveXP 10 Store Hub',
      cuisine: 'Instant Groceries & Daily Needs',
      phone: '+919876543213',
    },
    {
      id: 'usr_rider_01',
      name: 'Rider Rahul (Fleet Driver)',
      email: 'rider@crave.com',
      role: 'rider' as const,
      password_hash: defaultHash,
      vehicle_type: 'Electric Scooter',
      license_plate: 'KA-01-EQ-9988',
      phone: '+919876543214',
    },
  ]

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        password_hash: u.password_hash,
        phone: u.phone,
      },
      create: u,
    })
    console.log(`  ✓ User: ${u.email} (${u.role}) — Password: ${defaultPassword}`)
  }

  // 2. Seed Customer Delivery Addresses
  console.log('\n📍 Seeding Customer Delivery Addresses...')
  const addresses = [
    {
      id: 'addr_home_01',
      customer_id: 'usr_customer_01',
      label: 'Home',
      address: '124, 4th Cross, Koramangala 4th Block, Near Wipro Park, Bengaluru, Karnataka 560034',
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

  // 3. Seed Restaurants & Dark Stores
  console.log('\n🍽️ Seeding Kitchens & Dark Stores...')
  const restaurants = [
    {
      id: 'rest_01',
      name: 'Spice Garden',
      cuisine: 'North Indian & Mughlai',
      address: '12th Main Road, Indiranagar, Bengaluru',
      rating: 4.8,
      rating_count: 340,
      delivery_minutes: 25,
      cost_for_two: 450,
      is_open: true,
      is_pure_veg: false,
      is_dark_store: false,
      latitude: 12.9719,
      longitude: 77.6412,
      owner_id: 'usr_vendor_01',
      commission_rate: 15.0,
      fssai_license: '11223344556677',
      gstin: '29ABCDE1234F1Z5',
    },
    {
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
      latitude: 12.9287,
      longitude: 77.5833,
      owner_id: 'usr_darkstore_01',
      commission_rate: 10.0,
      fssai_license: '22334455667788',
      gstin: '29FGHIJ5678K1Z9',
    },
  ]

  for (const r of restaurants) {
    await prisma.restaurant.upsert({
      where: { id: r.id },
      update: r,
      create: r,
    })
    console.log(`  ✓ Restaurant: ${r.name} (${r.cuisine})`)
  }

  // 4. Seed Menu Items
  console.log('\n🍛 Seeding Menu Items & Dark Store Inventory...')
  const menuItems = [
    // Spice Garden Items
    {
      id: 'item_sg_01',
      restaurant_id: 'rest_01',
      name: 'Butter Chicken Gourmet Bowl',
      description: 'Slow-cooked tandoori chicken simmered in rich creamy tomato and butter gravy.',
      price: 320,
      category: 'Main Course',
      is_veg: false,
      in_stock: true,
      image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500',
    },
    {
      id: 'item_sg_02',
      restaurant_id: 'rest_01',
      name: 'Paneer Butter Masala',
      description: 'Fresh artisanal cottage cheese cubes tossed in velvet makhani sauce.',
      price: 280,
      category: 'Main Course',
      is_veg: true,
      in_stock: true,
      image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500',
    },
    {
      id: 'item_sg_03',
      restaurant_id: 'rest_01',
      name: 'Butter Garlic Naan (2 pcs)',
      description: 'Clay-oven baked fluffy flatbread brushed with garlic and clarified butter.',
      price: 90,
      category: 'Breads',
      is_veg: true,
      in_stock: true,
      image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500',
    },
    {
      id: 'item_sg_04',
      restaurant_id: 'rest_01',
      name: 'Dum Hyderabadi Biryani',
      description: 'Fragrant basmati rice layered with aromatic spices and saffron.',
      price: 340,
      category: 'Biryani',
      is_veg: false,
      in_stock: true,
      image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500',
    },
    // CraveXP Dark Store Grocery Items
    {
      id: 'item_cxp_01',
      restaurant_id: 'cravexp_dark_store_01',
      name: 'Amul Taaza Fresh Toned Milk (500ml)',
      description: 'Pasteurized homogenized toned milk pouch.',
      price: 28,
      category: 'Dairy & Eggs',
      is_veg: true,
      in_stock: true,
      image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500',
    },
    {
      id: 'item_cxp_02',
      restaurant_id: 'cravexp_dark_store_01',
      name: 'Farm Fresh Brown Eggs (Pack of 6)',
      description: 'Antibiotic-free high protein brown eggs.',
      price: 65,
      category: 'Dairy & Eggs',
      is_veg: false,
      in_stock: true,
      image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=500',
    },
    {
      id: 'item_cxp_03',
      restaurant_id: 'cravexp_dark_store_01',
      name: 'Modern 100% Whole Wheat Bread (400g)',
      description: 'Zero maida zero cholesterol fiber-rich bread.',
      price: 45,
      category: 'Bakery',
      is_veg: true,
      in_stock: true,
      image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500',
    },
    {
      id: 'item_cxp_04',
      restaurant_id: 'cravexp_dark_store_01',
      name: 'Shimla Royal Gala Apples (4 pcs / ~500g)',
      description: 'Crisp sweet handpicked hill apples.',
      price: 110,
      category: 'Fruits & Veggies',
      is_veg: true,
      in_stock: true,
      image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=500',
    },
  ]

  for (const item of menuItems) {
    await prisma.menuItem.upsert({
      where: { id: item.id },
      update: item,
      create: item,
    })
    console.log(`  ✓ Item: ${item.name} (₹${item.price})`)
  }

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
    },
  })
  console.log('  ✓ Payment Config: crave@upi with base fees and surge multipliers')

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
