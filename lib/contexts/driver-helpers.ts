import { calculateCheckoutPricing } from '@/lib/distance-pricing'
import { calculateHaversineDistanceKm } from '@/lib/utils'
import type { BroadcastOrderOffer } from './driver-types'

// Default coordinates for fallback (Koramangala, Bengaluru)
export const DEFAULT_DRIVER_LAT = 12.679898
export const DEFAULT_DRIVER_LNG = 77.469493
export const DEFAULT_RESTAURANT_LAT = 12.9352
export const DEFAULT_RESTAURANT_LNG = 77.6245

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
      storedBreakdown.driver_base_payout ?? Math.max(0, totalDriverPayout - tip)
    )
    const surgeBonus = Number(storedBreakdown.driver_surge_payout ?? 0)
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

  const driverLat = driverGpsCoords ? driverGpsCoords[0] : DEFAULT_DRIVER_LAT
  const driverLng = driverGpsCoords ? driverGpsCoords[1] : DEFAULT_DRIVER_LNG
  const distKm = calculateHaversineDistanceKm(
    driverLat,
    driverLng,
    DEFAULT_RESTAURANT_LAT,
    DEFAULT_RESTAURANT_LNG
  )

  let itemsArr: any[] = []
  try {
    itemsArr = typeof target.items === 'string' ? JSON.parse(target.items) : target.items || []
  } catch (e) {}

  const { basePayout, surgeBonus, tip: tipVal } = getDriverPayoutDetails(target)

  return {
    id: target.id,
    orderNumber: `#${target.id.slice(0, 8)}`,
    restaurantName: target.restaurant_name || 'Crave Kitchen Store',
    restaurantAddress: target.customer_address
      ? `Kitchen near ${target.customer_address}`
      : 'Koramangala 5th Block, Bengaluru',
    customerName: target.customer_name || 'Customer',
    customerAddress: target.customer_address || 'Indiranagar 100ft Rd',
    basePayout,
    surgeBonus,
    tip: tipVal,
    distance: `${distKm || 1.8} km`,
    itemsCount: Array.isArray(itemsArr) ? itemsArr.length : 1,
    customerPhone: target.customer_phone || undefined,
  }
}
