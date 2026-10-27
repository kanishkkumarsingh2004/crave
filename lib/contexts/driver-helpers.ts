import { calculateCheckoutPricing } from '@/lib/distance-pricing'
import { calculateHaversineDistanceKm } from '@/lib/utils'
import type { BroadcastOrderOffer } from './driver-types'

// Default coordinates for fallback (Indiranagar / Bengaluru central)
export const DEFAULT_DRIVER_LAT = 12.9716
export const DEFAULT_DRIVER_LNG = 77.6412
export const DEFAULT_RESTAURANT_LAT = 12.9716
export const DEFAULT_RESTAURANT_LNG = 77.6412
export const DEFAULT_CUSTOMER_LAT = 12.9716
export const DEFAULT_CUSTOMER_LNG = 77.5946

export const ELIGIBLE_DRIVER_OFFER_STATUSES = [
  'ready_for_pickup',
  'ready',
  'sent_to_vendor',
  'preparing',
  'cooking',
  'packing',
]

export function getDriverPayoutDetails(order: any): {
  basePayout: number
  surgeBonus: number
  tip: number
  totalDriverPayout: number
} {
  if (!order) {
    return { basePayout: 24, surgeBonus: 0, tip: 0, totalDriverPayout: 24 }
  }

  let itemsArr: any[] = []
  try {
    itemsArr = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || []
  } catch (e) {}

  const storedBreakdown =
    order.pricing_breakdown || (itemsArr.length > 0 && itemsArr[0]?.billing_breakdown) || null

  const tip = Number(order.tip || order.tip_amount || storedBreakdown?.tip || 0)

  // 1. Direct driver_payout from DB column or stored breakdown
  if (
    order.driver_payout != null &&
    !isNaN(Number(order.driver_payout)) &&
    Number(order.driver_payout) > 0
  ) {
    const totalDriverPayout = Number(order.driver_payout)
    const basePayout = Number(
      storedBreakdown?.driver_base_payout ?? Math.max(0, totalDriverPayout - tip)
    )
    const surgeBonus = Number(storedBreakdown?.driver_surge_payout ?? 0)
    return { basePayout, surgeBonus, tip, totalDriverPayout }
  }

  if (
    storedBreakdown &&
    (storedBreakdown.driver_payout != null || storedBreakdown.totalDriverEarnings != null)
  ) {
    const totalDriverPayout = Number(
      storedBreakdown.driver_payout ?? storedBreakdown.totalDriverEarnings
    )
    const basePayout = Number(
      storedBreakdown?.driver_base_payout ?? Math.max(0, totalDriverPayout - tip)
    )
    const surgeBonus = Number(storedBreakdown?.driver_surge_payout ?? 0)
    return { basePayout, surgeBonus, tip, totalDriverPayout }
  }

  // 2. Fallback to calculation using food subtotal
  const foodSubtotal = Number(
    order.subtotal ||
      storedBreakdown?.subtotal ||
      (order.total_amount ? Math.round(order.total_amount * 0.75) : 250)
  )
  const roadKm = Number(order.distance_km || order.distance || 1.8)
  const pricing = calculateCheckoutPricing({
    cartSubtotal: foodSubtotal,
    roadDistanceKm: roadKm,
  })
  const dEarn = pricing.driverEarnings || {
    baseDistanceShare: 24,
    extraDistanceShare: 0,
    surgeRainShare: 0,
    totalDriverEarnings: 24,
  }

  const basePayout = dEarn.baseDistanceShare + dEarn.extraDistanceShare
  const surgeBonus = dEarn.surgeRainShare
  const totalDriverPayout = dEarn.totalDriverEarnings

  return { basePayout, surgeBonus, tip, totalDriverPayout }
}

/**
 * Creates a broadcast order offer from an order target
 */
export function createBroadcastOfferFromOrder(
  target: any,
  driverGpsCoords?: number[] | null
): BroadcastOrderOffer | null {
  if (!target || !target.id) return null
  if (
    !target.id ||
    !ELIGIBLE_DRIVER_OFFER_STATUSES.includes(target.status) ||
    (target.rider_id && target.rider_id !== 'Unassigned') ||
    (target.driver_name &&
      target.driver_name !== 'Unassigned' &&
      target.driver_name !== 'Unassigned Driver')
  ) {
    return null
  }

  const rLat = target.restaurant?.latitude != null
    ? Number(target.restaurant.latitude)
    : target.restaurant_latitude != null
    ? Number(target.restaurant_latitude)
    : DEFAULT_RESTAURANT_LAT
  const rLng = target.restaurant?.longitude != null
    ? Number(target.restaurant.longitude)
    : target.restaurant_longitude != null
    ? Number(target.restaurant_longitude)
    : DEFAULT_RESTAURANT_LNG

  const cLat = target.delivery_latitude != null
    ? Number(target.delivery_latitude)
    : target.customer_lat != null
    ? Number(target.customer_lat)
    : DEFAULT_CUSTOMER_LAT
  const cLng = target.delivery_longitude != null
    ? Number(target.delivery_longitude)
    : target.customer_lng != null
    ? Number(target.customer_lng)
    : DEFAULT_CUSTOMER_LNG

  const driverLat = driverGpsCoords ? driverGpsCoords[0] : rLat
  const driverLng = driverGpsCoords ? driverGpsCoords[1] : rLng
  const distKm = calculateHaversineDistanceKm(
    driverLat,
    driverLng,
    rLat,
    rLng
  )

  let itemsArr: any[] = []
  try {
    itemsArr = typeof target.items === 'string' ? JSON.parse(target.items) : target.items || []
  } catch (e) {}

  const { basePayout, surgeBonus, tip: tipVal } = getDriverPayoutDetails(target)

  return {
    id: target.id,
    orderNumber: `#${target.id.slice(0, 8)}`,
    restaurantName: target.restaurant_name || target.restaurant?.name || 'Crave Kitchen Store',
    restaurantAddress: target.customer_address
      ? `Kitchen near ${target.customer_address}`
      : 'Indiranagar 100ft Rd, Bengaluru',
    customerName: target.customer_name || 'Customer',
    customerAddress: target.customer_address || 'Brigade Road, Bengaluru',
    basePayout,
    surgeBonus,
    tip: tipVal,
    distance: `${distKm || 1.8} km`,
    itemsCount: Array.isArray(itemsArr) ? itemsArr.length : 1,
    customerPhone: target.customer_phone || undefined,
    otp: target.delivery_otp || undefined,
    restaurantLat: rLat,
    restaurantLng: rLng,
    customerLat: cLat,
    customerLng: cLng,
  }
}

