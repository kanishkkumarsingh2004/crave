import assert from 'node:assert/strict'
import test from 'node:test'
import { prisma } from '../lib/prisma'
import {
  createDriverPayoutIfWithinBalance,
  getDriverAvailableBalance,
  listPendingDriverPayouts,
  updateDriverPayoutStatus,
} from '../lib/dal/payments'
import { hashPassword } from '../lib/password'

/**
 * Driver payout rules: a rider can only withdraw what they actually earned,
 * a pending request reserves the money so it cannot be requested twice, and
 * an admin approves the request before it is paid.
 *
 * Run with:  ALLOW_DATABASE_TESTS=true pnpm test:db
 */

const dbEnabled = process.env.ALLOW_DATABASE_TESTS === 'true' && Boolean(prisma)

async function seedRiderFixture(suffix: string) {
  const riderId = `payout_rider_${suffix}`

  await prisma.user.create({
    data: {
      id: riderId,
      name: 'Payout Rider',
      email: `payout-${suffix}@example.invalid`,
      role: 'rider',
      password_hash: hashPassword('PayoutRider@123'),
    },
  })

  // Two delivered deliveries worth 5000 paise (₹50) each.
  for (let index = 0; index < 2; index += 1) {
    await prisma.order.create({
      data: {
        id: `payout_order_${suffix}_${index}`,
        customer_name: 'Payout Customer',
        restaurant_name: 'Payout Kitchen',
        items: [{ name: 'Dish', quantity: 1, price: 200 }],
        subtotal: 200,
        total_amount: 240,
        status: 'delivered',
        payment_status: 'verified',
        rider_id: riderId,
        tip: 10,
        financial_snapshot: { riderPayablePaise: 5000, riderTipPaise: 1000 },
      },
    })
  }

  return riderId
}

async function cleanupRiderFixture(riderId: string) {
  await prisma.order.deleteMany({ where: { rider_id: riderId } })
  await prisma.driverPayout.deleteMany({ where: { driver_id: riderId } })
  await prisma.user.deleteMany({ where: { id: riderId } })
}

test(
  'a rider earns the rider-payable amount from their delivered orders',
  { skip: !dbEnabled },
  async () => {
    const riderId = await seedRiderFixture('balance')
    try {
      const balance = await getDriverAvailableBalance(riderId)
      assert.equal(balance, 100)
    } finally {
      await cleanupRiderFixture(riderId)
    }
  }
)

test('a payout beyond the available balance is refused', { skip: !dbEnabled }, async () => {
  const riderId = await seedRiderFixture('overdraw')
  try {
    await assert.rejects(
      createDriverPayoutIfWithinBalance({
        id: 'payout_overdraw_1',
        driver_id: riderId,
        amount: 500,
        status: 'pending',
      }),
      /Insufficient available balance/
    )
  } finally {
    await cleanupRiderFixture(riderId)
  }
})

test(
  'a pending request reserves the money so it cannot be taken twice',
  { skip: !dbEnabled },
  async () => {
    const riderId = await seedRiderFixture('reserve')
    try {
      await createDriverPayoutIfWithinBalance({
        id: 'payout_reserve_1',
        driver_id: riderId,
        amount: 80,
        status: 'pending',
      })

      assert.equal(await getDriverAvailableBalance(riderId), 20)

      await assert.rejects(
        createDriverPayoutIfWithinBalance({
          id: 'payout_reserve_2',
          driver_id: riderId,
          amount: 40,
          status: 'pending',
        }),
        /Insufficient available balance/
      )
    } finally {
      await cleanupRiderFixture(riderId)
    }
  }
)

test('a rejected request releases the reserved money again', { skip: !dbEnabled }, async () => {
  const riderId = await seedRiderFixture('release')
  try {
    await createDriverPayoutIfWithinBalance({
      id: 'payout_release_1',
      driver_id: riderId,
      amount: 80,
      status: 'pending',
    })
    assert.equal(await getDriverAvailableBalance(riderId), 20)

    await updateDriverPayoutStatus('payout_release_1', 'failed')
    assert.equal(await getDriverAvailableBalance(riderId), 100)
  } finally {
    await cleanupRiderFixture(riderId)
  }
})

test(
  'an approved request leaves the wallet and shows up in the admin queue',
  { skip: !dbEnabled },
  async () => {
    const riderId = await seedRiderFixture('approve')
    try {
      await createDriverPayoutIfWithinBalance({
        id: 'payout_approve_1',
        driver_id: riderId,
        amount: 60,
        status: 'pending',
      })

      const pending = await listPendingDriverPayouts()
      assert.ok(
        pending.some((payout: any) => payout.id === 'payout_approve_1'),
        'the request must be waiting for an admin'
      )

      await updateDriverPayoutStatus('payout_approve_1', 'paid', 'UPI_TEST_1')
      assert.equal(await getDriverAvailableBalance(riderId), 40)

      const stillPending = await listPendingDriverPayouts()
      assert.equal(
        stillPending.some((payout: any) => payout.id === 'payout_approve_1'),
        false
      )
    } finally {
      await cleanupRiderFixture(riderId)
    }
  }
)
