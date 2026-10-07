import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getActivePaymentConfig } from '@/lib/dal/payments'
import { DEFAULT_PAYMENT_CONFIG } from '@/lib/payment-config'

export const revalidate = 0

export async function GET() {
  try {
    // 1. Fetch Payment Config from DB
    let paymentConfig = null
    try {
      paymentConfig = await getActivePaymentConfig()
    } catch {
      paymentConfig = null
    }

    const mergedConfig = {
      platformFee:
        paymentConfig?.platform_fee != null
          ? Number(paymentConfig.platform_fee)
          : DEFAULT_PAYMENT_CONFIG.platformFee,
      handlingFee:
        paymentConfig?.handling_fee != null
          ? Number(paymentConfig.handling_fee)
          : DEFAULT_PAYMENT_CONFIG.handlingFee,
      vendorCommission:
        paymentConfig?.vendor_commission != null
          ? Number(paymentConfig.vendor_commission)
          : DEFAULT_PAYMENT_CONFIG.vendorCommission,
      packagingCap:
        paymentConfig?.packaging_cap != null
          ? Number(paymentConfig.packaging_cap)
          : DEFAULT_PAYMENT_CONFIG.packagingCap,
      baseDeliveryFee:
        paymentConfig?.delivery_fee != null
          ? Number(paymentConfig.delivery_fee)
          : DEFAULT_PAYMENT_CONFIG.baseDeliveryFee,
      baseDistanceKm:
        paymentConfig?.base_distance_km != null
          ? Number(paymentConfig.base_distance_km)
          : DEFAULT_PAYMENT_CONFIG.baseDistanceKm,
      perKmRate:
        paymentConfig?.per_km_rate != null
          ? Number(paymentConfig.per_km_rate)
          : DEFAULT_PAYMENT_CONFIG.perKmRate,
      freeDeliveryThreshold:
        paymentConfig?.free_delivery_threshold != null
          ? Number(paymentConfig.free_delivery_threshold)
          : DEFAULT_PAYMENT_CONFIG.freeDeliveryThreshold,
      driverPayoutShare:
        paymentConfig?.driver_payout_share != null
          ? Number(paymentConfig.driver_payout_share)
          : DEFAULT_PAYMENT_CONFIG.driverPayoutShare,
      surgeMultiplier:
        paymentConfig?.surge_multiplier != null
          ? Number(paymentConfig.surge_multiplier)
          : DEFAULT_PAYMENT_CONFIG.surgeMultiplier,
      rainFee:
        paymentConfig?.rain_fee != null
          ? Number(paymentConfig.rain_fee)
          : DEFAULT_PAYMENT_CONFIG.rainFee,
      nightSurgeFee:
        paymentConfig?.night_surge_fee != null
          ? Number(paymentConfig.night_surge_fee)
          : DEFAULT_PAYMENT_CONFIG.nightSurgeFee,
      isRainModeActive:
        paymentConfig?.is_rain_mode_active ?? DEFAULT_PAYMENT_CONFIG.isRainModeActive,
      isNightSurgeActive:
        paymentConfig?.is_night_surge_active ?? DEFAULT_PAYMENT_CONFIG.isNightSurgeActive,
      enableCashOnDelivery:
        paymentConfig?.enable_cash_on_delivery ?? DEFAULT_PAYMENT_CONFIG.enableCashOnDelivery,
      enableUpiDeepLink:
        paymentConfig?.enable_upi_deep_link ?? DEFAULT_PAYMENT_CONFIG.enableUpiDeepLink,
      requireUtrNumber:
        paymentConfig?.require_utr_number ?? DEFAULT_PAYMENT_CONFIG.requireUtrNumber,
    }

    // 2. Fetch Restaurants from DB
    let restaurants: any[] = []
    try {
      restaurants = await prisma.restaurant.findMany({
        select: {
          id: true,
          name: true,
          cuisine: true,
          rating: true,
          commission_rate: true,
          payment_model: true,
          is_open: true,
          cost_for_two: true,
        },
        orderBy: { name: 'asc' },
        take: 30,
      })
    } catch (e) {
      console.warn('Failed to fetch restaurants for calculator:', e)
    }

    // 3. Fetch Coupons from DB
    let coupons: any[] = []
    try {
      coupons = await prisma.coupon.findMany({
        where: { is_active: true },
        select: {
          id: true,
          code: true,
          description: true,
          discount_type: true,
          discount_value: true,
          min_order_amount: true,
          max_discount: true,
          used_count: true,
        },
        orderBy: { created_at: 'desc' },
      })
    } catch (e) {
      console.warn('Failed to fetch coupons for calculator:', e)
    }

    // 4. Fetch Recent Orders from DB
    let orders: any[] = []
    try {
      orders = await prisma.order.findMany({
        select: {
          id: true,
          customer_name: true,
          restaurant_name: true,
          restaurant_id: true,
          order_type: true,
          status: true,
          subtotal: true,
          packaging_fee: true,
          gst: true,
          total_amount: true,
          tip: true,
          discount_amount: true,
          coupon_code: true,
          driver_name: true,
          created_at: true,
        },
        orderBy: { created_at: 'desc' },
        take: 20,
      })
    } catch (e) {
      console.warn('Failed to fetch orders for calculator:', e)
    }

    // 5. Fetch Vendor Settlements from DB
    let vendorSettlements: any[] = []
    try {
      vendorSettlements = await prisma.vendorSettlement.findMany({
        select: {
          id: true,
          restaurant_name: true,
          gross_sales: true,
          commission_rate: true,
          commission_amount: true,
          net_payout: true,
          status: true,
          payout_date: true,
        },
        orderBy: { payout_date: 'desc' },
        take: 15,
      })
    } catch (e) {
      console.warn('Failed to fetch vendor settlements for calculator:', e)
    }

    // 6. Fetch Driver Payouts from DB
    let driverPayouts: any[] = []
    try {
      driverPayouts = await prisma.driverPayout.findMany({
        select: {
          id: true,
          driver_id: true,
          amount: true,
          status: true,
          created_at: true,
          driver: {
            select: { name: true, phone: true },
          },
        },
        orderBy: { created_at: 'desc' },
        take: 15,
      })
    } catch (e) {
      console.warn('Failed to fetch driver payouts for calculator:', e)
    }

    return NextResponse.json({
      success: true,
      dbData: {
        paymentConfig: mergedConfig,
        restaurants,
        coupons,
        orders,
        vendorSettlements,
        driverPayouts,
        fetchedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Error loading DB calculator data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to query database values' },
      { status: 500 }
    )
  }
}
