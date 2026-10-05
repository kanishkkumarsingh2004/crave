import 'dotenv/config'
import { prisma } from '@/lib/prisma'
import * as fs from 'fs'
import * as path from 'path'
import { OrderStatus, UserRole } from '@prisma/client'
import crypto from 'crypto'

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true') {
  console.log(
    'Production mode detected: skipping seed script to avoid demo data in live environments.'
  )
  process.exit(0)
}

async function seed() {
  if (!prisma) {
    throw new Error(
      'PostgreSQL is not available. Check DATABASE_URL in .env and make sure the PostgreSQL server is running.'
    )
  }

  try {
    await prisma.$queryRaw`SELECT 1`
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'connection refused'
    throw new Error(
      `PostgreSQL is not reachable at DATABASE_URL. Start the PostgreSQL service and retry. ${detail}`
    )
  }

  console.log('Starting seed...')

  // ─── Clean Slate: Remove all existing data ──────────────────
  console.log('  Clearing existing data...')
  await prisma.paymentReview.deleteMany()
  await prisma.vendorSettlement.deleteMany()
  await prisma.driverPayout.deleteMany()
  await prisma.order.deleteMany()
  await prisma.paymentConfig.deleteMany()
  await prisma.restaurant.deleteMany()
  await prisma.user.deleteMany()
  console.log('  ✅ Existing data cleared')

  // ─── Seed Demo Users ─────────────────────────────────────
  const SEED_PASSWORD = '1234567890'
  const demoUsers = [
    {
      id: 'usr_test_user',
      name: 'Test User',
      email: 'user.test@crave.local',
      role: 'user' as UserRole,
    },
    {
      id: 'usr_test_admin',
      name: 'Test Admin',
      email: 'admin.test@crave.local',
      role: 'admin' as UserRole,
    },
    {
      id: 'usr_test_restaurant_vendor',
      name: 'Test Restaurant Vendor',
      email: 'restaurant.test@crave.local',
      role: 'restaurant_vendor' as UserRole,
    },
    {
      id: 'usr_test_cravexp_vendor',
      name: 'Test CraveXP Store Vendor',
      email: 'cravexp.test@crave.local',
      role: 'cravexp_store_vendor' as UserRole,
    },
    {
      id: 'usr_test_rider',
      name: 'Test Rider',
      email: 'rider.test@crave.local',
      role: 'rider' as UserRole,
    },
  ]

  for (const u of demoUsers) {
    const hash = crypto.scryptSync(SEED_PASSWORD, u.email, 64).toString('hex')
    await prisma.user.create({
      data: {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        password_hash: hash,
        locale: 'en',
      },
    })
    console.log(`  ✅ Seeded user ${u.email}`)
  }

  // ─── Seed Restaurant ─────────────────────────────────────
  await prisma.restaurant.create({
    data: {
      id: 'vnd_1791063436223_iyet2',
      name: 'Spice Garden',
      cuisine: 'Indian',
      is_open: true,
    },
  })
  console.log('  ✅ Seeded restaurant Spice Garden')

  // ─── Seed Menu Items ──────────────────────────────────────
  const seedMenuItems = [
    {
      id: 'mi_001',
      restaurant_id: 'vnd_1791063436223_iyet2',
      name: 'Margherita Pizza',
      category: 'Pizza',
      price: 150,
      description: 'Fresh tomato sauce, mozzarella, basil',
      is_veg: true,
      image: 'https://images.unsplash.com/photo-1600891938885-8b2e0b1a2a6a?w=500',
      stock_count: 50,
    },
    {
      id: 'mi_002',
      restaurant_id: 'vnd_1791063436223_iyet2',
      name: 'Paneer Tikka Pizza',
      category: 'Pizza',
      price: 220,
      description: 'Grilled paneer, capsicum, tomato, paneer tikka masala',
      is_veg: true,
      image: 'https://images.unsplash.com/photo-1565780093704-9dc584f1f486?w=500',
      stock_count: 30,
    },
    {
      id: 'mi_003',
      restaurant_id: 'vnd_1791063436223_iyet2',
      name: 'Chicken Pepperoni Pizza',
      category: 'Pizza',
      price: 280,
      description: 'Pepperoni, mozzarella, tomato sauce, oregano',
      is_veg: false,
      image: 'https://images.unsplash.com/photo-1594007651032-13b7f892b970?w=500',
      stock_count: 40,
    },
    {
      id: 'mi_004',
      restaurant_id: 'vnd_1791063436223_iyet2',
      name: 'Garlic Breadsticks',
      category: 'Sides',
      price: 80,
      description: 'Crispy garlic breadsticks with herbs',
      is_veg: true,
      image: 'https://images.unsplash.com/photo-1578662986947-9e765b6f4a5e?w=500',
      stock_count: 60,
    },
    {
      id: 'mi_005',
      restaurant_id: 'vnd_1791063436223_iyet2',
      name: 'Chicken Cheesy Pasta',
      category: 'Pasta',
      price: 220,
      description: 'Creamy pasta with grilled chicken and cheese',
      is_veg: false,
      image: 'https://images.unsplash.com/photo-1612874642237-1c2766d1c767?w=500',
      stock_count: 25,
    },
  ]

  for (const item of seedMenuItems) {
    await prisma.menuItem.createMany({
      data: [{
        id: item.id,
        restaurant_id: item.restaurant_id,
        name: item.name,
        category: item.category,
        price: item.price,
        description: item.description,
        is_veg: item.is_veg,
        image: item.image,
        stock_count: item.stock_count,
      }],
      skipDuplicates: true,
    })
  }
  console.log(`  ✅ Seeded ${seedMenuItems.length} menu items`)

  // ─── Seed Active Payment Config ───────────────────────────
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
  console.log('  ✅ Seeded active payment config (UPI ID: crave@upi)')

  // ─── Seed Vendor Settlements ───────────────────────────────
  const settlements = [
    {
      id: 'stl_001',
      restaurant_name: 'Spice Garden',
      gross_sales: 50000,
      commission_rate: 15,
      commission_amount: 7500,
      net_payout: 42500,
    },
    {
      id: 'stl_002',
      restaurant_name: 'Biryani Blues',
      gross_sales: 35000,
      commission_rate: 15,
      commission_amount: 5250,
      net_payout: 29750,
    },
    {
      id: 'stl_003',
      restaurant_name: 'Pizza Hive',
      gross_sales: 28000,
      commission_rate: 12,
      commission_amount: 3360,
      net_payout: 24640,
    },
  ]

  for (const s of settlements) {
      await prisma.vendorSettlement.createMany({
        data: [{ ...s, status: 'settled', restaurant_id: 'vnd_1791063436223_iyet2' }],
        skipDuplicates: true,
      })
  }
  console.log(`  ✅ Seeded ${settlements.length} vendor settlements`)

  // ─── Seed Orders with Payment Reviews ────────────────────
  const seedOrders = [
    {
      id: 'ord_test_1791114804105',
      customer_id: 'usr_test_user',
      customer_name: 'Test User',
      customer_phone: '+919876543210',
      customer_address: 'Kanakapura Road, Bengaluru',
      restaurant_id: 'vnd_1791063436223_iyet2',
      restaurant_name: 'Spice Garden',
      items: [{ id: 'p1', name: 'Pizza', price: 50, qty: 1 }],
      subtotal: 50,
      packaging_fee: 5,
      gst: 3,
      total_amount: 58,
      status: 'payment_submitted' as OrderStatus,
      payment_method: 'UPI Online',
      delivery_otp: '1234',
      utr_ref: '123456789012',
      customer_vpa: '8965412@ybl',
      payment_status: 'pending',
      created_at: new Date('2026-10-04T11:53:29.933Z'),
    },
    {
      id: 'ord_test_1791114711178',
      customer_id: 'usr_test_user',
      customer_name: 'Test User',
      customer_phone: '+919876543210',
      customer_address: 'Kanakapura Road, Bengaluru',
      restaurant_id: 'vnd_1791063436223_iyet2',
      restaurant_name: 'Spice Garden',
      items: [{ id: 'p1', name: 'Pizza', price: 50, qty: 1 }],
      subtotal: 50,
      packaging_fee: 5,
      gst: 3,
      total_amount: 58,
      status: 'payment_submitted' as OrderStatus,
      payment_method: 'UPI Online',
      delivery_otp: '1234',
      utr_ref: '123456789012',
      customer_vpa: '8965412@ybl',
      payment_status: 'pending',
      created_at: new Date('2026-10-04T11:51:55.435Z'),
    },
  ]

  for (const order of seedOrders) {
    try {
      await prisma.order.createMany({
        data: [{
          id: order.id,
          customer_id: order.customer_id || null,
          customer_name: order.customer_name,
          customer_phone: order.customer_phone || null,
          customer_address: order.customer_address || null,
          restaurant_id: order.restaurant_id || null,
          restaurant_name: order.restaurant_name,
          items: order.items,
          subtotal: order.subtotal,
          packaging_fee: order.packaging_fee,
          gst: order.gst,
          total_amount: order.total_amount,
          status: order.status,
          payment_method: order.payment_method,
          created_at: order.created_at,
          delivery_otp: order.delivery_otp || null,
          tip: 0,
          discount_amount: 0,
        }],
        skipDuplicates: true,
      })
      console.log(`  ✅ Seeded order ${order.id}`)

      if (order.utr_ref && order.customer_vpa) {
        await prisma.paymentReview.createMany({
          data: [{
            id: `pr_${order.id}`,
            order_id: order.id,
            utr_ref: order.utr_ref,
            customer_vpa: order.customer_vpa,
            amount: order.total_amount,
            status: order.payment_status || 'pending',
            created_at: order.created_at,
          }],
          skipDuplicates: true,
        })
        console.log(`  ✅ Seeded payment review for order ${order.id}`)
      }
    } catch (err) {
      console.error(`  ❌ Failed to seed order ${order.id}:`, err)
    }
  }

  // ─── Also read from data/orders.json if present ──────────
  const ordersFile = path.join(process.cwd(), 'data', 'orders.json')
  let ordersData: any[] = []
  if (fs.existsSync(ordersFile)) {
    ordersData = JSON.parse(fs.readFileSync(ordersFile, 'utf-8')) || []
  }

  for (const order of ordersData) {
    try {
      await prisma.order.createMany({
        data: [{
          id: order.id,
          customer_id: order.customer_id || null,
          customer_name: order.customer_name,
          customer_phone: order.customer_phone || null,
          customer_address: order.customer_address || null,
          restaurant_id: order.restaurant_id || null,
          restaurant_name: order.restaurant_name,
          items: order.items,
          subtotal: order.subtotal,
          packaging_fee: order.packaging_fee,
          gst: order.gst,
          total_amount: order.total_amount,
          status: order.status as OrderStatus,
          payment_method: order.payment_method,
          created_at: order.createdAt ? new Date(order.createdAt) : undefined,
          delivery_otp: order.delivery_otp || null,
          tip: order.tip || 0,
          discount_amount: order.discount_amount || 0,
          coupon_code: order.coupon_code || null,
        }],
        skipDuplicates: true,
      })

      if (order.utr_ref && order.customer_vpa) {
        await prisma.paymentReview.createMany({
          data: [{
            id: `pr_${order.id}`,
            order_id: order.id,
            utr_ref: order.utr_ref,
            customer_vpa: order.customer_vpa,
            amount: order.total_amount,
            status: order.payment_status || 'pending',
            created_at: order.createdAt ? new Date(order.createdAt) : undefined,
          }],
          skipDuplicates: true,
        })
      }
    } catch (err) {
      console.error(`  ❌ Failed to seed order ${order.id}:`, err)
    }
  }

  const ordersCount = await prisma.order.count()
  const reviewsCount = await prisma.paymentReview.count()
  const usersCount = await prisma.user.count()
  const configCount = await prisma.paymentConfig.count({ where: { is_active: true } })
  console.log(
    `\nSummary: ${usersCount} users, ${ordersCount} orders, ${reviewsCount} payment reviews, ${configCount} active payment config`
  )
  console.log('Seed complete!')
}

seed()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
