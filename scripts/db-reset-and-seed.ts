import 'dotenv/config'
import { prisma } from '../lib/prisma'
import { hashPassword } from '../lib/password'
import { cacheDelPattern } from '../lib/cache'

const DEFAULT_PASSWORD = '123456789'

async function dbResetAndSeed() {
  if (!prisma) {
    console.error('❌ Database connection not initialized. Please check DATABASE_URL.')
    process.exit(1)
  }

  console.log('========================================================')
  console.log('🚀 CRAVE MASTER DATABASE RESET & CONSOLIDATED SEEDER')
  console.log('========================================================\n')

  console.log('🧹 [1/5] Scrubbing and deleting all existing data in safe foreign-key order...')

  await prisma.$transaction(async (tx) => {
    // 1. Transactional & Order dependencies
    await tx.orderOutbox.deleteMany().catch(() => {})
    await tx.paymentReview.deleteMany().catch(() => {})
    await tx.refund.deleteMany().catch(() => {})
    await tx.paymentTransaction.deleteMany().catch(() => {})
    await tx.vendorSettlement.deleteMany().catch(() => {})
    await tx.ledgerEntry.deleteMany().catch(() => {})
    await tx.pickerMetric.deleteMany().catch(() => {})
    await tx.adminOverrideLog.deleteMany().catch(() => {})
    await tx.driverLocationHistory.deleteMany().catch(() => {})
    await tx.driverCurrentLocation.deleteMany().catch(() => {})
    await tx.driverPayout.deleteMany().catch(() => {})
    await tx.driverIncentive.deleteMany().catch(() => {})
    await tx.driverUpiAccount.deleteMany().catch(() => {})
    await tx.driverPushToken.deleteMany().catch(() => {})
    await tx.idempotencyRecord.deleteMany().catch(() => {})
    await tx.webPushSubscription.deleteMany().catch(() => {})
    await tx.order.deleteMany().catch(() => {})

    // 2. Catalog & Menu dependencies
    await tx.menuItemVariant.deleteMany().catch(() => {})
    await tx.menuItem.deleteMany().catch(() => {})
    await tx.commercialContract.deleteMany().catch(() => {})
    await tx.couponRestaurant.deleteMany().catch(() => {})
    await tx.razorpayLinkedAccount.deleteMany().catch(() => {})
    await tx.restaurant.deleteMany().catch(() => {})
    await tx.coupon.deleteMany().catch(() => {})
    await tx.craveXPProduct.deleteMany().catch(() => {})

    // 3. User & Customer Addresses
    await tx.customerAddress.deleteMany().catch(() => {})
    await tx.user.deleteMany().catch(() => {})
  })

  console.log('✅ All existing records safely wiped.\n')

  console.log('👥 [2/5] Creating canonical test accounts for all 5 roles (Password: 123456789)...')

  const passwordHash = hashPassword(DEFAULT_PASSWORD)

  const users = [
    {
      id: 'usr_admin_01',
      name: 'System Administrator',
      email: 'admin@crave.com',
      role: 'admin' as const,
      password_hash: passwordHash,
      phone: '+919876543210',
    },
    {
      id: 'usr_customer_01',
      name: 'Priya Sharma (Customer)',
      email: 'user@crave.com',
      role: 'user' as const,
      password_hash: passwordHash,
      phone: '+919876543211',
      address: '124, 4th Cross, Koramangala 4th Block, Bengaluru, Karnataka 560034',
    },
    {
      id: 'usr_vendor_01',
      name: 'Chef Marco (Vendor)',
      email: 'vendor@crave.com',
      role: 'restaurant_vendor' as const,
      password_hash: passwordHash,
      phone: '+919876543212',
      restaurant_name: 'Spice Garden Gourmet',
      cuisine: 'North Indian & Mughlai',
    },
    {
      id: 'usr_darkstore_01',
      name: 'Dark Store Operator',
      email: 'darkstore@crave.com',
      role: 'cravexp_store_vendor' as const,
      password_hash: passwordHash,
      phone: '+919876543213',
      restaurant_name: 'craveXP 10 Store Hub',
      cuisine: 'Instant Groceries & Daily Needs',
    },
    {
      id: 'usr_rider_01',
      name: 'Rider Rahul (Fleet Driver)',
      email: 'rider@crave.com',
      role: 'rider' as const,
      password_hash: passwordHash,
      phone: '+919876543214',
      vehicle_type: 'Electric Scooter',
      license_plate: 'KA-01-EQ-9988',
    },
  ]

  for (const u of users) {
    await prisma.user.create({ data: u })
    console.log(`  ✓ Profile created: ${u.email} [${u.role}] (ID: ${u.id})`)
  }

  console.log('\n📍 [3/5] Seeding Customer Addresses...')
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
    await prisma.customerAddress.create({ data: addr })
    console.log(`  ✓ Address: ${addr.label} (${addr.address})`)
  }

  console.log('\n🏪 [4/5] Seeding Restaurants & Menu Catalog (Directly Integrated to Frontend)...')

  // Restaurant 1: Spice Garden Gourmet (Food Restaurant)
  const rest1 = await prisma.restaurant.create({
    data: {
      id: 'rest_01',
      name: 'Spice Garden Gourmet',
      cuisine: 'North Indian & Mughlai',
      address: '100 Feet Road, Indiranagar, Bengaluru',
      latitude: 12.9716,
      longitude: 77.6412,
      rating: 4.8,
      rating_count: 320,
      delivery_minutes: 25,
      cost_for_two: 500,
      is_open: true,
      is_dark_store: false,
      is_pure_veg: false,
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
      offer: '50% OFF up to ₹100',
      phone: '+919876543212',
      owner_id: 'usr_vendor_01',
      commercial_model: 'commission',
      commission_rate: 15.0,
      fssai_license: '11223344556677',
      gstin: '29ABCDE1234F1Z5',
      commercial_contracts: {
        create: {
          id: 'contract_rest_01',
          contract_number: 'CNT-SPICEGARDEN-001',
          commercial_model: 'commission',
          commission_rate: 15.0,
          status: 'ACTIVE',
        },
      },
    },
  })
  console.log(`  ✓ Food Restaurant 1: ${rest1.name} (ID: ${rest1.id})`)

  // Menu items for Restaurant 1
  const menuItemsRest1 = [
    {
      id: 'item_sg_01',
      restaurant_id: 'rest_01',
      name: 'Butter Chicken Deluxe',
      category: 'Curries',
      price: 320,
      restaurant_price: 320,
      description: 'Tender chicken simmered in a rich tomato, butter, and cashew gravy.',
      image: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=500',
      is_veg: false,
      in_stock: true,
      stock_count: 50,
      variants: {
        create: [
          {
            id: 'var_sg_01_half',
            name: 'Half (2 Pcs)',
            restaurant_price: 180,
            price: 180,
            in_stock: true,
            is_default: false,
            sort_order: 0,
          },
          {
            id: 'var_sg_01_full',
            name: 'Full (4 Pcs)',
            restaurant_price: 320,
            price: 320,
            in_stock: true,
            is_default: true,
            sort_order: 1,
          },
        ],
      },
    },
    {
      id: 'item_sg_02',
      restaurant_id: 'rest_01',
      name: 'Paneer Butter Masala',
      category: 'Curries',
      price: 280,
      restaurant_price: 280,
      description: 'Cottage cheese cubes tossed in rich tomato-cream sauce with fenugreek.',
      image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500',
      is_veg: true,
      in_stock: true,
      stock_count: 40,
    },
    {
      id: 'item_sg_03',
      restaurant_id: 'rest_01',
      name: 'Dum Biryani Handi',
      category: 'Biryani',
      price: 340,
      restaurant_price: 340,
      description: 'Fragrant aged basmati rice cooked on dum with aromatic spices and saffron.',
      image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500',
      is_veg: false,
      in_stock: true,
      stock_count: 60,
    },
    {
      id: 'item_sg_04',
      restaurant_id: 'rest_01',
      name: 'Garlic Butter Naan',
      category: 'Breads',
      price: 65,
      restaurant_price: 65,
      description: 'Traditional tandoor-baked flatbread topped with minced garlic and butter.',
      image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500',
      is_veg: true,
      in_stock: true,
      stock_count: 100,
    },
    {
      id: 'item_sg_05',
      restaurant_id: 'rest_01',
      name: 'Gulab Jamun (2 Pcs)',
      category: 'Desserts',
      price: 110,
      restaurant_price: 110,
      description: 'Warm golden milk dumplings soaked in cardamom rose syrup.',
      image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500',
      is_veg: true,
      in_stock: true,
      stock_count: 35,
    },
  ]

  for (const item of menuItemsRest1) {
    await prisma.menuItem.create({ data: item })
    console.log(`    - Menu Item: ${item.name} (₹${item.price})`)
  }

  // Restaurant 2: Bella Italia Bistro (Food Restaurant)
  const rest2 = await prisma.restaurant.create({
    data: {
      id: 'rest_02',
      name: 'Bella Italia Bistro',
      cuisine: 'Italian, Pizza & Pasta',
      address: '12 Brigade Road, Bengaluru',
      latitude: 12.974,
      longitude: 77.607,
      rating: 4.9,
      rating_count: 450,
      delivery_minutes: 20,
      cost_for_two: 600,
      is_open: true,
      is_dark_store: false,
      is_pure_veg: false,
      image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800',
      offer: 'Flat ₹120 Off Gourmet',
      phone: '+919876543212',
      owner_id: 'usr_vendor_01',
      commercial_model: 'commission',
      commission_rate: 15.0,
      fssai_license: '11223344556688',
      gstin: '29ABCDE1234F1Z6',
      commercial_contracts: {
        create: {
          id: 'contract_rest_02',
          contract_number: 'CNT-BELLAITALIA-002',
          commercial_model: 'commission',
          commission_rate: 15.0,
          status: 'ACTIVE',
        },
      },
    },
  })
  console.log(`  ✓ Food Restaurant 2: ${rest2.name} (ID: ${rest2.id})`)

  const menuItemsRest2 = [
    {
      id: 'item_bi_01',
      restaurant_id: 'rest_02',
      name: 'Margherita D.O.P. Pizza',
      category: 'Pizzas',
      price: 380,
      restaurant_price: 380,
      description:
        'San Marzano tomatoes, fresh buffalo mozzarella, fresh basil, and extra virgin olive oil.',
      image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=500',
      is_veg: true,
      in_stock: true,
      stock_count: 40,
    },
    {
      id: 'item_bi_02',
      restaurant_id: 'rest_02',
      name: 'Handcrafted Truffle Tagliatelle',
      category: 'Pastas',
      price: 450,
      restaurant_price: 450,
      description:
        'Fresh egg pasta tossed with wild mushrooms, black truffle butter, and parmigiano.',
      image: 'https://images.unsplash.com/photo-1621996346565-e3d5d628120b?w=500',
      is_veg: true,
      in_stock: true,
      stock_count: 30,
    },
  ]

  for (const item of menuItemsRest2) {
    await prisma.menuItem.create({ data: item })
    console.log(`    - Menu Item: ${item.name} (₹${item.price})`)
  }

  // Restaurant 3: CraveXP Dark Store
  const darkStore = await prisma.restaurant.create({
    data: {
      id: 'cravexp_dark_store_01',
      name: 'craveXP 10 Store Hub',
      cuisine: 'craveXP Instamart 10-Min Store',
      address: 'Central Warehouse, Bengaluru',
      latitude: 12.935,
      longitude: 77.624,
      rating: 4.9,
      rating_count: 5200,
      delivery_minutes: 10,
      cost_for_two: 200,
      is_open: true,
      is_dark_store: true,
      is_pure_veg: false,
      image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500',
      phone: '+919876543213',
      owner_id: 'usr_darkstore_01',
      commission_rate: 10.0,
      fssai_license: '22334455667788',
      gstin: '29FGHIJ5678K1Z9',
    },
  })
  console.log(`  ✓ Dark Store Hub: ${darkStore.name} (ID: ${darkStore.id})`)

  // CraveXP Products
  const cxpProducts = [
    {
      id: 'cxp_milk_01',
      name: 'Amul Taaza Toned Milk (500ml)',
      category: 'Dairy, Bread & Eggs',
      unit: '500 ml',
      price: 28,
      mrp: 30,
      description: 'Fresh toned milk, rich in calcium and protein.',
      image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500',
      in_stock: true,
      stock_count: 100,
    },
    {
      id: 'cxp_bread_01',
      name: 'Modern 100% Whole Wheat Bread (400g)',
      category: 'Dairy, Bread & Eggs',
      unit: '400 g',
      price: 45,
      mrp: 50,
      description: 'Zero maida, high-fiber nutritious whole wheat bread.',
      image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500',
      in_stock: true,
      stock_count: 50,
    },
  ]

  for (const prod of cxpProducts) {
    await prisma.craveXPProduct.create({ data: prod })
  }

  // Seed Coupons
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
    await prisma.coupon.create({ data: c })
    console.log(`  ✓ Coupon: ${c.code}`)
  }

  console.log('\n⚡ [5/5] Invalidating Redis Cache...')
  try {
    await cacheDelPattern('*')
    console.log('✅ Redis Cache flushed.')
  } catch {
    console.log('ℹ️ Redis unavailable or flushed gracefully.')
  }

  console.log('\n======================================================')
  console.log('🎉 DATABASE RESET & SEED COMPLETE!')
  console.log('🔑 ALL 5 TEST ACCOUNTS CREATED (Password: 123456789)')
  console.log('------------------------------------------------------')
  console.log('1. Admin:    admin@crave.com     | 123456789 (ID: usr_admin_01)')
  console.log('2. Customer: user@crave.com      | 123456789 (ID: usr_customer_01)')
  console.log('3. Vendor:   vendor@crave.com    | 123456789 (ID: usr_vendor_01)')
  console.log('4. Store:    darkstore@crave.com | 123456789 (ID: usr_darkstore_01)')
  console.log('5. Rider:    rider@crave.com     | 123456789 (ID: usr_rider_01)')
  console.log('------------------------------------------------------')
  console.log('Featured Restaurant ID: rest_01 (Spice Garden Gourmet)')
  console.log('Second Restaurant ID:   rest_02 (Bella Italia Bistro)')
  console.log('Dark Store ID:          cravexp_dark_store_01')
  console.log('======================================================\n')
}

dbResetAndSeed()
  .catch((e) => {
    console.error('❌ Reset and seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
