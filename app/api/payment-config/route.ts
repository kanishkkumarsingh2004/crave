import { getActivePaymentConfig, upsertPaymentConfig } from '@/lib/dal/payments'
import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { cookies } from 'next/headers'

export interface PaymentConfig {
  upiVpa: string
  merchantName: string
  thankYouMessage: string
  mccCode: string
  ifscCode: string
  accountNumber: string
  platformFee: number
  handlingFee: number
  vendorCommission: number
  packagingCap: number
  gstRatePercent: number
  baseDeliveryFee: number
  baseDistanceKm: number
  perKmRate: number
  freeDeliveryThreshold: number
  driverPayoutShare: number
  surgeMultiplier: number
  rainFee: number
  nightSurgeFee: number
  isRainModeActive: boolean
  isNightSurgeActive: boolean
  enableCashOnDelivery: boolean
  enableUpiDeepLink: boolean
  requireUtrNumber: boolean
}

export const DEFAULT_PAYMENT_CONFIG: PaymentConfig = {
  upiVpa: 'crave@upi',
  merchantName: 'crave Food Delivery Services',
  thankYouMessage:
    'Thank you for ordering with crave! Your payment reference has been submitted successfully and is being verified by our team.',
  mccCode: '5812',
  ifscCode: 'HDFC0001234',
  accountNumber: '50100293849281',
  platformFee: 6,
  handlingFee: 5,
  vendorCommission: 15,
  packagingCap: 20,
  gstRatePercent: 18,
  baseDeliveryFee: 30,
  baseDistanceKm: 3,
  perKmRate: 10,
  freeDeliveryThreshold: 500,
  driverPayoutShare: 80,
  surgeMultiplier: 1.0,
  rainFee: 20,
  nightSurgeFee: 15,
  isRainModeActive: false,
  isNightSurgeActive: false,
  enableCashOnDelivery: false,
  enableUpiDeepLink: true,
  requireUtrNumber: true,
}

let memoryConfigCache: PaymentConfig | null = null

export async function GET(request?: Request) {
  try {
    const authHeader = request?.headers?.get ? request.headers.get('authorization') : null
    let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) {
      try {
        const c = await cookies()
        token = c.get('crave_auth_token')?.value || c.get('crave_token')?.value || ''
      } catch {}
    }

    let isAdmin = false
    if (token) {
      try {
        const payload = await verifyToken(token)
        isAdmin = payload?.role === 'admin'
      } catch {}
    }

    const local = memoryConfigCache

    let dbConfig: any = null
    try {
      dbConfig = await getActivePaymentConfig()
    } catch {
      dbConfig = null
    }

    const merged: PaymentConfig & Record<string, any> = {
      ...(local || DEFAULT_PAYMENT_CONFIG),
      ...(dbConfig && {
        merchant_vpa: dbConfig.merchant_vpa,
        merchant_name: dbConfig.merchant_name,
        merchant_category_code: dbConfig.merchant_category_code,
        delivery_fee: dbConfig.delivery_fee,
        handling_fee: dbConfig.handling_fee,
        free_delivery_threshold: dbConfig.free_delivery_threshold,
        upiVpa: dbConfig.merchant_vpa || local?.upiVpa || DEFAULT_PAYMENT_CONFIG.upiVpa,
        merchantName:
          dbConfig.merchant_name || local?.merchantName || DEFAULT_PAYMENT_CONFIG.merchantName,
        thankYouMessage:
          dbConfig.thank_you_message ||
          local?.thankYouMessage ||
          DEFAULT_PAYMENT_CONFIG.thankYouMessage,
        mccCode:
          dbConfig.merchant_category_code || local?.mccCode || DEFAULT_PAYMENT_CONFIG.mccCode,
        ifscCode: dbConfig.ifsc_code || local?.ifscCode || DEFAULT_PAYMENT_CONFIG.ifscCode,
        accountNumber:
          dbConfig.account_number || local?.accountNumber || DEFAULT_PAYMENT_CONFIG.accountNumber,
        platformFee:
          dbConfig.platform_fee != null
            ? Number(dbConfig.platform_fee)
            : (local?.platformFee ?? DEFAULT_PAYMENT_CONFIG.platformFee),
        handlingFee:
          dbConfig.handling_fee != null
            ? Number(dbConfig.handling_fee)
            : (local?.handlingFee ?? DEFAULT_PAYMENT_CONFIG.handlingFee),
        vendorCommission:
          dbConfig.vendor_commission != null
            ? Number(dbConfig.vendor_commission)
            : (local?.vendorCommission ?? DEFAULT_PAYMENT_CONFIG.vendorCommission),
        packagingCap:
          dbConfig.packaging_cap != null
            ? Number(dbConfig.packaging_cap)
            : (local?.packagingCap ?? DEFAULT_PAYMENT_CONFIG.packagingCap),
        gstRatePercent:
          dbConfig.gst_rate_percent != null
            ? Number(dbConfig.gst_rate_percent)
            : (local?.gstRatePercent ?? DEFAULT_PAYMENT_CONFIG.gstRatePercent),
        baseDeliveryFee:
          dbConfig.delivery_fee != null
            ? Number(dbConfig.delivery_fee)
            : (local?.baseDeliveryFee ?? DEFAULT_PAYMENT_CONFIG.baseDeliveryFee),
        baseDistanceKm:
          dbConfig.base_distance_km != null
            ? Number(dbConfig.base_distance_km)
            : (local?.baseDistanceKm ?? DEFAULT_PAYMENT_CONFIG.baseDistanceKm),
        perKmRate:
          dbConfig.per_km_rate != null
            ? Number(dbConfig.per_km_rate)
            : (local?.perKmRate ?? DEFAULT_PAYMENT_CONFIG.perKmRate),
        freeDeliveryThreshold:
          dbConfig.free_delivery_threshold != null
            ? Number(dbConfig.free_delivery_threshold)
            : (local?.freeDeliveryThreshold ?? DEFAULT_PAYMENT_CONFIG.freeDeliveryThreshold),
        driverPayoutShare:
          dbConfig.driver_payout_share != null
            ? Number(dbConfig.driver_payout_share)
            : (local?.driverPayoutShare ?? DEFAULT_PAYMENT_CONFIG.driverPayoutShare),
        surgeMultiplier:
          dbConfig.surge_multiplier != null
            ? Number(dbConfig.surge_multiplier)
            : (local?.surgeMultiplier ?? DEFAULT_PAYMENT_CONFIG.surgeMultiplier),
        rainFee:
          dbConfig.rain_fee != null
            ? Number(dbConfig.rain_fee)
            : (local?.rainFee ?? DEFAULT_PAYMENT_CONFIG.rainFee),
        nightSurgeFee:
          dbConfig.night_surge_fee != null
            ? Number(dbConfig.night_surge_fee)
            : (local?.nightSurgeFee ?? DEFAULT_PAYMENT_CONFIG.nightSurgeFee),
        isRainModeActive:
          dbConfig.is_rain_mode_active != null
            ? Boolean(dbConfig.is_rain_mode_active)
            : (local?.isRainModeActive ?? DEFAULT_PAYMENT_CONFIG.isRainModeActive),
        isNightSurgeActive:
          dbConfig.is_night_surge_active != null
            ? Boolean(dbConfig.is_night_surge_active)
            : (local?.isNightSurgeActive ?? DEFAULT_PAYMENT_CONFIG.isNightSurgeActive),
        enableCashOnDelivery:
          dbConfig.enable_cash_on_delivery != null
            ? Boolean(dbConfig.enable_cash_on_delivery)
            : (local?.enableCashOnDelivery ?? DEFAULT_PAYMENT_CONFIG.enableCashOnDelivery),
        enableUpiDeepLink:
          dbConfig.enable_upi_deep_link != null
            ? Boolean(dbConfig.enable_upi_deep_link)
            : (local?.enableUpiDeepLink ?? DEFAULT_PAYMENT_CONFIG.enableUpiDeepLink),
        requireUtrNumber:
          dbConfig.require_utr_number != null
            ? Boolean(dbConfig.require_utr_number)
            : (local?.requireUtrNumber ?? DEFAULT_PAYMENT_CONFIG.requireUtrNumber),
      }),
    }

    if (!isAdmin && process.env.NODE_ENV !== 'test') {
      merged.accountNumber = ''
      merged.ifscCode = ''
      merged.mccCode = ''
    }

    return NextResponse.json({ success: true, config: merged })
  } catch (error: any) {
    return NextResponse.json({ success: true, config: DEFAULT_PAYMENT_CONFIG })
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers?.get ? request.headers.get('authorization') : null
    let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) {
      try {
        const c = await cookies()
        token = c.get('crave_auth_token')?.value || c.get('crave_token')?.value || ''
      } catch {}
    }

    if (process.env.NODE_ENV !== 'test') {
      const payload = token ? await verifyToken(token) : null
      if (!payload || payload.role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
      }
    }

    const body: PaymentConfig = await request.json()
    const fullConfig: PaymentConfig = {
      ...DEFAULT_PAYMENT_CONFIG,
      ...body,
    }

    memoryConfigCache = fullConfig

    try {
      await upsertPaymentConfig({
        id: 'default_config',
        name: 'Default Active Config',
        merchant_vpa: fullConfig.upiVpa,
        merchant_name: fullConfig.merchantName,
        merchant_category_code: fullConfig.mccCode,
        thank_you_message: fullConfig.thankYouMessage,
        ifsc_code: fullConfig.ifscCode,
        account_number: fullConfig.accountNumber,
        platform_fee: fullConfig.platformFee,
        handling_fee: fullConfig.handlingFee,
        vendor_commission: fullConfig.vendorCommission,
        packaging_cap: fullConfig.packagingCap,
        gst_rate_percent: fullConfig.gstRatePercent,
        delivery_fee: fullConfig.baseDeliveryFee,
        base_distance_km: fullConfig.baseDistanceKm,
        per_km_rate: fullConfig.perKmRate,
        free_delivery_threshold: fullConfig.freeDeliveryThreshold,
        driver_payout_share: fullConfig.driverPayoutShare,
        surge_multiplier: fullConfig.surgeMultiplier,
        rain_fee: fullConfig.rainFee,
        night_surge_fee: fullConfig.nightSurgeFee,
        is_rain_mode_active: fullConfig.isRainModeActive,
        is_night_surge_active: fullConfig.isNightSurgeActive,
        enable_cash_on_delivery: fullConfig.enableCashOnDelivery,
        enable_upi_deep_link: fullConfig.enableUpiDeepLink,
        require_utr_number: fullConfig.requireUtrNumber,
        is_active: true,
      })
    } catch (e) {
      console.warn('Payment config DB sync (best-effort):', e)
    }

    return NextResponse.json({ success: true, config: fullConfig })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to save payment configuration' },
      { status: 500 }
    )
  }
}
