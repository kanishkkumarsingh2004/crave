import { getActivePaymentConfig, upsertPaymentConfig } from '@/lib/dal/payments'
import { NextResponse } from 'next/server'
import { getApiActor, requireAdmin, handleApiAuthError } from '@/lib/api-auth'
import { DEFAULT_PAYMENT_CONFIG, type PaymentConfig } from '@/lib/payment-config'

export async function GET(request?: Request) {
  try {
    const actor = await getApiActor(request || new Request('http://localhost'))
    const isAdmin = actor?.role === 'admin'

    const dbConfig: any = await getActivePaymentConfig()

    const merged: PaymentConfig & Record<string, any> = {
      ...DEFAULT_PAYMENT_CONFIG,
      ...(dbConfig && {
        merchant_vpa: dbConfig.merchant_vpa,
        merchant_name: dbConfig.merchant_name,
        merchant_category_code: dbConfig.merchant_category_code,
        delivery_fee: dbConfig.delivery_fee,
        handling_fee: dbConfig.handling_fee,
        free_delivery_threshold: dbConfig.free_delivery_threshold,
        upiVpa: dbConfig.merchant_vpa || DEFAULT_PAYMENT_CONFIG.upiVpa,
        merchantName: dbConfig.merchant_name || DEFAULT_PAYMENT_CONFIG.merchantName,
        thankYouMessage: dbConfig.thank_you_message || DEFAULT_PAYMENT_CONFIG.thankYouMessage,
        mccCode: dbConfig.merchant_category_code || DEFAULT_PAYMENT_CONFIG.mccCode,
        ifscCode: dbConfig.ifsc_code || DEFAULT_PAYMENT_CONFIG.ifscCode,
        accountNumber: dbConfig.account_number || DEFAULT_PAYMENT_CONFIG.accountNumber,
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
        packagingCap:
          dbConfig.packaging_cap != null
            ? Number(dbConfig.packaging_cap)
            : DEFAULT_PAYMENT_CONFIG.packagingCap,
        gstRatePercent:
          dbConfig.gst_rate_percent != null
            ? Number(dbConfig.gst_rate_percent)
            : DEFAULT_PAYMENT_CONFIG.gstRatePercent,
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
        isRainModeActive:
          dbConfig.is_rain_mode_active != null
            ? Boolean(dbConfig.is_rain_mode_active)
            : DEFAULT_PAYMENT_CONFIG.isRainModeActive,
        isNightSurgeActive:
          dbConfig.is_night_surge_active != null
            ? Boolean(dbConfig.is_night_surge_active)
            : DEFAULT_PAYMENT_CONFIG.isNightSurgeActive,
        enableCashOnDelivery:
          dbConfig.enable_cash_on_delivery != null
            ? Boolean(dbConfig.enable_cash_on_delivery)
            : DEFAULT_PAYMENT_CONFIG.enableCashOnDelivery,
        enableUpiDeepLink:
          dbConfig.enable_upi_deep_link != null
            ? Boolean(dbConfig.enable_upi_deep_link)
            : DEFAULT_PAYMENT_CONFIG.enableUpiDeepLink,
        requireUtrNumber:
          dbConfig.require_utr_number != null
            ? Boolean(dbConfig.require_utr_number)
            : DEFAULT_PAYMENT_CONFIG.requireUtrNumber,
      }),
    }

    if (!isAdmin) {
      merged.accountNumber = ''
      merged.ifscCode = ''
      merged.mccCode = ''
    }

    return NextResponse.json({ success: true, config: merged })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load payment configuration' },
      { status: 503 }
    )
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request)

    const body: PaymentConfig = await request.json()
    const fullConfig: PaymentConfig = {
      ...DEFAULT_PAYMENT_CONFIG,
      ...body,
    }

    const numericFields: Array<keyof PaymentConfig> = [
      'platformFee',
      'handlingFee',
      'vendorCommission',
      'packagingCap',
      'gstRatePercent',
      'baseDeliveryFee',
      'baseDistanceKm',
      'perKmRate',
      'freeDeliveryThreshold',
      'driverPayoutShare',
      'surgeMultiplier',
      'rainFee',
      'nightSurgeFee',
    ]
    if (numericFields.some((field) => !Number.isFinite(Number(fullConfig[field])))) {
      return NextResponse.json(
        { error: 'Payment configuration contains invalid numbers' },
        { status: 400 }
      )
    }

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

    return NextResponse.json({ success: true, config: fullConfig })
  } catch (error: any) {
    const authRes = handleApiAuthError(error)
    if (authRes) return authRes
    return NextResponse.json(
      { error: error?.message || 'Failed to save payment configuration' },
      { status: 500 }
    )
  }
}
