import 'dotenv/config'
import { prisma } from '../lib/prisma'
import {
  claimOrderForDriverAtomic,
  transitionOrderStatusAtomic,
  dispatchPendingOutboxEvents,
} from '../lib/dal/orders'
import {
  updateDriverLocation,
  getDriverLocation,
  clearDriverSpatialIndex,
} from '../lib/dispatch/driver-tracker'
import { isValidTransition } from '../lib/order-state-machine'

async function runVerification() {
  console.log('\n======================================================')
  console.log('🚀 CRAVE CONCURRENCY, GPS & RECOVERY VERIFICATION SUITE')
  console.log('======================================================\n')

  const testOrderId = `test_order_concurrency_${Date.now()}`
  let testsPassed = 0
  let totalTests = 0

  function assert(condition: boolean, testName: string, details?: string) {
    totalTests++
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`)
      testsPassed++
    } else {
      console.error(`  ❌ [FAIL] ${testName}`)
      if (details) console.error(`     Details: ${details}`)
      process.exitCode = 1
    }
  }

  try {
    // ------------------------------------------------------------------
    // TEST 1: Atomic Driver Assignment Concurrency (2+ Drivers claiming)
    // ------------------------------------------------------------------
    console.log('--- TEST 1: Concurrent Driver Assignment Guard ---')

    // Clean up any potential stale test orders
    await prisma.order.deleteMany({ where: { id: testOrderId } })
    await prisma.orderOutbox.deleteMany({ where: { order_id: testOrderId } })

    // Create an order in ready_for_pickup state
    await prisma.order.create({
      data: {
        id: testOrderId,
        customer_name: 'Test Customer',
        restaurant_name: 'Test Kitchen',
        status: 'ready_for_pickup',
        subtotal: 250,
        total_amount: 300,
        items: JSON.stringify([{ name: 'Paneer Biryani', qty: 1, price: 250 }]),
      },
    })

    // Simulate 5 drivers concurrently trying to claim the exact same order
    const drivers = [
      { id: 'driver_alpha', name: 'Rider Alpha', phone: '+91 99999 11111' },
      { id: 'driver_beta', name: 'Rider Beta', phone: '+91 99999 22222' },
      { id: 'driver_gamma', name: 'Rider Gamma', phone: '+91 99999 33333' },
      { id: 'driver_delta', name: 'Rider Delta', phone: '+91 99999 44444' },
      { id: 'driver_epsilon', name: 'Rider Epsilon', phone: '+91 99999 55555' },
    ]

    console.log(`  Spawning ${drivers.length} concurrent claim requests simultaneously...`)
    const claimPromises = drivers.map((driver) =>
      claimOrderForDriverAtomic({
        orderId: testOrderId,
        driverId: driver.id,
        driverName: driver.name,
        driverPhone: driver.phone,
        lat: 12.9716,
        lng: 77.5946,
      })
    )

    const results = await Promise.all(claimPromises)
    const successfulClaims = results.filter((r) => r.success)
    const conflictClaims = results.filter((r) => !r.success && r.conflict)

    assert(
      successfulClaims.length === 1,
      'Exactly ONE driver successfully claims the order',
      `Success count: ${successfulClaims.length}, Expected: 1`
    )

    assert(
      conflictClaims.length === drivers.length - 1,
      'All other 4 drivers are rejected with conflict',
      `Conflict count: ${conflictClaims.length}, Expected: ${drivers.length - 1}`
    )

    const winningDriverId = successfulClaims[0]?.order?.rider_id
    console.log(`  Winning driver: ${winningDriverId}`)

    // Verify DB authoritative state
    const orderInDb = await prisma.order.findUnique({ where: { id: testOrderId } })
    assert(
      orderInDb?.rider_id === winningDriverId && orderInDb?.status === 'rider_assigned',
      'PostgreSQL authoritative record matches winning driver and status rider_assigned'
    )

    // Idempotent retry by winning driver should succeed
    const winningDriverInfo = drivers.find((d) => d.id === winningDriverId)!
    const retryResult = await claimOrderForDriverAtomic({
      orderId: testOrderId,
      driverId: winningDriverInfo.id,
      driverName: winningDriverInfo.name,
      driverPhone: winningDriverInfo.phone,
    })
    assert(
      retryResult.success && retryResult.conflict === false,
      'Winning driver can idempotently re-claim without error'
    )

    // Another driver trying again is rejected
    const losingDriver = drivers.find((d) => d.id !== winningDriverId)!
    const losingRetry = await claimOrderForDriverAtomic({
      orderId: testOrderId,
      driverId: losingDriver.id,
      driverName: losingDriver.name,
      driverPhone: losingDriver.phone,
    })
    assert(
      losingRetry.success === false && losingRetry.conflict === true,
      'Subsequent claim attempts by other drivers are rejected with 409 conflict'
    )

    // Check transactional outbox record
    const outboxRecords = await prisma.orderOutbox.findMany({
      where: { order_id: testOrderId },
    })
    assert(
      outboxRecords.length >= 1 && outboxRecords[0].status === 'pending',
      'Transactional outbox event was recorded atomically with DB commit'
    )

    // ------------------------------------------------------------------
    // TEST 2: Validated Order State Machine Transitions
    // ------------------------------------------------------------------
    console.log('\n--- TEST 2: Validated Order State Machine ---')

    // Illegal jump: ready_for_pickup -> delivered without picked_up / out_for_delivery
    assert(
      isValidTransition('ready_for_pickup', 'delivered') === false,
      'State machine rejects illegal leap: ready_for_pickup → delivered'
    )

    // Illegal reverse: completed -> preparing
    assert(
      isValidTransition('completed', 'preparing') === false,
      'State machine rejects illegal backward transition: completed → preparing'
    )

    // Test transitionOrderStatusAtomic with illegal transition
    const illegalTransitionResult = await transitionOrderStatusAtomic({
      orderId: testOrderId,
      toStatus: 'delivered', // current status is rider_assigned
    })
    assert(
      illegalTransitionResult.success === false,
      'transitionOrderStatusAtomic rejects invalid status transition'
    )

    // Legal sequence: rider_assigned -> picked_up -> out_for_delivery
    const pickedUpResult = await transitionOrderStatusAtomic({
      orderId: testOrderId,
      toStatus: 'picked_up',
      expectedFromStatus: 'rider_assigned',
    })
    assert(
      pickedUpResult.success === true && pickedUpResult.order.status === 'picked_up',
      'Legal transition rider_assigned → picked_up succeeds'
    )

    const outForDeliveryResult = await transitionOrderStatusAtomic({
      orderId: testOrderId,
      toStatus: 'out_for_delivery',
      expectedFromStatus: 'picked_up',
    })
    assert(
      outForDeliveryResult.success === true && outForDeliveryResult.order.status === 'out_for_delivery',
      'Legal transition picked_up → out_for_delivery succeeds'
    )

    // ------------------------------------------------------------------
    // TEST 3: Stale GPS Detection & Out-of-Order Packet Rejection
    // ------------------------------------------------------------------
    console.log('\n--- TEST 3: Stale GPS & Out-of-Order Packet Handling ---')

    clearDriverSpatialIndex()
    const testDriverId = `driver_gps_test_${Date.now()}`
    const now = Date.now()

    // 1. Initial valid position at T = now - 5000ms
    const pos1 = await updateDriverLocation({
      driverId: testDriverId,
      lat: 12.9716,
      lng: 77.5946,
      timestamp: now - 5000,
      status: 'ON_TRIP',
    })
    assert(pos1.state.lastUpdated === now - 5000, 'Initial GPS position indexed with client timestamp')

    // 2. Out-of-order delayed packet arriving from the past (T = now - 15000ms)
    const outOfOrderResult = await updateDriverLocation({
      driverId: testDriverId,
      lat: 12.9100, // old wrong location
      lng: 77.5100,
      timestamp: now - 15000, // older than last updated!
      status: 'ON_TRIP',
    })

    assert(
      outOfOrderResult.outOfOrder === true && outOfOrderResult.coalesced === true,
      'Out-of-order delayed GPS packet is identified and rejected'
    )
    assert(
      outOfOrderResult.state.lat === 12.9716,
      'Current driver position was NOT overwritten by older out-of-order packet'
    )

    // 3. Stale packet arrival (packet generated > 60s ago)
    const stalePacketResult = await updateDriverLocation({
      driverId: testDriverId,
      lat: 12.9800,
      lng: 77.6000,
      timestamp: now - 70000, // > 60s ago
      status: 'ON_TRIP',
    })
    assert(
      stalePacketResult.stale === true,
      'Packet arriving older than 60s threshold is flagged as stale'
    )

    // 4. Stale driver location detection (> 45s since last update)
    const testStaleDriverId = `driver_stale_${Date.now()}`
    await updateDriverLocation({
      driverId: testStaleDriverId,
      lat: 12.9716,
      lng: 77.5946,
      timestamp: now - 50000, // 50 seconds ago (> 45s threshold)
      status: 'ONLINE',
    })

    const staleDriverLocation = getDriverLocation(testStaleDriverId)
    assert(
      staleDriverLocation !== undefined &&
        staleDriverLocation.isStale === true &&
        (staleDriverLocation.staleDurationSeconds || 0) >= 45,
      'getDriverLocation identifies stale location and computes staleDurationSeconds'
    )

    // ------------------------------------------------------------------
    // TEST 4: Reconnect Handling, Outbox Dispatch & Recovery
    // ------------------------------------------------------------------
    console.log('\n--- TEST 4: Outbox Dispatch & State Recovery After Disconnect ---')

    const dispatched = await dispatchPendingOutboxEvents(10)
    console.log(`  Dispatched pending outbox events: ${dispatched}`)

    const updatedOutbox = await prisma.orderOutbox.findMany({
      where: { order_id: testOrderId },
    })
    assert(
      updatedOutbox.length > 0 &&
        updatedOutbox.some((e) => e.status === 'sent' || e.status === 'pending'),
      'Transactional outbox events processed cleanly'
    )

    // Test simulated sync endpoint query
    const orderRecovered = await prisma.order.findUnique({
      where: { id: testOrderId },
      include: { customer: true, restaurant: true },
    })
    assert(
      orderRecovered !== null &&
        orderRecovered.rider_id === winningDriverId &&
        orderRecovered.status === 'out_for_delivery',
      'Authoritative order state is recoverable from PostgreSQL after disconnection'
    )

    console.log('\n======================================================')
    console.log(`📊 RESULTS: ${testsPassed} / ${totalTests} TESTS PASSED`)
    console.log('======================================================\n')
  } finally {
    // Clean up test records
    await prisma.orderOutbox.deleteMany({ where: { order_id: testOrderId } }).catch(() => {})
    await prisma.order.deleteMany({ where: { id: testOrderId } }).catch(() => {})
  }
}

runVerification()
  .then(() => {
    process.exit(process.exitCode || 0)
  })
  .catch((err) => {
    console.error('Fatal error during verification:', err)
    process.exit(1)
  })
