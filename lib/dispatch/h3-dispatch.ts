import * as h3 from 'h3-js'
import {
  getDriversInH3Cell,
  getDriversInH3CellDistributed,
  DEFAULT_H3_RESOLUTION,
  DEFAULT_MAX_LOCATION_AGE_MS,
  type DriverLocationState,
} from './driver-tracker'
import { isDriverLocked } from './atomic-lock'
import { calculateHaversineDistanceKm, calculateEstimatedEtaMinutes } from '../utils'

export interface DispatchRequest {
  requestId: string
  pickupLat: number
  pickupLng: number
  serviceType?: string
  requiredVehicleType?: string
  maxSearchRadiusKm?: number
  minCandidatesRequired?: number
  resolution?: number
}

export interface CandidateDriverResult {
  driverId: string
  name: string
  phone: string
  vehicleType: string
  status: string
  h3Cell: string
  distanceKm: number
  etaMinutes: number
  locationAgeSeconds: number
  score: number
  ringStageFound: number
}

export interface DispatchSearchResult {
  requestId: string
  pickupH3Cell: string
  resolution: number
  stageFound: number
  h3RingsSearched: number
  totalCellsSearched: number
  eligibleCandidates: CandidateDriverResult[]
}

/**
 * Multi-Factor Candidate Ranking Formula
 */
export function rankCandidateDriver(
  driver: DriverLocationState,
  pickupLat: number,
  pickupLng: number,
  requiredVehicleType?: string
): { distanceKm: number; etaMinutes: number; score: number } {
  const distKm = calculateHaversineDistanceKm(pickupLat, pickupLng, driver.lat, driver.lng)
  const etaMins = calculateEstimatedEtaMinutes(distKm)

  // 1. Distance Score (closer = higher score)
  const distanceScore = 1 / (1 + distKm)

  // 2. Freshness Score (newer update = higher score)
  const ageMs = Math.max(0, Date.now() - driver.lastUpdated)
  const freshnessScore = Math.max(0, 1 - ageMs / DEFAULT_MAX_LOCATION_AGE_MS)

  // 3. Vehicle Type Match Bonus
  const vehicleMatchBonus =
    requiredVehicleType && driver.vehicleType.toLowerCase() === requiredVehicleType.toLowerCase()
      ? 1.0
      : 0.7

  // Combined Weighted Final Candidate Score
  const score = parseFloat(
    (distanceScore * 0.6 + freshnessScore * 0.25 + vehicleMatchBonus * 0.15).toFixed(4)
  )

  return {
    distanceKm: distKm,
    etaMinutes: etaMins,
    score,
  }
}

/**
 * Perform H3-Geofenced Dynamic Candidate Selection
 *
 * Flow:
 * 1. Convert Pickup Lat/Lng -> Pickup H3 Cell
 * 2. Stage 1: Search pickup H3 cell (Ring 0)
 * 3. Stage 2 -> N: Expand to neighboring H3 rings (Ring 1, 2, 3...) if candidates < minCandidatesRequired
 * 4. Filter candidates by status, availability, location freshness, vehicle type, and lock state
 * 5. Calculate exact Haversine distance & ETA
 * 6. Rank candidates by multi-factor score
 */
export async function findGeofencedCandidateDrivers(
  request: DispatchRequest
): Promise<DispatchSearchResult> {
  const {
    requestId,
    pickupLat,
    pickupLng,
    requiredVehicleType,
    maxSearchRadiusKm = 15.0,
    minCandidatesRequired = 3,
    resolution = DEFAULT_H3_RESOLUTION,
  } = request

  // 1. Convert pickup coordinates to H3 Cell
  const pickupH3Cell = h3.latLngToCell(pickupLat, pickupLng, resolution)

  const candidateMap = new Map<string, CandidateDriverResult>()
  // Res 8 cell step is ~0.8km. Dynamically compute max rings up to maxSearchRadiusKm (capped at 10 rings)
  const ringStepKm = resolution === 8 ? 0.8 : resolution === 7 ? 2.5 : 0.3
  const maxRingsToSearch = Math.min(10, Math.max(3, Math.ceil(maxSearchRadiusKm / ringStepKm)))
  let stageFound = 0
  let totalCellsSearched = 0

  // Progressive Dynamic Ring Expansion (Ring 0 -> Ring 1 -> Ring 2 -> Ring N)
  for (let ring = 0; ring < maxRingsToSearch; ring += 1) {
    const ringCells = h3.gridDisk(pickupH3Cell, ring)
    totalCellsSearched += ringCells.length

    // Scan ONLY drivers in these specific H3 cells (Geographically Isolated)
    // Use distributed version for multi-pod support
    const driversInCellPromises = ringCells.map(async (cell) => {
      const driversInCell = await getDriversInH3CellDistributed(cell, DEFAULT_MAX_LOCATION_AGE_MS)
      return { cell, drivers: driversInCell }
    })

    const cellsDrivers = await Promise.all(driversInCellPromises)

    cellsDrivers.forEach(({ cell, drivers: driversInCell }) => {
      driversInCell.forEach((driver) => {
        // Exclude if already evaluated or currently locked by another offer
        if (candidateMap.has(driver.driverId) || isDriverLocked(driver.driverId)) {
          return
        }

        // Eligibility Check 1: Online & Available
        if (driver.status !== 'ONLINE' || !driver.available) {
          return
        }

        // Eligibility Check 2: Vehicle Type Match (if specified)
        if (
          requiredVehicleType &&
          driver.vehicleType.toLowerCase() !== requiredVehicleType.toLowerCase()
        ) {
          return
        }

        // Eligibility Check 3: Exact Distance Boundary
        const { distanceKm, etaMinutes, score } = rankCandidateDriver(
          driver,
          pickupLat,
          pickupLng,
          requiredVehicleType
        )

        if (distanceKm > maxSearchRadiusKm) {
          return
        }

        const ageSeconds = Math.floor((Date.now() - driver.lastUpdated) / 1000)

        candidateMap.set(driver.driverId, {
          driverId: driver.driverId,
          name: driver.name,
          phone: driver.phone,
          vehicleType: driver.vehicleType,
          status: driver.status,
          h3Cell: driver.h3Cell,
          distanceKm,
          etaMinutes,
          locationAgeSeconds: ageSeconds,
          score,
          ringStageFound: ring,
        })
      })
    })

    // If we reached required minimum candidates, stop ring expansion
    if (candidateMap.size >= minCandidatesRequired) {
      stageFound = ring
      break
    }
  }

  // Sort candidates by score descending (highest score first)
  const sortedCandidates = Array.from(candidateMap.values()).sort((a, b) => b.score - a.score)

  return {
    requestId,
    pickupH3Cell,
    resolution,
    stageFound,
    h3RingsSearched: stageFound + 1,
    totalCellsSearched,
    eligibleCandidates: sortedCandidates,
  }
}
