/**
 * Real-Time Driver Location Processing, Noise Filtering & Kinematics
 * (Aligned with Real-Time Tracking Architecture Blueprint - docs/delivery_app_real_time_tracking_architecture.md)
 */

import { haversineDistanceKm } from "./geo";

export interface GpsFix {
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
  timestamp?: number;
}

export interface SanitizedGpsResult {
  latitude: number;
  longitude: number;
  isValid: boolean;
  rejectReason?: string;
  calculatedSpeedKmH?: number;
}

/**
 * Filter raw GPS fixes against impossible velocity jumps (multipath noise / spoofing).
 * Maximum plausible urban delivery vehicle speed: 120 km/h.
 */
export function cleanGpsFix(
  currentFix: GpsFix,
  previousFix?: GpsFix,
  maxSpeedKmH = 120,
): SanitizedGpsResult {
  const { latitude, longitude, timestamp = Date.now() } = currentFix;

  // Basic Lat/Lng Bound Validation
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return { latitude, longitude, isValid: false, rejectReason: "Coordinates out of bounds" };
  }

  if (!previousFix) {
    return { latitude, longitude, isValid: true };
  }

  const prevTime = previousFix.timestamp || timestamp - 3000;
  const timeDeltaSeconds = Math.max(0.1, (timestamp - prevTime) / 1000);

  const distKm = haversineDistanceKm(
    previousFix.latitude,
    previousFix.longitude,
    latitude,
    longitude,
  );

  const calculatedSpeedKmH = distKm / (timeDeltaSeconds / 3600);

  if (calculatedSpeedKmH > maxSpeedKmH && distKm > 0.1) {
    return {
      latitude: previousFix.latitude,
      longitude: previousFix.longitude,
      isValid: false,
      rejectReason: `Unrealistic speed jump: ${Math.round(calculatedSpeedKmH)} km/h`,
      calculatedSpeedKmH,
    };
  }

  return {
    latitude,
    longitude,
    isValid: true,
    calculatedSpeedKmH: Math.round(calculatedSpeedKmH * 10) / 10,
  };
}

/**
 * Check if driver GPS coordinates fall inside a geofence radius (in meters).
 */
export function isInsideGeofence(
  driverLat: number,
  driverLng: number,
  targetLat: number,
  targetLng: number,
  radiusMeters = 200,
): boolean {
  const distKm = haversineDistanceKm(driverLat, driverLng, targetLat, targetLng);
  return distKm * 1000 <= radiusMeters;
}

/**
 * Calculate Exponential Moving Average (EMA) of velocity for progressive ETA estimations.
 */
export function calculateEmaSpeed(
  currentSpeedKmH: number,
  previousEmaKmH = 25,
  alpha = 0.3,
): number {
  return Math.round((alpha * currentSpeedKmH + (1 - alpha) * previousEmaKmH) * 10) / 10;
}
