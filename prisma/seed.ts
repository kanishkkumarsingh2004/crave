import { prisma } from '@/lib/prisma'
import * as fs from 'fs'
import * as path from 'path'
import { OrderStatus, UserRole } from '@prisma/client'

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true') {
  console.log(
    'Production mode detected: skipping seed script to avoid demo data in live environments.'
  )
  process.exit(0)
}

async function seed() {
  console.log('Starting seed...')

  // ─── Seed Demo Users ─────────────────────────────────────
  const demoUsers = [
    {
      id: 'usr_krithik_r124',
      name: 'Krithik R',
      email: 'customer@crave.com',
      role: 'customer' as UserRole,
    },
    {
      id: 'usr_admin_r01',
      name: 'Admin User',
      email: 'admin@crave.com',
      role: 'admin' as UserRole,
    },
    {
      id: 'usr_vendor_r01',
      name: 'Vendor User',
      email: 'vendor@crave.com',
      role: 'vendor' as UserRole,
    },
    {
      id: 'usr_driver_r01',
      name: 'Driver User',
      email: 'driver@crave.com',
      role: 'driver' as UserRole,
    },
  ]

  for (const u of demoUsers) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: { name: u.name, email: u.email, role: u.role },
      create: { id: u.id, name: u.name, email: u.email, role: u.role },
    })
    console.log(`  ✅ Seeded user ${u.email}`)
  }

  // ─── Seed Restaurant ─────────────────────────────────────
  await prisma.restaurant.upsert({
    where: { id: 'vnd_1791063436223_iyet2' },
    update: {},
    create: {
      id: 'vnd_1791063436223_iyet2',
      name: 'Spice Garden',
      cuisine: 'Indian',
      is_open: true,
    },
  })
  console.log('  ✅ Seeded restaurant Spice Garden')

  // ─── Seed Active Payment Config ───────────────────────────
  await prisma.paymentConfig.upsert({
    where: { id: 'default_config' },
    update: {
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
    await prisma.vendorSettlement.upsert({
      where: { id: s.id },
      update: { ...s, status: 'settled', restaurant_id: 'vnd_1791063436223_iyet2' },
      create: { ...s, status: 'settled', restaurant_id: 'vnd_1791063436223_iyet2' },
    })
  }
  console.log(`  ✅ Seeded ${settlements.length} vendor settlements`)

  // ─── Seed Orders with Payment Reviews ────────────────────
  const seedOrders = [
    {
      id: 'ord_test_1791114804105',
      customer_id: 'usr_krithik_r124',
      customer_name: 'Krithik R',
      customer_phone: '+919876543210',
      customer_address: 'Kanakapura Road, Bengaluru',
      restaurant_id: 'vnd_1791063436223_iyet2',
      restaurant_name: 'Spice Garden',
      items: [{ id: 'p1', name: 'Pizza', price: 50, qty: 1 }],
      subtotal: 50,
      packaging_fee: 5,
      gst: 3,
      total_amount: 58,
      status: 'new' as OrderStatus,
      payment_method: 'UPI Online',
      delivery_otp: '1234',
      utr_ref: '123456789012',
      customer_vpa: '8965412@ybl',
      payment_status: 'pending',
      created_at: new Date('2026-10-04T11:53:29.933Z'),
    },
    {
      id: 'ord_test_1791114711178',
      customer_id: 'usr_krithik_r124',
      customer_name: 'Krithik R',
      customer_phone: '+919876543210',
      customer_address: 'Kanakapura Road, Bengaluru',
      restaurant_id: 'vnd_1791063436223_iyet2',
      restaurant_name: 'Spice Garden',
      items: [{ id: 'p1', name: 'Pizza', price: 50, qty: 1 }],
      subtotal: 50,
      packaging_fee: 5,
      gst: 3,
      total_amount: 58,
      status: 'new' as OrderStatus,
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
      await prisma.order.upsert({
        where: { id: order.id },
        update: {
          customer_id: order.customer_id || undefined,
          customer_name: order.customer_name,
          customer_phone: order.customer_phone || undefined,
          customer_address: order.customer_address || undefined,
          restaurant_id: order.restaurant_id || undefined,
          restaurant_name: order.restaurant_name,
          items: order.items,
          subtotal: order.subtotal,
          packaging_fee: order.packaging_fee,
          gst: order.gst,
          total_amount: order.total_amount,
          status: order.status,
          payment_method: order.payment_method,
          created_at: order.created_at,
          delivery_otp: order.delivery_otp || undefined,
          tip: 0,
          discount_amount: 0,
        },
        create: {
          id: order.id,
          customer_id: order.customer_id || undefined,
          customer_name: order.customer_name,
          customer_phone: order.customer_phone || undefined,
          customer_address: order.customer_address || undefined,
          restaurant_id: order.restaurant_id || undefined,
          restaurant_name: order.restaurant_name,
          items: order.items,
          subtotal: order.subtotal,
          packaging_fee: order.packaging_fee,
          gst: order.gst,
          total_amount: order.total_amount,
          status: order.status,
          payment_method: order.payment_method,
          created_at: order.created_at,
          delivery_otp: order.delivery_otp || undefined,
          tip: 0,
          discount_amount: 0,
        },
      })
      console.log(`  ✅ Seeded order ${order.id}`)

      if (order.utr_ref && order.customer_vpa) {
        await prisma.paymentReview.upsert({
          where: { id: `pr_${order.id}` },
          update: {
            order_id: order.id,
            utr_ref: order.utr_ref,
            customer_vpa: order.customer_vpa,
            amount: order.total_amount,
            status: order.payment_status || 'pending',
            created_at: order.created_at,
          },
          create: {
            id: `pr_${order.id}`,
            order_id: order.id,
            utr_ref: order.utr_ref,
            customer_vpa: order.customer_vpa,
            amount: order.total_amount,
            status: order.payment_status || 'pending',
            created_at: order.created_at,
          },
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
      await prisma.order.upsert({
        where: { id: order.id },
        update: {
          customer_id: order.customer_id || undefined,
          customer_name: order.customer_name,
          customer_phone: order.customer_phone || undefined,
          customer_address: order.customer_address || undefined,
          restaurant_id: order.restaurant_id || undefined,
          restaurant_name: order.restaurant_name,
          items: order.items,
          subtotal: order.subtotal,
          packaging_fee: order.packaging_fee,
          gst: order.gst,
          total_amount: order.total_amount,
          status: order.status as OrderStatus,
          payment_method: order.payment_method,
          created_at: order.createdAt ? new Date(order.createdAt) : undefined,
          delivery_otp: order.delivery_otp || undefined,
          tip: order.tip || 0,
          discount_amount: order.discount_amount || 0,
          coupon_code: order.coupon_code || undefined,
        },
        create: {
          id: order.id,
          customer_id: order.customer_id || undefined,
          customer_name: order.customer_name,
          customer_phone: order.customer_phone || undefined,
          customer_address: order.customer_address || undefined,
          restaurant_id: order.restaurant_id || undefined,
          restaurant_name: order.restaurant_name,
          items: order.items,
          subtotal: order.subtotal,
          packaging_fee: order.packaging_fee,
          gst: order.gst,
          total_amount: order.total_amount,
          status: order.status as OrderStatus,
          payment_method: order.payment_method,
          created_at: order.createdAt ? new Date(order.createdAt) : undefined,
          delivery_otp: order.delivery_otp || undefined,
          tip: order.tip || 0,
          discount_amount: order.discount_amount || 0,
          coupon_code: order.coupon_code || undefined,
        },
      })

      if (order.utr_ref && order.customer_vpa) {
        await prisma.paymentReview.upsert({
          where: { id: `pr_${order.id}` },
          update: {
            order_id: order.id,
            utr_ref: order.utr_ref,
            customer_vpa: order.customer_vpa,
            amount: order.total_amount,
            status: order.payment_status || 'pending',
            created_at: order.createdAt ? new Date(order.createdAt) : undefined,
          },
          create: {
            id: `pr_${order.id}`,
            order_id: order.id,
            utr_ref: order.utr_ref,
            customer_vpa: order.customer_vpa,
            amount: order.total_amount,
            status: order.payment_status || 'pending',
            created_at: order.createdAt ? new Date(order.createdAt) : undefined,
          },
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
