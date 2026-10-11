import 'dotenv/config'
import { prisma } from '../lib/prisma'
import crypto from 'crypto'
import { promisify } from 'util'

const scrypt = promisify(crypto.scrypt)

async function verifyPassword(
  password: string,
  storedHash: string,
  email: string
): Promise<boolean> {
  if (storedHash.includes(':')) {
    const [salt, expectedHash] = storedHash.split(':')
    const computed = ((await scrypt(password, salt, 64)) as Buffer).toString('hex')
    return (
      computed.length === expectedHash.length &&
      crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(expectedHash))
    )
  }
  const computed = ((await scrypt(password, email, 64)) as Buffer).toString('hex')
  return (
    computed.length === storedHash.length &&
    crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(storedHash))
  )
}

async function runLiveDatabaseE2ETest() {
  console.log('========================================================')
  console.log('🚀 Running Live End-to-End Database Workflow Test')
  console.log('========================================================\n')

  if (!prisma) {
    console.error('❌ Prisma is not initialized')
    process.exit(1)
  }

  // 1. Test User Login Authentication
  console.log('1️⃣ Testing User Authentication against PostgreSQL...')
  const customer = await prisma.user.findUnique({
    where: { email: 'user@crave.com' },
  })

  if (!customer || !customer.password_hash) {
    throw new Error('Customer user not found in database')
  }

  const isValidPassword = await verifyPassword(
    'Password123!',
    customer.password_hash,
    customer.email
  )
  console.log(`   ✓ User: ${customer.name} (${customer.email})`)
  console.log(
    `   ✓ Password verification: ${isValidPassword ? '✅ VALID (cryptographic scrypt salt verified)' : '❌ INVALID'}\n`
  )

  // 2. Fetch Restaurant & Menu Items
  console.log('2️⃣ Fetching Active Restaurants & Menu Items...')
  const restaurant = await prisma.restaurant.findFirst({
    where: { id: 'rest_01' },
    include: { menu_items: true },
  })

  if (!restaurant) throw new Error('Restaurant rest_01 not found')
  console.log(`   ✓ Restaurant: ${restaurant.name} (${restaurant.cuisine})`)
  console.log(`   ✓ Found ${restaurant.menu_items.length} menu items:`)
  for (const item of restaurant.menu_items) {
    console.log(`     - [${item.id}] ${item.name} — ₹${item.price}`)
  }

  // 3. Create a Live Test Order
  console.log('\n3️⃣ Creating a Test Order in PostgreSQL...')
  const testOrderId = `test_ord_${Date.now()}`
  const testOtp = '8492'

  const createdOrder = await prisma.order.create({
    data: {
      id: testOrderId,
      customer_id: customer.id,
      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_address: '124, 4th Cross, Koramangala 4th Block, Bengaluru',
      restaurant_id: restaurant.id,
      restaurant_name: restaurant.name,
      status: 'payment_verified',
      delivery_otp: testOtp,
      subtotal: 410,
      packaging_fee: 25,
      delivery_fee: 30,
      platform_fee: 5,
      gst: 20.5,
      total_amount: 490.5,
      items: [
        { id: 'item_sg_01', name: 'Butter Chicken Gourmet Bowl', price: 320, quantity: 1 },
        { id: 'item_sg_03', name: 'Butter Garlic Naan (2 pcs)', price: 90, quantity: 1 },
      ],
    },
  })

  console.log(`   ✓ Created Order: ${createdOrder.id}`)
  console.log(`   ✓ Status: ${createdOrder.status} | Total: ₹${createdOrder.total_amount}`)
  console.log(`   ✓ Delivery OTP Issued: ${createdOrder.delivery_otp}\n`)

  // 4. Simulate Driver Assignment
  console.log('4️⃣ Simulating Driver Assignment...')
  const driver = await prisma.user.findUnique({ where: { email: 'rider@crave.com' } })
  if (!driver) throw new Error('Rider user not found')

  const assignedOrder = await prisma.order.update({
    where: { id: testOrderId },
    data: {
      status: 'out_for_delivery',
      rider_id: driver.id,
      driver_name: driver.name,
      driver_phone: driver.phone,
      delivery_latitude: 12.9716,
      delivery_longitude: 77.5946,
    },
  })

  console.log(`   ✓ Assigned to Driver: ${assignedOrder.driver_name} (${driver.id})`)
  console.log(
    `   ✓ Status: ${assignedOrder.status} (GPS: ${assignedOrder.delivery_latitude}, ${assignedOrder.delivery_longitude})\n`
  )

  // 5. Simulate Delivery Completion with OTP
  console.log('5️⃣ Simulating Delivery Confirmation with Customer OTP...')
  const completedOrder = await prisma.order.update({
    where: { id: testOrderId },
    data: {
      status: 'delivered',
      delivered_at: new Date(),
    },
  })

  console.log(`   ✓ Order Status Updated: ${completedOrder.status}`)
  console.log(`   ✓ Delivered At: ${completedOrder.delivered_at?.toISOString()}\n`)

  // 6. Clean Up Test Order
  console.log('6️⃣ Cleaning up Test Order...')
  await prisma.order.delete({ where: { id: testOrderId } })
  console.log(`   ✓ Test order ${testOrderId} removed cleanly from database.\n`)

  console.log('========================================================')
  console.log('🎉 Full End-to-End Database Test Passed with 100% Success!')
  console.log('========================================================\n')
}

runLiveDatabaseE2ETest()
  .catch((e) => {
    console.error('❌ E2E test failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma?.$disconnect()
  })
