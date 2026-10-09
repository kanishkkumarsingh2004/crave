/**
 * app/api/calculator/route.ts
 *
 * CRAVE Pricing Preview API — Billing Engine 2.0
 *
 * This endpoint is for PREVIEW ONLY. It MUST NOT authorise payments, settlements,
 * or refunds (docs/payment_audit.md §3.1).
 *
 * The response now returns both:
 *   - `breakdown` (legacy shape — keeps all existing UI components working)
 *   - `canonical`  (new CanonicalPriceResult in paise — use for new features)
 *
 * The actual order checkout paths must persist `canonical` as `financial_snapshot`
 * on the Order record before authorising payment.
 */

import { NextResponse } from 'next/server'
import { getActivePaymentConfig } from '@/lib/dal/payments'
import { DEFAULT_PAYMENT_CONFIG } from '@/lib/payment-config'
import { calculateFullBreakdown, CalculatorInput } from '@/lib/calculator'
import { prisma } from '@/lib/prisma'
import {
  calculateOrderPrice,
  tolegacyCalculatorResult,
  type OrderPriceInput,
  type CommercialContractInput,
} from '@/lib/finance'

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
  supplierState?: string
  gstin?: string
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
      gstRatePercent,
      // New v2 fields (optional — gracefully fall back to legacy calculation)
      items, // PricingItem[] — for canonical paise calculation
      orderType = 'restaurant_food',
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
            supplier_state: true,
            gstin: true,
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
          restConfig.supplierState = rest.supplier_state || 'Karnataka'
          restConfig.gstin = rest.gstin || undefined
        }
      } catch {
        // Fallback if DB lookup fails
      }
    }

    // 3. Fetch Coupon if couponCode provided
    let couponDetails: CouponDetailsInput | undefined = undefined
    let resolvedCouponDiscountPaise = 0

    if (couponDiscount != null && Number(couponDiscount) > 0) {
      couponDetails = {
        discount_type: 'flat',
        discount_value: Number(couponDiscount),
      }
      resolvedCouponDiscountPaise = Math.round(Number(couponDiscount) * 100)
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
          // Resolve coupon discount in paise for canonical engine
          const subtotalNum = Math.max(0, Number(subtotal))
          if (subtotalNum >= (foundCoupon.min_order_amount || 0)) {
            if (foundCoupon.discount_type === 'percentage') {
              const calc = subtotalNum * foundCoupon.discount_value * 100 // paise
              resolvedCouponDiscountPaise = foundCoupon.max_discount
                ? Math.min(calc, foundCoupon.max_discount * 100)
                : calc
            } else {
              resolvedCouponDiscountPaise = foundCoupon.discount_value * 100
            }
          }
        }
      } catch {
        // Fallback if DB lookup fails
      }
    }

    // ─── LEGACY CALCULATION (backward-compatible, supports all existing UI) ──────

    const legacyInput: CalculatorInput = {
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
      gstRatePercent:
        gstRatePercent != null
          ? Number(gstRatePercent)
          : paymentConfig?.gst_rate_percent != null
            ? Number(paymentConfig.gst_rate_percent)
            : (DEFAULT_PAYMENT_CONFIG.gstRatePercent ?? 5),
    }

    const breakdown = calculateFullBreakdown(legacyInput, couponDetails)

    // ─── CANONICAL CALCULATION (new paise-based engine, used in v2 flows) ────────

    let canonical = null
    try {
      const subtotalPaise = Math.round(Math.max(0, Number(subtotal)) * 100)
      const packagingFeePaise = Math.round(
        (packagingFee != null ? Number(packagingFee) : (cfg.packagingCap ?? 20)) * 100
      )
      const platformFeePaise = Math.round(cfg.platformFee * 100)
      const handlingFeePaise = Math.round(cfg.handlingFee * 100)
      const tipPaise = Math.round(Math.max(0, Number(tip)) * 100)
      const roadDistanceKm = Math.max(0.1, Number(distanceKm))

      const contractInput: CommercialContractInput = {
        commercialModel: (restConfig.commercialModel || 'commission') as any,
        commissionRatePercent: restConfig.vendorCommissionPercent ?? cfg.vendorCommission,
        markupRatePercent: restConfig.markupPercent ?? 0,
        fixedCommissionPaise: Math.round((restConfig.fixedCommission ?? 0) * 100),
        fixedMarkupPaise: Math.round((restConfig.fixedMarkup ?? 0) * 100),
        priceTaxMode: (restConfig.priceTaxMode || 'TAX_INCLUSIVE') as any,
        gstStatus: 'REGISTERED',
        supplierState: restConfig.supplierState || 'Karnataka',
        restaurantGstin: restConfig.gstin,
      }

      // If item-level data provided (v2 callers), use it; otherwise synthesise a single item
      const pricingItems =
        Array.isArray(items) && items.length > 0
          ? items.map((it: any) => ({
              name: it.name || 'Item',
              quantity: Math.max(1, Number(it.quantity) || 1),
              unitPricePaise: Math.round(
                Number(it.price || it.unitPricePaise || 0) * (it.unitPricePaise ? 1 : 100)
              ),
              hsnSacCode: it.hsnSacCode || '996331',
              priceTaxMode: (it.priceTaxMode || contractInput.priceTaxMode) as any,
              customCommissionRatePercent: it.customCommissionRatePercent,
              customMarkupRatePercent: it.customMarkupRatePercent,
            }))
          : [
              {
                name: 'Order Items',
                quantity: 1,
                unitPricePaise: subtotalPaise,
                hsnSacCode: '996331',
                priceTaxMode: contractInput.priceTaxMode as any,
              },
            ]

      const priceInput: OrderPriceInput = {
        orderType: orderType === 'cravexp_grocery' ? 'cravexp_grocery' : 'restaurant_food',
        restaurantId: restaurantId || undefined,
        restaurantName: restConfig.restaurantName || 'Partner Restaurant',
        supplierState: restConfig.supplierState || 'Karnataka',
        items: pricingItems,
        delivery: {
          baseDeliveryFeePaise: Math.round(cfg.baseDeliveryFee * 100),
          baseDistanceKm: cfg.baseDistanceKm,
          perKmRatePaise: Math.round(cfg.perKmRate * 100),
          freeDeliveryThresholdPaise: Math.round(cfg.freeDeliveryThreshold * 100),
          roadDistanceKm,
        },
        surcharges: {
          surgeMultiplier: cfg.surgeMultiplier,
          rainFeePaise: Math.round(cfg.rainFee * 100),
          nightSurgeFeePaise: Math.round(cfg.nightSurgeFee * 100),
          isRainActive: cfg.isRainModeActive,
          isNightSurgeActive: cfg.isNightSurgeActive,
        },
        platformFeePaise,
        handlingFeePaise,
        packagingFeePaise,
        couponDiscountPaise: resolvedCouponDiscountPaise,
        tipPaise,
        contract: contractInput,
      }

      canonical = calculateOrderPrice(priceInput)
    } catch (canonicalErr) {
      console.error(
        '[Calculator] Canonical engine error (non-fatal, legacy result returned):',
        canonicalErr
      )
    }

    return NextResponse.json({
      success: true,
      breakdown, // legacy shape — all existing UI continues to work
      canonical, // new paise-based canonical result (null if error)
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
    const gstRatePercent =
      searchParams.get('gstRatePercent') != null
        ? Number(searchParams.get('gstRatePercent'))
        : undefined

    const postReq = new Request(req.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subtotal, distanceKm, couponCode, restaurantId, tip, gstRatePercent }),
    })

    return POST(postReq)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Calculation error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
