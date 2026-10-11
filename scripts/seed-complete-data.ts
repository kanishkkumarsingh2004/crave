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
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500',
      latitude: 12.682,
      longitude: 77.469,
      owner_id: 'usr_vendor_01',
      commission_rate: 15.0,
      fssai_license: '11223344556677',
      gstin: '29ABCDE1234F1Z5',
    },
    {
      id: 'rest_02',
      name: 'Milano Artisanal Pizzeria',
      cuisine: 'Artisanal Pizza & Italian Pasta',
      address: '100ft Road, Indiranagar, Bengaluru',
      rating: 4.9,
      rating_count: 580,
      delivery_minutes: 20,
      cost_for_two: 600,
      is_open: true,
      is_pure_veg: false,
      is_dark_store: false,
      image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500',
      latitude: 12.686,
      longitude: 77.475,
      owner_id: 'usr_vendor_01',
      commission_rate: 15.0,
      fssai_license: '11223344556678',
      gstin: '29ABCDE1234F1Z6',
    },
    {
      id: 'rest_03',
      name: 'Meghana Biryani House',
      cuisine: 'Dum Biryani & Andhra Spiced',
      address: 'Koramangala 5th Block, Bengaluru',
      rating: 4.8,
      rating_count: 1420,
      delivery_minutes: 22,
      cost_for_two: 500,
      is_open: true,
      is_pure_veg: false,
      is_dark_store: false,
      image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500',
      latitude: 12.681,
      longitude: 77.468,
      owner_id: 'usr_vendor_01',
      commission_rate: 15.0,
      fssai_license: '11223344556679',
      gstin: '29ABCDE1234F1Z7',
    },
    {
      id: 'rest_04',
      name: 'Rameshwaram Tiffin Room',
      cuisine: 'South Indian & Filter Coffee',
      address: '12th Main, HAL 2nd Stage, Indiranagar, Bengaluru',
      rating: 4.9,
      rating_count: 3200,
      delivery_minutes: 18,
      cost_for_two: 250,
      is_open: true,
      is_pure_veg: true,
      is_dark_store: false,
      image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500',
      latitude: 12.683,
      longitude: 77.473,
      owner_id: 'usr_vendor_01',
      commission_rate: 15.0,
      fssai_license: '11223344556680',
      gstin: '29ABCDE1234F1Z8',
    },
    {
      id: 'rest_05',
      name: 'Zen Dimsum & Wok',
      cuisine: 'Asian Momos & Wok Chinese',
      address: 'Lavelle Road, Bengaluru',
      rating: 4.7,
      rating_count: 420,
      delivery_minutes: 25,
      cost_for_two: 550,
      is_open: true,
      is_pure_veg: false,
      is_dark_store: false,
      image: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=500',
      latitude: 12.6845,
      longitude: 77.471,
      owner_id: 'usr_vendor_01',
      commission_rate: 15.0,
      fssai_license: '11223344556681',
      gstin: '29ABCDE1234F1Z9',
    },
    {
      id: 'rest_06',
      name: 'Green Harvest Bowls',
      cuisine: 'Healthy Bowls & Fresh Salads',
      address: 'Koramangala 4th Block, Bengaluru',
      rating: 4.8,
      rating_count: 290,
      delivery_minutes: 20,
      cost_for_two: 400,
      is_open: true,
      is_pure_veg: true,
      is_dark_store: false,
      image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500',
      latitude: 12.685,
      longitude: 77.472,
      owner_id: 'usr_vendor_01',
      commission_rate: 15.0,
      fssai_license: '11223344556682',
      gstin: '29ABCDE1234F1Z0',
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
      image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500',
      latitude: 12.68,
      longitude: 77.47,
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
    // Milano Artisanal Pizzeria Items
    {
      id: 'item_mp_01',
      restaurant_id: 'rest_02',
      name: 'Margherita Sourdough Pizza',
      description: 'San Marzano tomatoes, fresh buffalo mozzarella, and sweet basil leaves.',
      price: 390,
      category: 'Artisanal Pizza',
      is_veg: true,
      in_stock: true,
      image: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=500',
    },
    {
      id: 'item_mp_02',
      restaurant_id: 'rest_02',
      name: 'Truffle Mushroom Fettuccine',
      description: 'Hand-rolled fresh egg pasta with wild forest mushrooms and black truffle cream.',
      price: 420,
      category: 'Italian Pasta',
      is_veg: true,
      in_stock: true,
      image: 'https://images.unsplash.com/photo-1621996346565-e3d5d628178e?w=500',
    },
    // Meghana Biryani Items
    {
      id: 'item_mb_01',
      restaurant_id: 'rest_03',
      name: 'Meghana Special Chicken Biryani',
      description: 'Andhra-style spicy marinated boneless chicken served over fragrant dum ghee rice.',
      price: 360,
      category: 'Dum Biryani',
      is_veg: false,
      in_stock: true,
      image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500',
    },
    {
      id: 'item_mb_02',
      restaurant_id: 'rest_03',
      name: 'Paneer Sholay Kebab',
      description: 'Crispy fried cottage cheese tossed in spicy Guntur red chilli and curry leaves.',
      price: 290,
      category: 'Starters',
      is_veg: true,
      in_stock: true,
      image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=500',
    },
    // Rameshwaram Tiffin Room Items
    {
      id: 'item_rt_01',
      restaurant_id: 'rest_04',
      name: 'Ghee Podi Thatte Idli (2 pcs)',
      description: 'Steaming hot thick South Indian rice cakes drenched in pure cow ghee and gunpowder chutney podi.',
      price: 110,
      category: 'South Indian',
      is_veg: true,
      in_stock: true,
      image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500',
    },
    {
      id: 'item_rt_02',
      restaurant_id: 'rest_04',
      name: 'Crispy Butter Masala Dosa',
      description: 'Golden crunchy crepe roasted with butter, spiced potato mash, coconut & tomato chutneys.',
      price: 140,
      category: 'South Indian',
      is_veg: true,
      in_stock: true,
      image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500',
    },
    // Zen Dimsum Items
    {
      id: 'item_zd_01',
      restaurant_id: 'rest_05',
      name: 'Steamed Edamame & Truffle Dimsum (4 pcs)',
      description: 'Crystal wrappers stuffed with mashed edamame beans and aromatic white truffle oil.',
      price: 310,
      category: 'Asian Momos',
      is_veg: true,
      in_stock: true,
      image: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=500',
    },
    {
      id: 'item_zd_02',
      restaurant_id: 'rest_05',
      name: 'Hakka Chilli Garlic Noodles',
      description: 'Wok-tossed wheat noodles with crunchy spring greens, charred scallions, and roasted garlic.',
      price: 260,
      category: 'Wok & Chinese',
      is_veg: true,
      in_stock: true,
      image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500',
    },
    // Green Harvest Bowls Items
    {
      id: 'item_gh_01',
      restaurant_id: 'rest_06',
      name: 'Mediterranean Quinoa Glow Bowl',
      description: 'Warm organic quinoa, Hass avocado, cherry tomatoes, Kalamata olives, hummus, and lemon tahini dressing.',
      price: 340,
      category: 'Healthy Bowls',
      is_veg: true,
      in_stock: true,
      image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500',
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
