import { NextResponse } from 'next/server'
import { fetchOSRMDrivingDistanceKm, calculateCheckoutPricing } from '@/lib/distance-pricing'
import { fetchOSRMDrivingRoutes } from '@/lib/route-service'
import { getActivePaymentConfig } from '@/lib/dal/payments'
import { DEFAULT_PAYMENT_CONFIG } from '@/lib/payment-config'

export const revalidate = 0

async function getPaymentConfig() {
  try {
    const dbConfig: any = await getActivePaymentConfig()
    if (!dbConfig) return DEFAULT_PAYMENT_CONFIG
    return {
      ...DEFAULT_PAYMENT_CONFIG,
      platformFee:
        dbConfig.platform_fee != null
          ? Number(dbConfig.platform_fee)
          : DEFAULT_PAYMENT_CONFIG.platformFee,
      handlingFee:
        dbConfig.handling_fee != null
          ? Number(dbConfig.handling_fee)
          : DEFAULT_PAYMENT_CONFIG.handlingFee,
      vendorCommission:
        dbConfig.vendor_commission != null
          ? Number(dbConfig.vendor_commission)
          : DEFAULT_PAYMENT_CONFIG.vendorCommission,
      baseDeliveryFee:
        dbConfig.delivery_fee != null
          ? Number(dbConfig.delivery_fee)
          : DEFAULT_PAYMENT_CONFIG.baseDeliveryFee,
      baseDistanceKm:
        dbConfig.base_distance_km != null
          ? Number(dbConfig.base_distance_km)
          : DEFAULT_PAYMENT_CONFIG.baseDistanceKm,
      perKmRate:
        dbConfig.per_km_rate != null
          ? Number(dbConfig.per_km_rate)
          : DEFAULT_PAYMENT_CONFIG.perKmRate,
      freeDeliveryThreshold:
        dbConfig.free_delivery_threshold != null
          ? Number(dbConfig.free_delivery_threshold)
          : DEFAULT_PAYMENT_CONFIG.freeDeliveryThreshold,
      driverPayoutShare:
        dbConfig.driver_payout_share != null
          ? Number(dbConfig.driver_payout_share)
          : DEFAULT_PAYMENT_CONFIG.driverPayoutShare,
      surgeMultiplier:
        dbConfig.surge_multiplier != null
          ? Number(dbConfig.surge_multiplier)
          : DEFAULT_PAYMENT_CONFIG.surgeMultiplier,
      rainFee:
        dbConfig.rain_fee != null ? Number(dbConfig.rain_fee) : DEFAULT_PAYMENT_CONFIG.rainFee,
      nightSurgeFee:
        dbConfig.night_surge_fee != null
          ? Number(dbConfig.night_surge_fee)
          : DEFAULT_PAYMENT_CONFIG.nightSurgeFee,
      isRainModeActive: dbConfig.is_rain_mode_active ?? DEFAULT_PAYMENT_CONFIG.isRainModeActive,
      isNightSurgeActive:
        dbConfig.is_night_surge_active ?? DEFAULT_PAYMENT_CONFIG.isNightSurgeActive,
    }
  } catch {
    return DEFAULT_PAYMENT_CONFIG
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startLat = parseFloat(searchParams.get('startLat') || searchParams.get('restLat') || '0')
    const startLng = parseFloat(searchParams.get('startLng') || searchParams.get('restLng') || '0')
    const destLat = parseFloat(searchParams.get('destLat') || searchParams.get('endLat') || '0')
    const destLng = parseFloat(searchParams.get('destLng') || searchParams.get('endLng') || '0')
    const subtotal = parseFloat(searchParams.get('subtotal') || '0')
    const couponDiscount = parseFloat(searchParams.get('couponDiscount') || '0')

    const config = await getPaymentConfig()

    let roadDistanceKm = 1.8
    let durationSeconds = 0
    let coordinates: [number, number][] = []

    if (startLat && startLng && destLat && destLng) {
      const routes = await fetchOSRMDrivingRoutes(startLng, startLat, destLng, destLat, false)
      if (routes.length > 0) {
        roadDistanceKm = Number((routes[0].distance / 1000).toFixed(1))
        durationSeconds = routes[0].duration
        coordinates = routes[0].coordinates
      } else {
        roadDistanceKm = await fetchOSRMDrivingDistanceKm(startLat, startLng, destLat, destLng)
      }
    }

    const pricing = calculateCheckoutPricing({
      cartSubtotal: subtotal,
      roadDistanceKm,
      config,
      couponDiscount,
    })

    return NextResponse.json({
      success: true,
      origin: { lat: startLat, lng: startLng },
      destination: { lat: destLat, lng: destLng },
      roadDistanceKm,
      durationSeconds,
      coordinates,
      pricing,
      config,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to compute distance pricing' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const startLat = parseFloat(body.startLat || body.restLat || '0')
    const startLng = parseFloat(body.startLng || body.restLng || '0')
    const destLat = parseFloat(body.destLat || body.endLat || '0')
    const destLng = parseFloat(body.destLng || body.endLng || '0')
    const subtotal = parseFloat(body.subtotal || '0')
    const couponDiscount = parseFloat(body.couponDiscount || '0')

    const config = await getPaymentConfig()

    let roadDistanceKm = 1.8
    let durationSeconds = 0
    let coordinates: [number, number][] = []

    if (startLat && startLng && destLat && destLng) {
      const routes = await fetchOSRMDrivingRoutes(startLng, startLat, destLng, destLat, false)
      if (routes.length > 0) {
        roadDistanceKm = Number((routes[0].distance / 1000).toFixed(1))
        durationSeconds = routes[0].duration
        coordinates = routes[0].coordinates
      } else {
        roadDistanceKm = await fetchOSRMDrivingDistanceKm(startLat, startLng, destLat, destLng)
      }
    }

    const pricing = calculateCheckoutPricing({
      cartSubtotal: subtotal,
      roadDistanceKm,
      config,
      couponDiscount,
    })

    return NextResponse.json({
      success: true,
      origin: { lat: startLat, lng: startLng },
      destination: { lat: destLat, lng: destLng },
      roadDistanceKm,
      durationSeconds,
      coordinates,
      pricing,
      config,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to compute distance pricing' },
      { status: 500 }
    )
  }
}
