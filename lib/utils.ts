import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Haversine formula for exact geographic straight-line distance calculation (in kilometers)
 * Shared utility to avoid duplication between distance-pricing.ts and h3-dispatch.ts
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Number((R * c).toFixed(2))
}

/**
 * Calculate estimated travel time ETA in minutes assuming average city traffic speed (30 km/h)
 */
export function calculateEstimatedEtaMinutes(distanceKm: number, avgSpeedKmH: number = 30): number {
  const hours = distanceKm / avgSpeedKmH
  const minutes = Math.ceil(hours * 60)
  return Math.max(1, minutes)
}
