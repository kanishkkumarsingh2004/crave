import { prisma } from '@/lib/prisma'
import * as fs from 'fs'
import * as path from 'path'
import { OrderStatus, UserRole } from '@prisma/client'

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

  // ─── Seed Orders from data/orders.json ──────────────────
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

      console.log(`  ✅ Seeded order ${order.id}`)

      // ─── Seed Payment Review ──────────────────────────────
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
        console.log(`  ✅ Seeded payment review for order ${order.id}`)
      }
    } catch (err) {
      console.error(`  ❌ Failed to seed order ${order.id}:`, err)
    }
  }

  const ordersCount = await prisma.order.count()
  const reviewsCount = await prisma.paymentReview.count()
  const usersCount = await prisma.user.count()
  console.log(
    `\nSummary: ${usersCount} users, ${ordersCount} orders, ${reviewsCount} payment reviews`
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
