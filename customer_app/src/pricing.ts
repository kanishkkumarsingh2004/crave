import type { Address, Restaurant } from './types'

const DEFAULT_LATITUDE = 12.9716
const DEFAULT_LONGITUDE = 77.5946

function coordinate(value: number | string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function checkoutDistanceKm(restaurant: Restaurant, address?: Address): number {
  const restaurantLat = coordinate(restaurant.latitude, 0)
  const restaurantLng = coordinate(restaurant.longitude, 0)
  const customerLat = coordinate(address?.latitude, DEFAULT_LATITUDE)
  const customerLng = coordinate(address?.longitude, DEFAULT_LONGITUDE)
  if (!restaurantLat || !restaurantLng || !customerLat || !customerLng) return 1.8

  const radians = (degrees: number) => (degrees * Math.PI) / 180
  const deltaLat = radians(customerLat - restaurantLat)
  const deltaLng = radians(customerLng - restaurantLng)
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(radians(restaurantLat)) * Math.cos(radians(customerLat)) * Math.sin(deltaLng / 2) ** 2
  const directKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  if (directKm <= 0.05) return 1.8
  return Math.max(1, Number((directKm * 1.3).toFixed(1)))
}
