import * as h3 from 'h3-js'
import { prisma } from '@/lib/prisma'
import { redis, isRedisAvailable } from '@/lib/redis'

export interface DriverLocationState {
  driverId: string
  name: string
  phone: string
  vehicleType: string
  status: 'ONLINE' | 'OFFLINE' | 'ON_TRIP'
  available: boolean
  lat: number
  lng: number
  h3Cell: string
  resolution: number
  lastUpdated: number // Unix timestamp (ms)
}

// GPS Capacity Configuration
export const GPS_CONFIG = {
  // Update interval - drivers should send updates at most this frequently
  UPDATE_INTERVAL_MS: 5000, // 5 seconds minimum between updates

  // Position coalescing - if driver moves less than this distance, ignore update
  MIN_MOVE_DISTANCE_M: 20, // 20 meters minimum movement

  // Retention policies
  CURRENT_LOCATION_TTL_MS: 120 * 1000, // 2 minutes for current location
  HISTORY_RETENTION_DAYS: 7, // Keep history for 7 days
  HISTORY_BATCH_SIZE: 100, // Batch size for history writes

  // Capacity limits
  MAX_DRIVERS_PER_CELL: 100, // Max drivers per H3 cell
  MAX_HISTORY_POINTS_PER_DRIVER: 1000, // Max history points per driver

  // Load test targets
  TARGET_DRIVERS: 1000, // Target concurrent drivers
  TARGET_UPDATES_PER_SEC: 200, // Target GPS updates per second
} as const

// In-memory Spatial Index Cache (High-Performance Layer, fallback for Redis)
const driverSpatialIndex = new Map<string, DriverLocationState>()

// Secondary H3 Cell Inverted Index: h3Cell -> Set of driverIds
const cellToDriverMap = new Map<string, Set<string>>()

// Position history buffer (driverId -> position history array)
const positionHistoryBuffer = new Map<
  string,
  Array<{ lat: number; lng: number; ts: number; h3Cell: string }>
>()

// History flush timer
let historyFlushTimer: NodeJS.Timeout | null = null

export const DEFAULT_H3_RESOLUTION = 8 // ~0.737 km² per cell, ~461m edge length
export const DEFAULT_MAX_LOCATION_AGE_MS = 120 * 1000 // 120 seconds threshold

/**
 * Update a driver's GPS location and re-index into H3 Spatial Cell
 * Includes position coalescing, update interval enforcement, and history buffering
 */
export async function updateDriverLocation(params: {
  driverId: string
  lat: number
  lng: number
  status?: 'ONLINE' | 'OFFLINE' | 'ON_TRIP'
  available?: boolean
  vehicleType?: string
  resolution?: number
}): Promise<{
  state: DriverLocationState
  cellChanged: boolean
  previousCell?: string
  coalesced: boolean
  reason?: string
}> {
  const {
    driverId,
    lat,
    lng,
    status = 'ONLINE',
    available = true,
    vehicleType = 'EV_SCOOTER',
    resolution = DEFAULT_H3_RESOLUTION,
  } = params

  const now = Date.now()
  const newH3Cell = h3.latLngToCell(lat, lng, resolution)

  const existingState = driverSpatialIndex.get(driverId)
  const previousCell = existingState?.h3Cell
  const cellChanged = previousCell !== newH3Cell

  // POSITION COALESCING: Check if driver moved enough to warrant an update
  let coalesced = false
  let reason: string | undefined

  if (existingState) {
    const timeSinceLastUpdate = now - existingState.lastUpdated
    const distanceMoved = calculateDistanceMeters(existingState.lat, existingState.lng, lat, lng)

    // Enforce minimum update interval
    if (timeSinceLastUpdate < GPS_CONFIG.UPDATE_INTERVAL_MS) {
      coalesced = true
      reason = `Update interval too short (${timeSinceLastUpdate}ms < ${GPS_CONFIG.UPDATE_INTERVAL_MS}ms)`
    }
    // Enforce minimum movement distance
    else if (distanceMoved < GPS_CONFIG.MIN_MOVE_DISTANCE_M) {
      coalesced = true
      reason = `Movement too small (${distanceMoved.toFixed(1)}m < ${GPS_CONFIG.MIN_MOVE_DISTANCE_M}m)`
    }

    if (coalesced) {
      return {
        state: existingState,
        cellChanged: false,
        previousCell,
        coalesced: true,
        reason,
      }
    }
  }

  // Update Inverted Cell Index if cell changed
  if (cellChanged && previousCell) {
    const prevSet = cellToDriverMap.get(previousCell)
    if (prevSet) {
      prevSet.delete(driverId)
      if (prevSet.size === 0) cellToDriverMap.delete(previousCell)
    }
  }

  // Register in new H3 cell
  if (!cellToDriverMap.has(newH3Cell)) {
    cellToDriverMap.set(newH3Cell, new Set())
  }
  cellToDriverMap.get(newH3Cell)!.add(driverId)

  const updatedState: DriverLocationState = {
    driverId,
    name: existingState?.name || `Driver ${driverId.slice(0, 6)}`,
    phone: existingState?.phone || '',
    vehicleType,
    status,
    available,
    lat,
    lng,
    h3Cell: newH3Cell,
    resolution,
    lastUpdated: now,
  }

  // Update primary spatial cache
  driverSpatialIndex.set(driverId, updatedState)

  // Buffer position for history (async, non-blocking)
  bufferPositionHistory(driverId, { lat, lng, ts: now, h3Cell: newH3Cell })

  // Replicate to Redis distributed cache with TTL if available
  if (isRedisAvailable() && redis) {
    const pipe = redis.pipeline()
    pipe.set(`crave:driver:loc:${driverId}`, JSON.stringify(updatedState), 'EX', 120)

    if (cellChanged && previousCell) {
      pipe.srem(`crave:h3:cell:${previousCell}`, driverId)
    }
    pipe.sadd(`crave:h3:cell:${newH3Cell}`, driverId)
    pipe.expire(`crave:h3:cell:${newH3Cell}`, 180) // slightly longer than location TTL
    await pipe.exec().catch(() => {})
  }

  // Ensure history flush timer is running
  if (!historyFlushTimer) {
    startHistoryFlushTimer()
  }

  return {
    state: updatedState,
    cellChanged,
    previousCell,
    coalesced: false,
  }
}

/**
 * Calculate distance between two lat/lng points in meters (Haversine)
 */
function calculateDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000 // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Buffer position history for batch writes
 */
function bufferPositionHistory(
  driverId: string,
  position: { lat: number; lng: number; ts: number; h3Cell: string }
): void {
  const buffer = positionHistoryBuffer.get(driverId) || []
  buffer.push(position)

  // Trim buffer if too large
  if (buffer.length > GPS_CONFIG.MAX_HISTORY_POINTS_PER_DRIVER) {
    buffer.shift()
  }

  positionHistoryBuffer.set(driverId, buffer)
}

/**
 * Start periodic history flush to database
 */
function startHistoryFlushTimer(): void {
  if (historyFlushTimer) return

  historyFlushTimer = setInterval(async () => {
    await flushPositionHistory()
  }, 30000) // Flush every 30 seconds

  // Don't prevent process exit
  if (historyFlushTimer.unref) historyFlushTimer.unref()
}

/**
 * Flush position history to database (batch write)
 */
async function flushPositionHistory(): Promise<void> {
  if (positionHistoryBuffer.size === 0) return

  const entries: Array<{
    driverId: string
    positions: typeof positionHistoryBuffer extends Map<string, infer V> ? V : never
  }> = []

  positionHistoryBuffer.forEach((positions, driverId) => {
    if (positions.length > 0) {
      entries.push({ driverId, positions: [...positions] })
      positions.length = 0 // Clear buffer
    }
  })

  if (entries.length === 0) return

  // Batch write to database
  try {
    await prisma.$transaction(
      entries.map(({ driverId, positions }) =>
        prisma.driverLocationHistory.createMany({
          data: positions.map((p) => ({
            driver_id: driverId,
            latitude: p.lat,
            longitude: p.lng,
            h3_cell: p.h3Cell,
            timestamp: new Date(p.ts),
          })),
          skipDuplicates: true,
        })
      )
    )
  } catch (error) {
    // Silently fail - position history is non-critical
    console.warn('[driver-tracker] History flush failed:', error)
  }
}

/**
 * Cleanup old history data (run periodically via cron)
 */
export async function cleanupOldHistory(): Promise<number> {
  const cutoff = new Date(Date.now() - GPS_CONFIG.HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000)
  try {
    const result = await prisma.driverLocationHistory.deleteMany({
      where: { timestamp: { lt: cutoff } },
    })
    return result.count
  } catch {
    return 0
  }
}

/**
 * Get capacity metrics for monitoring
 */
export function getCapacityMetrics(): {
  activeDrivers: number
  historyBufferSize: number
  cellsActive: number
  maxDriversPerCell: number
  avgDriversPerCell: number
} {
  let maxPerCell = 0
  let totalDrivers = 0

  cellToDriverMap.forEach((drivers) => {
    totalDrivers += drivers.size
    maxPerCell = Math.max(maxPerCell, drivers.size)
  })

  let bufferTotal = 0
  positionHistoryBuffer.forEach((buf) => {
    bufferTotal += buf.length
  })

  return {
    activeDrivers: driverSpatialIndex.size,
    historyBufferSize: bufferTotal,
    cellsActive: cellToDriverMap.size,
    maxDriversPerCell: maxPerCell,
    avgDriversPerCell: cellToDriverMap.size > 0 ? totalDrivers / cellToDriverMap.size : 0,
  }
}

export function getDriverLocation(driverId: string): DriverLocationState | undefined {
  const loc = driverSpatialIndex.get(driverId)
  if (!loc) return undefined
  // Return undefined if location is stale (> 2 minutes)
  if (Date.now() - loc.lastUpdated > DEFAULT_MAX_LOCATION_AGE_MS) {
    removeDriverLocation(driverId)
    return undefined
  }
  return loc
}

/**
 * Remove a driver location from spatial index
 */
export function removeDriverLocation(driverId: string): void {
  const existing = driverSpatialIndex.get(driverId)
  if (existing) {
    if (existing.h3Cell) {
      const cellSet = cellToDriverMap.get(existing.h3Cell)
      if (cellSet) {
        cellSet.delete(driverId)
        if (cellSet.size === 0) cellToDriverMap.delete(existing.h3Cell)
      }
    }
    driverSpatialIndex.delete(driverId)
  }
  if (isRedisAvailable() && redis) {
    redis.del(`crave:driver:loc:${driverId}`).catch(() => {})
  }
}

/**
 * Retrieve all live driver locations currently in memory index (excluding stale entries)
 */
export function getAllDriverLocations(
  maxAgeMs: number = DEFAULT_MAX_LOCATION_AGE_MS
): DriverLocationState[] {
  const now = Date.now()
  const activeLocations: DriverLocationState[] = []
  const staleIds: string[] = []

  driverSpatialIndex.forEach((loc, id) => {
    if (now - loc.lastUpdated <= maxAgeMs) {
      activeLocations.push(loc)
    } else {
      staleIds.push(id)
    }
  })

  // Remove stale entries after iteration is complete — never mutate during forEach
  for (const id of staleIds) {
    removeDriverLocation(id)
  }

  return activeLocations
}

/**
 * Retrieve all drivers currently indexed in a specific H3 cell (local only)
 */
export function getDriversInH3Cell(
  h3Cell: string,
  maxAgeMs: number = DEFAULT_MAX_LOCATION_AGE_MS
): DriverLocationState[] {
  const driverIds = cellToDriverMap.get(h3Cell)
  if (!driverIds) return []

  const now = Date.now()
  const result: DriverLocationState[] = []

  driverIds.forEach((driverId) => {
    const driver = driverSpatialIndex.get(driverId)
    if (driver && now - driver.lastUpdated <= maxAgeMs) {
      result.push(driver)
    }
  })

  return result
}

/**
 * Retrieve all drivers in an H3 cell with Redis fallback for distributed deployments
 * First checks local memory, then falls back to Redis for distributed deployments
 */
export async function getDriversInH3CellDistributed(
  h3Cell: string,
  maxAgeMs: number = DEFAULT_MAX_LOCATION_AGE_MS
): Promise<DriverLocationState[]> {
  // 1. Prefer local memory (fast path)
  const local = getDriversInH3Cell(h3Cell, maxAgeMs)
  if (local.length > 0 || !isRedisAvailable() || !redis) return local

  // 2. Fallback / merge from Redis
  const ids = await redis.smembers(`crave:h3:cell:${h3Cell}`)
  if (!ids.length) return local

  const pipe = redis.pipeline()
  ids.forEach((id) => pipe.get(`crave:driver:loc:${id}`))
  const results = await pipe.exec()

  const remote: DriverLocationState[] = []
  results?.forEach(([, val]) => {
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val) as DriverLocationState
        if (Date.now() - parsed.lastUpdated <= maxAgeMs) remote.push(parsed)
      } catch {}
    }
  })

  return remote
}

/**
 * Reset spatial index (Utility for testing)
 */
export function clearDriverSpatialIndex(): void {
  driverSpatialIndex.clear()
  cellToDriverMap.clear()
}
