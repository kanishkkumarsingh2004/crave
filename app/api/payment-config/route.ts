import { getActivePaymentConfig, upsertPaymentConfig } from '@/lib/dal/payments'
import { NextResponse } from 'next/server'

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
  baseDeliveryFee: 30,
  baseDistanceKm: 3,
  perKmRate: 10,
  freeDeliveryThreshold: 500,
  driverPayoutShare: 80,
  surgeMultiplier: 1.25,
  rainFee: 20,
  nightSurgeFee: 15,
  isRainModeActive: false,
  isNightSurgeActive: false,
  enableCashOnDelivery: false,
  enableUpiDeepLink: true,
  requireUtrNumber: true,
}

let memoryConfigCache: PaymentConfig | null = null

export async function GET(_request?: Request) {
  try {
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
        mccCode:
          dbConfig.merchant_category_code || local?.mccCode || DEFAULT_PAYMENT_CONFIG.mccCode,
        baseDeliveryFee:
          dbConfig.delivery_fee != null
            ? Number(dbConfig.delivery_fee)
            : (local?.baseDeliveryFee ?? DEFAULT_PAYMENT_CONFIG.baseDeliveryFee),
        handlingFee:
          dbConfig.handling_fee != null
            ? Number(dbConfig.handling_fee)
            : (local?.handlingFee ?? DEFAULT_PAYMENT_CONFIG.handlingFee),
        freeDeliveryThreshold:
          dbConfig.free_delivery_threshold != null
            ? Number(dbConfig.free_delivery_threshold)
            : (local?.freeDeliveryThreshold ?? DEFAULT_PAYMENT_CONFIG.freeDeliveryThreshold),
      }),
    }

    return NextResponse.json({ success: true, config: merged })
  } catch (error: any) {
    return NextResponse.json({ success: true, config: DEFAULT_PAYMENT_CONFIG })
  }
}

export async function POST(request: Request) {
  try {
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
        delivery_fee: fullConfig.baseDeliveryFee,
        handling_fee: fullConfig.handlingFee,
        free_delivery_threshold: fullConfig.freeDeliveryThreshold,
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
