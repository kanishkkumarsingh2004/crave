import {
  checkDeliveryServiceability,
  isWithinCityServiceBounds,
  isValidCoordinate,
  BENGALURU_SERVICE_BOUNDS,
  MAX_RESTAURANT_DELIVERY_RADIUS_KM,
} from '@/lib/serviceability'

describe('Delivery Serviceability Engine', () => {
  test('isValidCoordinate validates latitude and longitude ranges', () => {
    expect(isValidCoordinate(12.9716, 77.5946)).toBe(true)
    expect(isValidCoordinate(null, 77.5946)).toBe(false)
    expect(isValidCoordinate(12.9716, undefined)).toBe(false)
    expect(isValidCoordinate(0, 0)).toBe(false)
    expect(isValidCoordinate(95, 77)).toBe(false)
    expect(isValidCoordinate(12, 190)).toBe(false)
    expect(isValidCoordinate(NaN, 77)).toBe(false)
  })

  test('isWithinCityServiceBounds checks Bengaluru coverage bounds', () => {
    // MG Road, Bengaluru
    expect(isWithinCityServiceBounds(12.9756, 77.6066)).toBe(true)
    // Whitefield, Bengaluru
    expect(isWithinCityServiceBounds(12.9698, 77.7499)).toBe(true)
    // Electronic City, Bengaluru
    expect(isWithinCityServiceBounds(12.8399, 77.677)).toBe(true)

    // Delhi (Outside Bengaluru)
    expect(isWithinCityServiceBounds(28.6139, 77.209)).toBe(false)
    // Mumbai (Outside Bengaluru)
    expect(isWithinCityServiceBounds(19.076, 72.8777)).toBe(false)
  })

  test('checkDeliveryServiceability returns error for invalid coordinates', () => {
    const res = checkDeliveryServiceability({ customerLat: null, customerLng: null })
    expect(res.isServiceable).toBe(false)
    expect(res.reason).toMatch(/Invalid or missing delivery coordinates/i)
  })

  test('checkDeliveryServiceability returns unserviceable when outside city limits', () => {
    const res = checkDeliveryServiceability({
      customerLat: 19.076,
      customerLng: 72.8777,
    })
    expect(res.isServiceable).toBe(false)
    expect(res.reason).toMatch(/Bengaluru region/i)
  })

  test('checkDeliveryServiceability approves location within city bounds', () => {
    const res = checkDeliveryServiceability({
      customerLat: 12.9716,
      customerLng: 77.5946,
    })
    expect(res.isServiceable).toBe(true)
  })

  test('checkDeliveryServiceability enforces maximum restaurant delivery radius', () => {
    const kitchenLat = 12.9716
    const kitchenLng = 77.5946

    // Near location (~3 km)
    const nearRes = checkDeliveryServiceability({
      customerLat: 12.99,
      customerLng: 77.61,
      restaurantLat: kitchenLat,
      restaurantLng: kitchenLng,
    })
    expect(nearRes.isServiceable).toBe(true)
    expect(nearRes.distanceKm).toBeDefined()
    expect(nearRes.estimatedMinutes).toBeDefined()

    // Location within boundary but too far from this kitchen (> 25km)
    // Bidadi / edge of metro
    const farRes = checkDeliveryServiceability({
      customerLat: 12.65,
      customerLng: 77.25,
      restaurantLat: kitchenLat,
      restaurantLng: kitchenLng,
    })
    expect(farRes.isServiceable).toBe(false)
    expect(farRes.reason).toMatch(/exceeds our maximum delivery radius/i)
  })
})
