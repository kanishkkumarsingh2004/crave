import {
  calculateHaversineDistanceKm,
  calculateRoadTravelDistanceKm,
  calculateCheckoutPricing,
} from '@/lib/distance-pricing'
import { DEFAULT_PAYMENT_CONFIG } from '@/lib/payment-config'

describe('Distance & Pricing Calculation Engine', () => {
  test('calculateHaversineDistanceKm computes accurate geographic distance', () => {
    // Bengaluru Central (12.9716, 77.5946) to Electronic City (12.8399, 77.6770) ~17-18 km
    const dist = calculateHaversineDistanceKm(12.9716, 77.5946, 12.8399, 77.677)
    expect(dist).toBeGreaterThan(14)
    expect(dist).toBeLessThan(20)
  })

  test('calculateRoadTravelDistanceKm returns 1.8 km fallback on missing or zero coords', () => {
    expect(calculateRoadTravelDistanceKm(null, null, 12.97, 77.59)).toBe(1.8)
    expect(calculateRoadTravelDistanceKm(12.97, 77.59, 0, 0)).toBe(1.8)
  })

  test('calculateRoadTravelDistanceKm applies road circuity factor to straight-line distance', () => {
    const direct = calculateHaversineDistanceKm(12.9716, 77.4695, 12.95, 77.58)
    const road = calculateRoadTravelDistanceKm(12.9716, 77.4695, 12.95, 77.58)
    expect(road).toBeGreaterThan(direct)
  })

  test('calculateCheckoutPricing calculates distance-based fare and admin fees', () => {
    const breakdown = calculateCheckoutPricing({
      cartSubtotal: 300,
      roadDistanceKm: 5.5, // 5.5 km (2.5 km extra beyond base 3 km)
      config: {
        ...DEFAULT_PAYMENT_CONFIG,
        baseDeliveryFee: 30,
        baseDistanceKm: 3,
        perKmRate: 10,
        freeDeliveryThreshold: 500,
        platformFee: 6,
        handlingFee: 15,
        surgeMultiplier: 1.0,
      },
      couponDiscount: 20,
    })

    // Base 30 + (3 extra km * 10) = 60
    expect(breakdown.deliveryFee).toBe(60)
    expect(breakdown.isFreeDelivery).toBe(false)
    expect(breakdown.handlingFee).toBe(15)
    expect(breakdown.platformFee).toBe(6)
    // Grand total = 300 + 60 + 15 + 6 - 20 = 361
    expect(breakdown.grandTotal).toBe(361)
  })

  test('calculateCheckoutPricing applies free delivery when subtotal >= freeDeliveryThreshold', () => {
    const breakdown = calculateCheckoutPricing({
      cartSubtotal: 600,
      roadDistanceKm: 8.0,
      config: {
        ...DEFAULT_PAYMENT_CONFIG,
        freeDeliveryThreshold: 500,
        baseDeliveryFee: 30,
      },
    })

    const expectedHandling = DEFAULT_PAYMENT_CONFIG.handlingFee ?? 5
    const expectedPlatform = DEFAULT_PAYMENT_CONFIG.platformFee ?? 6
    expect(breakdown.grandTotal).toBe(600 + expectedHandling + expectedPlatform)
  })

  test('calculateCheckoutPricing applies Rain and Night surge fees when active', () => {
    const breakdown = calculateCheckoutPricing({
      cartSubtotal: 200,
      roadDistanceKm: 2.0,
      config: {
        ...DEFAULT_PAYMENT_CONFIG,
        baseDeliveryFee: 30,
        isRainModeActive: true,
        rainFee: 25,
        isNightSurgeActive: true,
        nightSurgeFee: 15,
        surgeMultiplier: 1.2,
      },
    })

    // Base 30 + Surge (6) + Rain (25) + Night (15) = 76
    expect(breakdown.rainFee).toBe(25)
    expect(breakdown.nightSurgeFee).toBe(15)
    expect(breakdown.surgeFee).toBe(6)
    expect(breakdown.deliveryFee).toBe(76)
  })
})
