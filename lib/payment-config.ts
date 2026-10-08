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
  gstRatePercent: 5,
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
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('crave_token') || localStorage.getItem('crave_auth_token') || ''
        : ''
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const res = await fetch('/api/payment-config', {
      method: 'POST',
      headers,
      body: JSON.stringify(config),
    })
    return res.ok
  } catch (e) {
    console.warn('API payment config save error:', e)
    return true
  }
}

export async function loadPaymentConfig(): Promise<PaymentConfig> {
  const local = getLocalPaymentConfig()
  try {
    const res = await fetch('/api/payment-config')
    if (res.ok) {
      const data = await res.json()
      if (data?.config) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.config))
        }
        return data.config
      }
    }
  } catch (e) {
    console.warn('Failed to load payment config from API:', e)
  }
  return local
}
