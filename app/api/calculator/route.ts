import { NextResponse } from 'next/server'
import { getActivePaymentConfig } from '@/lib/dal/payments'
import { DEFAULT_PAYMENT_CONFIG } from '@/lib/payment-config'
import { calculateFullBreakdown, CalculatorInput } from '@/lib/calculator'
import { prisma } from '@/lib/prisma'

export const revalidate = 0

interface CouponDetailsInput {
  discount_type: 'percentage' | 'flat'
  discount_value: number
  max_discount?: number | null
  min_order_amount?: number
}

interface ResolvedRestaurantConfig {
  restaurantName?: string
  commercialModel?: string
  vendorCommissionPercent?: number
  markupPercent?: number
  fixedCommission?: number
  fixedMarkup?: number
  priceTaxMode?: string
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      subtotal = 0,
      distanceKm = 1.8,
      packagingFee,
      tip = 0,
      couponCode,
      couponDiscount,
      restaurantId,
      restaurantName,
      vendorCommissionPercent,
      commercialModel,
      markupPercent,
      fixedCommission,
      fixedMarkup,
      priceTaxMode,
    } = body

    // 1. Fetch active Payment Config from DB
    let paymentConfig = null
    try {
      paymentConfig = await getActivePaymentConfig()
    } catch {
      paymentConfig = null
    }

    const cfg = {
      platformFee:
        paymentConfig?.platform_fee != null
          ? Number(paymentConfig.platform_fee)
          : DEFAULT_PAYMENT_CONFIG.platformFee,
      handlingFee:
        paymentConfig?.handling_fee != null
          ? Number(paymentConfig.handling_fee)
          : DEFAULT_PAYMENT_CONFIG.handlingFee,
      vendorCommission:
        vendorCommissionPercent ??
        (paymentConfig?.vendor_commission != null
          ? Number(paymentConfig.vendor_commission)
          : DEFAULT_PAYMENT_CONFIG.vendorCommission),
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
    }

    // 2. Fetch Restaurant & Active Commercial Contract if restaurantId provided
    const restConfig: ResolvedRestaurantConfig = {
      restaurantName,
      commercialModel,
      vendorCommissionPercent: cfg.vendorCommission,
      markupPercent,
      fixedCommission,
      fixedMarkup,
      priceTaxMode,
    }

    if (restaurantId) {
      try {
        const rest = await prisma.restaurant.findUnique({
          where: { id: String(restaurantId) },
          select: {
            id: true,
            name: true,
            commercial_model: true,
            commission_rate: true,
            markup_rate: true,
            fixed_commission: true,
            fixed_markup: true,
            price_tax_mode: true,
            commercial_contracts: {
              where: { status: 'ACTIVE' },
              orderBy: { effective_from: 'desc' },
              take: 1,
            },
          },
        })

        if (rest) {
          const contract = rest.commercial_contracts?.[0]
          restConfig.restaurantName = rest.name
          restConfig.commercialModel =
            contract?.commercial_model || rest.commercial_model || 'commission'
          restConfig.vendorCommissionPercent =
            contract?.commission_rate != null
              ? Number(contract.commission_rate)
              : rest.commission_rate != null
                ? Number(rest.commission_rate)
                : cfg.vendorCommission
          restConfig.markupPercent =
            contract?.markup_rate != null
              ? Number(contract.markup_rate)
              : rest.markup_rate != null
                ? Number(rest.markup_rate)
                : 0
          restConfig.fixedCommission =
            contract?.fixed_commission != null
              ? Number(contract.fixed_commission)
              : rest.fixed_commission != null
                ? Number(rest.fixed_commission)
                : 0
          restConfig.fixedMarkup =
            contract?.fixed_markup != null
              ? Number(contract.fixed_markup)
              : rest.fixed_markup != null
                ? Number(rest.fixed_markup)
                : 0
          restConfig.priceTaxMode =
            contract?.price_tax_mode || rest.price_tax_mode || 'TAX_INCLUSIVE'
        }
      } catch {
        // Fallback if DB lookup fails
      }
    }

    // 3. Fetch Coupon if couponCode provided
    let couponDetails: CouponDetailsInput | undefined = undefined
    if (couponDiscount != null && Number(couponDiscount) > 0) {
      couponDetails = {
        discount_type: 'flat',
        discount_value: Number(couponDiscount),
      }
    } else if (couponCode) {
      try {
        const foundCoupon = await prisma.coupon.findUnique({
          where: { code: String(couponCode).trim().toUpperCase() },
        })
        if (foundCoupon && foundCoupon.is_active) {
          couponDetails = {
            discount_type: foundCoupon.discount_type === 'percentage' ? 'percentage' : 'flat',
            discount_value: foundCoupon.discount_value,
            max_discount: foundCoupon.max_discount,
            min_order_amount: foundCoupon.min_order_amount,
          }
        }
      } catch {
        // Fallback if DB lookup fails
      }
    }

    // 4. Construct CalculatorInput
    const input: CalculatorInput = {
      subtotal: Math.max(0, Number(subtotal)),
      distanceKm: Math.max(0.1, Number(distanceKm)),
      packagingFee: packagingFee != null ? Number(packagingFee) : (cfg.packagingCap ?? 20),
      tip: Math.max(0, Number(tip)),
      restaurantId: restaurantId ? String(restaurantId) : undefined,
      restaurantName: restConfig.restaurantName,
      commercialModel: restConfig.commercialModel,
      vendorCommissionPercent: restConfig.vendorCommissionPercent,
      markupPercent: restConfig.markupPercent,
      fixedCommission: restConfig.fixedCommission,
      fixedMarkup: restConfig.fixedMarkup,
      priceTaxMode: restConfig.priceTaxMode,
      platformFee: cfg.platformFee,
      handlingFee: cfg.handlingFee,
      baseDeliveryFee: cfg.baseDeliveryFee,
      baseDistanceKm: cfg.baseDistanceKm,
      perKmRate: cfg.perKmRate,
      freeDeliveryThreshold: cfg.freeDeliveryThreshold,
      driverPayoutSharePercent: cfg.driverPayoutShare,
      surgeMultiplier: cfg.surgeMultiplier,
      rainFee: cfg.rainFee,
      nightSurgeFee: cfg.nightSurgeFee,
      isRainModeActive: cfg.isRainModeActive,
      isNightSurgeActive: cfg.isNightSurgeActive,
    }

    const breakdown = calculateFullBreakdown(input, couponDetails)

    return NextResponse.json({
      success: true,
      breakdown,
      config: cfg,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Calculation error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const subtotal = Number(searchParams.get('subtotal') || 0)
    const distanceKm = Number(searchParams.get('distanceKm') || 1.8)
    const couponCode = searchParams.get('couponCode') || undefined
    const restaurantId = searchParams.get('restaurantId') || undefined
    const tip = Number(searchParams.get('tip') || 0)

    const postReq = new Request(req.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subtotal, distanceKm, couponCode, restaurantId, tip }),
    })

    return POST(postReq)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Calculation error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
