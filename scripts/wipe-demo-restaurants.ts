import 'dotenv/config'
import { prisma } from '../lib/prisma'

const DEMO_REST_IDS = ['rest_01', 'rest_02', 'rest_03', 'rest_04', 'rest_05', 'rest_06']

async function wipeDemoRestaurants() {
  if (!prisma) {
    console.error('❌ Database connection not initialized.')
    process.exit(1)
  }

  console.log('🧹 Wiping demo restaurants and associated fake catalog data...')

  await prisma.$transaction(async (tx) => {
    // 1. Find all demo orders referencing these demo restaurants
    const demoOrders = await tx.order.findMany({
      where: { restaurant_id: { in: DEMO_REST_IDS } },
      select: { id: true },
    })
    const demoOrderIds = demoOrders.map((o) => o.id)

    if (demoOrderIds.length > 0) {
      console.log(`  Deleting ${demoOrderIds.length} orders referencing demo restaurants...`)
      await tx.orderOutbox.deleteMany({ where: { order_id: { in: demoOrderIds } } })
      await tx.paymentReview.deleteMany({ where: { order_id: { in: demoOrderIds } } })
      await tx.refund.deleteMany({ where: { order_id: { in: demoOrderIds } } })
      await tx.paymentTransaction.deleteMany({ where: { order_id: { in: demoOrderIds } } })
      await tx.ledgerEntry.deleteMany({ where: { order_id: { in: demoOrderIds } } })
      await tx.order.deleteMany({ where: { id: { in: demoOrderIds } } })
    }

    // Also clear settlements referencing demo restaurants directly
    await tx.vendorSettlement.deleteMany({
      where: { restaurant_id: { in: DEMO_REST_IDS } },
    })

    // 2. Menu Item Variants and Menu Items
    console.log('  Deleting menu item variants and menu items...')
    const items = await tx.menuItem.findMany({
      where: { restaurant_id: { in: DEMO_REST_IDS } },
      select: { id: true },
    })
    const itemIds = items.map((i) => i.id)

    if (itemIds.length > 0) {
      await tx.menuItemVariant.deleteMany({
        where: { menu_item_id: { in: itemIds } },
      })
      await tx.menuItem.deleteMany({
        where: { id: { in: itemIds } },
      })
    }

    // 3. Commercial Contracts
    await tx.commercialContract.deleteMany({
      where: { restaurant_id: { in: DEMO_REST_IDS } },
    })

    // 4. Coupon Restaurant Relations
    await tx.couponRestaurant.deleteMany({
      where: { restaurant_id: { in: DEMO_REST_IDS } },
    })

    // 5. Razorpay Linked Accounts
    await tx.razorpayLinkedAccount.deleteMany({
      where: {
        entity_type: 'RESTAURANT',
        entity_id: { in: DEMO_REST_IDS },
      },
    })

    // 6. Picker Metrics
    await tx.pickerMetric.deleteMany({
      where: { restaurant_id: { in: DEMO_REST_IDS } },
    })

    // 7. Restaurants
    const deleteRes = await tx.restaurant.deleteMany({
      where: { id: { in: DEMO_REST_IDS } },
    })

    console.log(`✅ Successfully wiped ${deleteRes.count} demo restaurants!`)
  })

  // Verify remaining restaurants
  const remaining = await prisma.restaurant.findMany({
    select: { id: true, name: true, is_dark_store: true, owner_id: true },
  })
  console.log('\nRemaining Restaurants in Database:')
  console.table(remaining)

  await prisma.$disconnect()
}

wipeDemoRestaurants().catch((err) => {
  console.error('❌ Wipe failed:', err)
  process.exit(1)
})
