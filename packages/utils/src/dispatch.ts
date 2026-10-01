/**
 * Optimized Driver Candidate Search & Multi-Factor Dispatch Ranking Engine
 * (Aligned with Order & Delivery Tracking Specification Section 42 & Section 47)
 */

import { haversineDistanceKm } from "./index";

export interface DriverCandidate {
  id: string;
  name: string;
  phone: string;
  latitude: number;
  longitude: number;
  rating: number; // e.g., 4.9
  currentActiveDeliveries: number;
  vehicleType: "BIKE" | "SCOOTER" | "CAR" | "VAN";
  isOnline: boolean;
  status: "ACTIVE" | "APPROVED" | "PENDING";
}

export interface DispatchLocation {
  latitude: number;
  longitude: number;
}

export interface DispatchScoredCandidate extends DriverCandidate {
  distanceKm: number;
  estimatedEtaMinutes: number;
  score: number; // Lower composite score = Higher dispatch priority
}

/**
 * Filter & Rank Driver Candidates for a pickup location using an optimized
 * multi-factor weighted scoring model.
 */
export function rankDriverCandidates(
  pickup: DispatchLocation,
  candidates: DriverCandidate[],
  maxRadiusKm = 15.0,
): DispatchScoredCandidate[] {
  const eligible = candidates.filter(
    (driver) =>
      driver.isOnline &&
      (driver.status === "ACTIVE" || driver.status === "APPROVED") &&
      driver.currentActiveDeliveries < 2,
  );

  const scored: DispatchScoredCandidate[] = [];

  for (const driver of eligible) {
    const distanceKm = haversineDistanceKm(
      pickup.latitude,
      pickup.longitude,
      driver.latitude,
      driver.longitude,
    );

    // Skip drivers outside max search radius
    if (distanceKm > maxRadiusKm) continue;

    // Estimate ETA based on average urban speed (25 km/h) + 2 mins prep buffer
    const estimatedEtaMinutes = Math.round((distanceKm / 25) * 60 + 2);

    // Multi-factor Scoring Model:
    // 1. Distance Weight (40%): 4 points per km
    // 2. ETA Weight (30%): 2 points per minute
    // 3. Workload Penalty (20%): +15 points if already on 1 active trip
    // 4. Driver Rating Bonus (10%): -5 points per rating point above 4.0
    const distanceScore = distanceKm * 4.0;
    const etaScore = estimatedEtaMinutes * 2.0;
    const workloadScore = driver.currentActiveDeliveries * 15.0;
    const ratingBonus = Math.max(0, (driver.rating - 4.0) * 5.0);

    const score = Math.max(0, distanceScore + etaScore + workloadScore - ratingBonus);

    scored.push({
      ...driver,
      distanceKm: Math.round(distanceKm * 100) / 100,
      estimatedEtaMinutes,
      score: Math.round(score * 100) / 100,
    });
  }

  // Sort candidates by lowest score (best match first)
  return scored.sort((a, b) => a.score - b.score);
}
