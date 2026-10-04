import { supabase } from '@/lib/supabase'

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

export const STORAGE_KEY = 'crave_admin_payment_config'

export function getLocalPaymentConfig(): PaymentConfig {
  if (typeof window === 'undefined') return DEFAULT_PAYMENT_CONFIG
  try {
    const item = localStorage.getItem(STORAGE_KEY)
    if (!item) return DEFAULT_PAYMENT_CONFIG
    return { ...DEFAULT_PAYMENT_CONFIG, ...JSON.parse(item) }
  } catch {
    return DEFAULT_PAYMENT_CONFIG
  }
}

export async function savePaymentConfig(config: PaymentConfig): Promise<boolean> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
      window.dispatchEvent(new Event('crave_payment_config_updated'))
    } catch (e) {
      console.error('Failed to save payment config to localStorage:', e)
    }
  }

  try {
    const { error } = await supabase.from('payment_configs').upsert({
      id: 'default_config',
      name: 'Default Active Config',
      merchant_vpa: config.upiVpa,
      merchant_name: config.merchantName,
      merchant_category_code: config.mccCode,
      delivery_fee: config.baseDeliveryFee,
      handling_fee: config.handlingFee,
      free_delivery_threshold: config.freeDeliveryThreshold,
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    if (error) {
      console.warn('Supabase payment_configs upsert warning:', error.message)
    }
    return true
  } catch (e) {
    console.warn('Supabase payment_configs upsert error:', e)
    return true
  }
}

export async function loadPaymentConfig(): Promise<PaymentConfig> {
  const local = getLocalPaymentConfig()
  try {
    const { data, error } = await supabase
      .from('payment_configs')
      .select('*')
      .eq('is_active', true)
      .maybeSingle()

    if (!error && data) {
      const merged: PaymentConfig = {
        ...local,
        upiVpa: data.merchant_vpa || local.upiVpa,
        merchantName: data.merchant_name || local.merchantName,
        mccCode: data.merchant_category_code || local.mccCode,
        baseDeliveryFee: data.delivery_fee != null ? Number(data.delivery_fee) : local.baseDeliveryFee,
        handlingFee: data.handling_fee != null ? Number(data.handling_fee) : local.handlingFee,
        freeDeliveryThreshold:
          data.free_delivery_threshold != null
            ? Number(data.free_delivery_threshold)
            : local.freeDeliveryThreshold,
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
      }
      return merged
    }
  } catch (e) {
    console.warn('Failed to load payment config from Supabase:', e)
  }
  return local
}
