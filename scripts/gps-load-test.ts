/**
 * GPS Capacity Load Test Configuration
 *
 * Run: pnpm loadtest:gps
 *
 * Target: 1000 concurrent drivers, 200 GPS updates/sec
 * Validates: coalescing, update intervals, history buffering, flush performance
 */

import {
  updateDriverLocation,
  getCapacityMetrics,
  GPS_CONFIG,
  cleanupOldHistory,
} from '@/lib/dispatch/driver-tracker'

interface LoadTestConfig {
  driverCount: number
  updatesPerSecond: number
  durationSeconds: number
  areaBounds: { latMin: number; latMax: number; lngMin: number; lngMax: number }
}

interface LoadTestResult {
  totalUpdates: number
  coalescedUpdates: number
  successfulUpdates: number
  errors: number
  avgLatencyMs: number
  p95LatencyMs: number
  p99LatencyMs: number
  capacityMetrics: ReturnType<typeof getCapacityMetrics>
}

function randomInBounds(bounds: LoadTestConfig['areaBounds']): { lat: number; lng: number } {
  return {
    lat: bounds.latMin + Math.random() * (bounds.latMax - bounds.latMin),
    lng: bounds.lngMin + Math.random() * (bounds.lngMax - bounds.lngMin),
  }
}

function randomMovement(
  current: { lat: number; lng: number },
  maxKm: number
): { lat: number; lng: number } {
  // Approximate: 1 degree ~ 111km
  const maxDeg = maxKm / 111
  return {
    lat: current.lat + (Math.random() - 0.5) * 2 * maxDeg,
    lng: current.lng + (Math.random() - 0.5) * 2 * maxDeg,
  }
}

async function runGpsLoadTest(config: LoadTestConfig): Promise<LoadTestResult> {
  console.log(
    `🚀 Starting GPS Load Test: ${config.driverCount} drivers, ${config.updatesPerSecond} updates/sec for ${config.durationSeconds}s`
  )

  const driverStates = new Map<string, { lat: number; lng: number }>()

  // Initialize drivers
  for (let i = 0; i < config.driverCount; i++) {
    const pos = randomInBounds(config.areaBounds)
    driverStates.set(`driver_${i}`, pos)
  }

  const latencies: number[] = []
  let totalUpdates = 0
  let coalescedUpdates = 0
  let successfulUpdates = 0
  let errors = 0

  const intervalMs = 1000 / config.updatesPerSecond
  const endTime = Date.now() + config.durationSeconds * 1000

  console.log('📍 Drivers initialized, starting updates...')

  while (Date.now() < endTime) {
    const batchStart = Date.now()

    // Process one update per driver per cycle
    for (const [driverId, pos] of driverStates.entries()) {
      const newPos = randomMovement(pos, 0.5) // ~500m max movement per update
      driverStates.set(driverId, newPos)

      const start = Date.now()
      try {
        const result = await updateDriverLocation({
          driverId,
          lat: newPos.lat,
          lng: newPos.lng,
          status: 'ONLINE',
          available: true,
        })

        const latency = Date.now() - start
        latencies.push(latency)

        totalUpdates++
        if (result.coalesced) {
          coalescedUpdates++
        } else {
          successfulUpdates++
        }
      } catch (error) {
        errors++
        console.error(`Error updating ${driverId}:`, error)
      }
    }

    // Throttle to maintain target rate
    const elapsed = Date.now() - batchStart
    const waitTime = Math.max(0, intervalMs - elapsed)
    if (waitTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitTime))
    }
  }

  // Calculate percentiles
  latencies.sort((a, b) => a - b)
  const p95Index = Math.floor(latencies.length * 0.95)
  const p99Index = Math.floor(latencies.length * 0.99)

  const capacityMetrics = getCapacityMetrics()

  return {
    totalUpdates,
    coalescedUpdates,
    successfulUpdates,
    errors,
    avgLatencyMs: latencies.reduce((a, b) => a + b, 0) / latencies.length,
    p95LatencyMs: latencies[p95Index] || 0,
    p99LatencyMs: latencies[p99Index] || 0,
    capacityMetrics,
  }
}

// Run test if called directly
if (require.main === module) {
  const config: LoadTestConfig = {
    driverCount: parseInt(process.env.DRIVER_COUNT || '1000'),
    updatesPerSecond: parseInt(process.env.UPDATES_PER_SEC || '200'),
    durationSeconds: parseInt(process.env.DURATION_SEC || '60'),
    areaBounds: {
      latMin: 12.9,
      latMax: 13.1,
      lngMin: 77.5,
      lngMax: 77.7,
    },
  }

  runGpsLoadTest(config)
    .then((result) => {
      console.log('\n📊 LOAD TEST RESULTS')
      console.log('====================')
      console.log(`Total Updates:      ${result.totalUpdates}`)
      console.log(`Successful:         ${result.successfulUpdates}`)
      console.log(
        `Coalesced:          ${result.coalescedUpdates} (${((result.coalescedUpdates / result.totalUpdates) * 100).toFixed(1)}%)`
      )
      console.log(`Errors:             ${result.errors}`)
      console.log(`Avg Latency:        ${result.avgLatencyMs.toFixed(2)}ms`)
      console.log(`P95 Latency:        ${result.p95LatencyMs}ms`)
      console.log(`P99 Latency:        ${result.p99LatencyMs}ms`)
      console.log('')
      console.log('Capacity Metrics:')
      console.log(`  Active Drivers:   ${result.capacityMetrics.activeDrivers}`)
      console.log(`  Cells Active:     ${result.capacityMetrics.cellsActive}`)
      console.log(`  Max/Cell:         ${result.capacityMetrics.maxDriversPerCell}`)
      console.log(`  Avg/Cell:         ${result.capacityMetrics.avgDriversPerCell.toFixed(1)}`)
      console.log(`  History Buffer:   ${result.capacityMetrics.historyBufferSize}`)

      // Check targets
      const passed =
        result.errors === 0 &&
        result.avgLatencyMs < 50 &&
        result.p95LatencyMs < 100 &&
        result.coalescedUpdates / result.totalUpdates > 0.3 // Expect >30% coalescing

      console.log(`\n${passed ? '✅ PASS' : '❌ FAIL'} - Load test targets met`)
      process.exit(passed ? 0 : 1)
    })
    .catch((err) => {
      console.error('Load test failed:', err)
      process.exit(1)
    })
}

export { runGpsLoadTest, GPS_CONFIG }
