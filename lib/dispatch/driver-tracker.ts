import * as h3 from 'h3-js'
import { prisma } from '@/lib/prisma'

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

// In-memory Spatial Index Cache (High-Performance Layer, fallback for Redis)
const driverSpatialIndex = new Map<string, DriverLocationState>()

// Secondary H3 Cell Inverted Index: h3Cell -> Set of driverIds
const cellToDriverMap = new Map<string, Set<string>>()

export const DEFAULT_H3_RESOLUTION = 8 // ~0.737 km² per cell, ~461m edge length
export const DEFAULT_MAX_LOCATION_AGE_MS = 120 * 1000 // 120 seconds threshold

/**
 * Update a driver's GPS location and re-index into H3 Spatial Cell
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

  // Persist to PostgreSQL in background (or mock safe)
  try {
    if (prisma.user?.update) {
      await prisma.user
        .update({
          where: { id: driverId },
          data: {
            address: `H3Cell:${newH3Cell}`,
          },
        })
        .catch(() => {})
    }
  } catch {
    // Ignore persistence errors in transient mock environments
  }

  return {
    state: updatedState,
    cellChanged,
    previousCell,
  }
}

/**
 * Retrieve driver location state by ID
 */
export function getDriverLocation(driverId: string): DriverLocationState | undefined {
  return driverSpatialIndex.get(driverId)
}

/**
 * Retrieve all drivers currently indexed in a specific H3 cell
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
 * Reset spatial index (Utility for testing)
 */
export function clearDriverSpatialIndex(): void {
  driverSpatialIndex.clear()
  cellToDriverMap.clear()
}
