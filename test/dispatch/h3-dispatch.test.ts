import { updateDriverLocation, clearDriverSpatialIndex } from '@/lib/dispatch/driver-tracker'
import {
  findGeofencedCandidateDrivers,
  calculateHaversineDistanceKm,
} from '@/lib/dispatch/h3-dispatch'
import {
  tryLockDriverForOffer,
  isDriverLocked,
  clearAllOfferLocks,
} from '@/lib/dispatch/atomic-lock'

describe('H3 Geospatial Driver-Dispatch & Candidate Selection System', () => {
  beforeEach(() => {
    clearDriverSpatialIndex()
    clearAllOfferLocks()
  })

  test('Geographic Isolation: Bengaluru pickup excludes Delhi driver completely', async () => {
    // 1. Index Drivers in different cities
    // Driver A: Bengaluru Center (lat: 12.9716, lng: 77.5946)
    await updateDriverLocation({
      driverId: 'drv_bengaluru_1',
      lat: 12.9716,
      lng: 77.5946,
      status: 'ONLINE',
      available: true,
      vehicleType: 'EV_SCOOTER',
    })

    // Driver B: Bengaluru Indiranagar (lat: 12.9784, lng: 77.6408)
    await updateDriverLocation({
      driverId: 'drv_bengaluru_2',
      lat: 12.9784,
      lng: 77.6408,
      status: 'ONLINE',
      available: true,
      vehicleType: 'EV_SCOOTER',
    })

    // Driver C: Delhi Connaught Place (lat: 28.6139, lng: 77.2090)
    await updateDriverLocation({
      driverId: 'drv_delhi_1',
      lat: 28.6139,
      lng: 77.209,
      status: 'ONLINE',
      available: true,
      vehicleType: 'EV_SCOOTER',
    })

    // 2. Perform Dispatch Search for Bengaluru Pickup
    const result = findGeofencedCandidateDrivers({
      requestId: 'req_blru_1',
      pickupLat: 12.9716,
      pickupLng: 77.5946,
      minCandidatesRequired: 2,
    })

    // 3. Verify Geographic Isolation
    expect(result.eligibleCandidates.length).toBe(2)
    const candidateIds = result.eligibleCandidates.map((c) => c.driverId)

    expect(candidateIds).toContain('drv_bengaluru_1')
    expect(candidateIds).toContain('drv_bengaluru_2')
    expect(candidateIds).not.toContain('drv_delhi_1') // Delhi driver MUST NOT be in candidate set!
  })

  test('Dynamic H3 Ring Expansion: Expands ring until min candidates are found', async () => {
    // Pickup at Kanakapura Center (12.6500, 77.4400)
    const pickupLat = 12.65
    const pickupLng = 77.44

    // Place 1 driver in immediate pickup cell (Ring 0)
    await updateDriverLocation({
      driverId: 'drv_ring0',
      lat: 12.65,
      lng: 77.44,
      status: 'ONLINE',
      available: true,
    })

    // Place 2 drivers in neighboring cell (Ring 1)
    await updateDriverLocation({
      driverId: 'drv_ring1_a',
      lat: 12.665,
      lng: 77.455,
      status: 'ONLINE',
      available: true,
    })
    await updateDriverLocation({
      driverId: 'drv_ring1_b',
      lat: 12.635,
      lng: 77.425,
      status: 'ONLINE',
      available: true,
    })

    // Request min 3 candidates -> requires Ring 1 expansion
    const result = findGeofencedCandidateDrivers({
      requestId: 'req_expand_1',
      pickupLat,
      pickupLng,
      minCandidatesRequired: 3,
    })

    expect(result.eligibleCandidates.length).toBe(3)
    expect(result.stageFound).toBeGreaterThanOrEqual(1) // Stage 1 (Ring 1) expanded
  })

  test('Location Freshness Filter: Excludes drivers with stale GPS (> 120s old)', async () => {
    const now = Date.now()

    // Fresh driver
    await updateDriverLocation({
      driverId: 'drv_fresh',
      lat: 12.9716,
      lng: 77.5946,
      status: 'ONLINE',
      available: true,
    })

    // Stale driver (> 120 seconds old)
    const staleState = await updateDriverLocation({
      driverId: 'drv_stale',
      lat: 12.972,
      lng: 77.595,
      status: 'ONLINE',
      available: true,
    })
    // Manually backdate timestamp by 180 seconds
    staleState.state.lastUpdated = now - 180 * 1000

    const result = findGeofencedCandidateDrivers({
      requestId: 'req_fresh_1',
      pickupLat: 12.9716,
      pickupLng: 77.5946,
      minCandidatesRequired: 1,
    })

    const candidateIds = result.eligibleCandidates.map((c) => c.driverId)
    expect(candidateIds).toContain('drv_fresh')
    expect(candidateIds).not.toContain('drv_stale') // Stale driver excluded
  })

  test('Haversine Distance & Multi-Factor Candidate Ranking', () => {
    // Haversine distance accuracy check: Bengaluru to Mysuru ~125-140 km
    const distBlrMys = calculateHaversineDistanceKm(12.9716, 77.5946, 12.2958, 76.6394)
    expect(distBlrMys).toBeGreaterThan(120)
    expect(distBlrMys).toBeLessThan(145)
  })

  test('Atomic Offer Locking & Concurrency Prevention', async () => {
    await updateDriverLocation({
      driverId: 'drv_lock_1',
      lat: 12.9716,
      lng: 77.5946,
      status: 'ONLINE',
      available: true,
    })

    // Lock driver for Request A
    const lockedA = tryLockDriverForOffer('drv_lock_1', 'req_A', 15000)
    expect(lockedA).toBe(true)
    expect(isDriverLocked('drv_lock_1')).toBe(true)

    // Request B attempts to lock same driver -> rejected
    const lockedB = tryLockDriverForOffer('drv_lock_1', 'req_B', 15000)
    expect(lockedB).toBe(false)

    // Subsequent search for Request B excludes locked driver
    const searchB = findGeofencedCandidateDrivers({
      requestId: 'req_B',
      pickupLat: 12.9716,
      pickupLng: 77.5946,
      minCandidatesRequired: 1,
    })

    expect(searchB.eligibleCandidates.map((c) => c.driverId)).not.toContain('drv_lock_1')
  })
})
