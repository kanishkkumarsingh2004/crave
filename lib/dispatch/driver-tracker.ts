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
  lastUpdated: number // Server receipt timestamp (ms), used for live freshness
  reportedAt?: number // Device GPS sample timestamp (ms), used for packet ordering/history
  isStale?: boolean
  staleDurationSeconds?: number
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

export const DEFAULT_H3_RESOLUTION = 8 // ~0.737 km² per cell, ~461m edge length
export const DEFAULT_STALE_LOCATION_MS = 45 * 1000 // 45 seconds threshold for stale signal
export const DEFAULT_MAX_LOCATION_AGE_MS = 120 * 1000 // 120 seconds threshold for expiry/offline

async function persistCurrentDriverLocation(
  state: DriverLocationState,
  previousCell?: string,
  cellChanged = false,
  recordHistory = false
): Promise<void> {
  const reportedAt = new Date(state.reportedAt ?? state.lastUpdated)
  await prisma.$transaction(async (tx) => {
    const accepted = await tx.$queryRaw<Array<{ driver_id: string }>>`
      INSERT INTO "driver_current_locations" (
        "driver_id", "latitude", "longitude", "h3_cell", "resolution",
        "status", "available", "vehicle_type", "reported_at", "updated_at"
      ) VALUES (
        ${state.driverId}, ${state.lat}, ${state.lng}, ${state.h3Cell}, ${state.resolution},
        ${state.status}, ${state.available}, ${state.vehicleType}, ${reportedAt}, NOW()
      )
      ON CONFLICT ("driver_id") DO UPDATE SET
        "latitude" = EXCLUDED."latitude",
        "longitude" = EXCLUDED."longitude",
        "h3_cell" = EXCLUDED."h3_cell",
        "resolution" = EXCLUDED."resolution",
        "status" = EXCLUDED."status",
        "available" = EXCLUDED."available",
        "vehicle_type" = EXCLUDED."vehicle_type",
        "reported_at" = EXCLUDED."reported_at",
        "updated_at" = NOW()
      WHERE "driver_current_locations"."reported_at" < EXCLUDED."reported_at"
      RETURNING "driver_id"
    `
    if (accepted.length !== 1) {
      const error = new Error('Stale GPS update rejected by authoritative location record')
      ;(error as Error & { code?: string }).code = 'STALE_GPS_UPDATE'
      throw error
    }

    if (recordHistory) {
      await tx.driverLocationHistory.create({
        data: {
          driver_id: state.driverId,
          latitude: state.lat,
          longitude: state.lng,
          h3_cell: state.h3Cell,
          timestamp: reportedAt,
        },
      })
    }
  })

  if (!isRedisAvailable() || !redis) return
  const lua = `
    local current = redis.call('GET', KEYS[1])
    if current then
      local ok, decoded = pcall(cjson.decode, current)
      if ok and tonumber(decoded.reportedAt or 0) >= tonumber(ARGV[5]) then
        return 0
      end
    end
    redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[2])
    if KEYS[2] ~= '' and KEYS[2] ~= KEYS[3] then
      redis.call('SREM', KEYS[2], ARGV[3])
    end
    redis.call('SADD', KEYS[3], ARGV[3])
    redis.call('EXPIRE', KEYS[3], ARGV[4])
    return 1
  `
  const redisAccepted = await redis.eval(
    lua,
    3,
    `crave:driver:loc:${state.driverId}`,
    cellChanged && previousCell ? `crave:h3:cell:${previousCell}` : '',
    `crave:h3:cell:${state.h3Cell}`,
    JSON.stringify(state),
    '120',
    state.driverId,
    '180',
    String(state.reportedAt ?? state.lastUpdated)
  )
  if (redisAccepted !== 1) {
    const error = new Error('Stale GPS update rejected by distributed location record')
    ;(error as Error & { code?: string }).code = 'STALE_GPS_UPDATE'
    throw error
  }
}

/**
 * Update a driver's GPS location and re-index into H3 Spatial Cell
 * Includes position coalescing, update interval enforcement, and history buffering
 */
export async function updateDriverLocation(params: {
  driverId: string
  lat: number
  lng: number
  timestamp?: number | string | Date
  orderId?: string
  status?: 'ONLINE' | 'OFFLINE' | 'ON_TRIP'
  available?: boolean
  vehicleType?: string
  resolution?: number
}): Promise<{
  state: DriverLocationState
  cellChanged: boolean
  previousCell?: string
  coalesced: boolean
  stale?: boolean
  outOfOrder?: boolean
  reason?: string
}> {
  const {
    driverId,
    lat,
    lng,
    timestamp,
    orderId,
    status = 'ONLINE',
    available = true,
    vehicleType = 'EV_SCOOTER',
    resolution = DEFAULT_H3_RESOLUTION,
  } = params

  const now = Date.now()
  let clientTs = now
  if (timestamp) {
    const parsed = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime()
    if (!isNaN(parsed) && parsed > 0) {
      clientTs = parsed
    }
  }

  // Prevent excessive future clock drift (> 15 seconds)
  if (clientTs > now + 15000) {
    clientTs = now
  }

  const existingState =
    driverSpatialIndex.get(driverId) ??
    (await getDriverLocationDistributed(driverId, GPS_CONFIG.CURRENT_LOCATION_TTL_MS))
  if (existingState && !driverSpatialIndex.has(driverId)) {
    driverSpatialIndex.set(driverId, existingState)
    if (!cellToDriverMap.has(existingState.h3Cell)) {
      cellToDriverMap.set(existingState.h3Cell, new Set())
    }
    cellToDriverMap.get(existingState.h3Cell)!.add(driverId)
  }
  const previousCell = existingState?.h3Cell

  // OUT-OF-ORDER PACKET DETECTION:
  // If an update arrives with a timestamp older than the existing state's last update,
  // reject updating the authoritative position cache to prevent erratic track jumping.
  const existingReportedAt = existingState?.reportedAt ?? existingState?.lastUpdated
  if (existingState && existingReportedAt != null && clientTs <= existingReportedAt) {
    const ageFromExisting = now - existingState.lastUpdated
    return {
      state: {
        ...existingState,
        isStale: ageFromExisting > DEFAULT_STALE_LOCATION_MS,
        staleDurationSeconds: Math.floor(ageFromExisting / 1000),
      },
      cellChanged: false,
      previousCell,
      coalesced: true,
      stale: true,
      outOfOrder: true,
      reason: `Out-of-order GPS packet: packet timestamp (${clientTs}) is not newer than last update (${existingReportedAt})`,
    }
  }

  const isStalePacket = now - clientTs > 60000 // Packet took > 60s to arrive
  if (isStalePacket) {
    const error = new Error('Stale GPS sample rejected')
    ;(error as Error & { code?: string }).code = 'STALE_GPS_UPDATE'
    throw error
  }
  const newH3Cell = h3.latLngToCell(lat, lng, resolution)
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
      // A stationary driver still sends a valid heartbeat. Refreshing the
      // timestamp and durable current-location row prevents online riders from
      // disappearing after the two-minute spatial-cache TTL.
      const heartbeatReportedAt = Math.max(clientTs, existingReportedAt ?? clientTs)
      const heartbeatState: DriverLocationState = {
        ...existingState,
        status,
        available,
        vehicleType,
        lastUpdated: now,
        reportedAt: heartbeatReportedAt,
        isStale: false,
        staleDurationSeconds: 0,
      }
      await persistCurrentDriverLocation(heartbeatState)
      driverSpatialIndex.set(driverId, heartbeatState)
      return {
        state: heartbeatState,
        cellChanged: false,
        previousCell,
        coalesced: true,
        stale: isStalePacket,
        reason,
      }
    }
  }

  const effectiveTimestamp = clientTs
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
    reportedAt: effectiveTimestamp,
    isStale: isStalePacket,
    staleDurationSeconds: isStalePacket ? Math.floor((now - clientTs) / 1000) : 0,
  }

  // Persist with an authoritative timestamp compare before mutating local
  // indexes. A stale concurrent packet therefore cannot corrupt this pod.
  await persistCurrentDriverLocation(updatedState, previousCell, cellChanged, true)

  if (cellChanged && previousCell) {
    const prevSet = cellToDriverMap.get(previousCell)
    if (prevSet) {
      prevSet.delete(driverId)
      if (prevSet.size === 0) cellToDriverMap.delete(previousCell)
    }
  }
  if (!cellToDriverMap.has(newH3Cell)) {
    cellToDriverMap.set(newH3Cell, new Set())
  }
  cellToDriverMap.get(newH3Cell)!.add(driverId)
  driverSpatialIndex.set(driverId, updatedState)

  return {
    state: updatedState,
    cellChanged,
    previousCell,
    coalesced: false,
    stale: isStalePacket,
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

  return {
    activeDrivers: driverSpatialIndex.size,
    historyBufferSize: 0,
    cellsActive: cellToDriverMap.size,
    maxDriversPerCell: maxPerCell,
    avgDriversPerCell: cellToDriverMap.size > 0 ? totalDrivers / cellToDriverMap.size : 0,
  }
}

export function getDriverLocation(driverId: string): DriverLocationState | undefined {
  const loc = driverSpatialIndex.get(driverId)
  if (!loc) return undefined
  const now = Date.now()
  const ageMs = now - loc.lastUpdated
  // Return undefined if location is stale (> 2 minutes)
  if (ageMs > DEFAULT_MAX_LOCATION_AGE_MS) {
    removeDriverLocation(driverId)
    return undefined
  }
  const isStale = ageMs > DEFAULT_STALE_LOCATION_MS
  return {
    ...loc,
    isStale,
    staleDurationSeconds: Math.floor(ageMs / 1000),
  }
}

/**
 * Resolve the current rider position across all server instances.
 *
 * The in-memory index is the fastest path, Redis shares positions between
 * processes, and PostgreSQL is the durable source used when Redis is disabled
 * or a request lands on a freshly started instance.
 */
export async function getDriverLocationDistributed(
  driverId: string,
  maxAgeMs: number = DEFAULT_MAX_LOCATION_AGE_MS
): Promise<DriverLocationState | undefined> {
  const local = getDriverLocation(driverId)
  if (local && Date.now() - local.lastUpdated <= maxAgeMs) return local

  if (isRedisAvailable() && redis) {
    try {
      const raw = await redis.get(`crave:driver:loc:${driverId}`)
      if (raw) {
        const parsed = JSON.parse(raw) as DriverLocationState
        const ageMs = Date.now() - parsed.lastUpdated
        if (
          parsed.driverId === driverId &&
          Number.isFinite(parsed.lat) &&
          Number.isFinite(parsed.lng) &&
          ageMs <= maxAgeMs
        ) {
          return {
            ...parsed,
            isStale: ageMs > DEFAULT_STALE_LOCATION_MS,
            staleDurationSeconds: Math.floor(ageMs / 1000),
          }
        }
      }
    } catch {
      // Continue to the durable database source when Redis is unavailable.
    }
  }

  const persisted = await prisma.driverCurrentLocation.findUnique({
    where: { driver_id: driverId },
  })
  if (!persisted) return undefined

  // updated_at is the server receipt time. It remains reliable when a mobile
  // device clock is slightly ahead or behind the API server.
  const lastUpdated = persisted.updated_at.getTime()
  const ageMs = Date.now() - lastUpdated
  if (ageMs > maxAgeMs) return undefined

  const persistedStatus = ['ONLINE', 'OFFLINE', 'ON_TRIP'].includes(persisted.status)
    ? (persisted.status as DriverLocationState['status'])
    : 'ONLINE'

  return {
    driverId,
    name: `Driver ${driverId.slice(0, 6)}`,
    phone: '',
    vehicleType: persisted.vehicle_type || 'EV_SCOOTER',
    status: persistedStatus,
    available: persisted.available,
    lat: Number(persisted.latitude),
    lng: Number(persisted.longitude),
    h3Cell: persisted.h3_cell,
    resolution: persisted.resolution,
    lastUpdated,
    reportedAt: persisted.reported_at.getTime(),
    isStale: ageMs > DEFAULT_STALE_LOCATION_MS,
    staleDurationSeconds: Math.floor(ageMs / 1000),
  }
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
    const pipe = redis.pipeline()
    // CR-05 FIX: Remove driver from H3 cell set atomically with location key deletion.
    // Without SREM, stale driver IDs accumulate in the cell set until the TTL expires,
    // causing distributed reads to pipeline GETs for drivers that no longer exist.
    if (existing?.h3Cell) {
      pipe.srem(`crave:h3:cell:${existing.h3Cell}`, driverId)
    }
    pipe.del(`crave:driver:loc:${driverId}`)
    pipe.exec().catch(() => {})
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
    const ageMs = now - loc.lastUpdated
    if (ageMs <= maxAgeMs) {
      activeLocations.push({
        ...loc,
        isStale: ageMs > DEFAULT_STALE_LOCATION_MS,
        staleDurationSeconds: Math.floor(ageMs / 1000),
      })
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
 * Retrieve all drivers in an H3 cell with Redis for distributed deployments.
 *
 * CR-06 FIX: Always merge local + Redis results rather than short-circuiting when
 * local.length > 0. Under multi-pod load, other pods' drivers live only in Redis;
 * returning local-only produces incomplete candidate sets and biases dispatch toward
 * drivers registered on this pod.
 *
 * Deduplication is by driverId — local entries win over Redis (more recently written).
 */
export async function getDriversInH3CellDistributed(
  h3Cell: string,
  maxAgeMs: number = DEFAULT_MAX_LOCATION_AGE_MS
): Promise<DriverLocationState[]> {
  // Always collect local drivers first
  const local = getDriversInH3Cell(h3Cell, maxAgeMs)

  // Candidate selection must not silently become process-local in production;
  // that can offer one driver to multiple pods simultaneously.
  if (!isRedisAvailable() || !redis) {
    if (process.env.NODE_ENV === 'production' && process.env.REDIS_DISABLED !== 'true') {
      throw new Error('Redis unavailable for distributed driver candidate selection')
    }
    return local
  }

  // Build a dedup map seeded with local entries (local wins on conflict)
  const merged = new Map<string, DriverLocationState>()
  local.forEach((d) => merged.set(d.driverId, d))

  try {
    const ids = await redis.smembers(`crave:h3:cell:${h3Cell}`)
    if (ids.length > 0) {
      const pipe = redis.pipeline()
      ids.forEach((id) => pipe.get(`crave:driver:loc:${id}`))
      const results = await pipe.exec()

      results?.forEach(([, val]) => {
        if (typeof val === 'string') {
          try {
            const parsed = JSON.parse(val) as DriverLocationState
            if (
              Date.now() - parsed.lastUpdated <= maxAgeMs &&
              !merged.has(parsed.driverId) // local entry already present — keep it
            ) {
              merged.set(parsed.driverId, parsed)
            }
          } catch {}
        }
      })
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Redis failed during distributed driver candidate selection', {
        cause: error,
      })
    }
  }

  return Array.from(merged.values())
}

/**
 * Reset spatial index (Utility for testing)
 */
export function clearDriverSpatialIndex(): void {
  driverSpatialIndex.clear()
  cellToDriverMap.clear()
}
