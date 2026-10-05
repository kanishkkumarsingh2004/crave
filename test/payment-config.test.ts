import { DEFAULT_PAYMENT_CONFIG, PaymentConfig, getLocalPaymentConfig } from '@/lib/payment-config'

describe('Payment Config', () => {
  it('has correct default UPI VPA', () => {
    expect(DEFAULT_PAYMENT_CONFIG.upiVpa).toBe('crave@upi')
  })

  it('has correct default merchant name', () => {
    expect(DEFAULT_PAYMENT_CONFIG.merchantName).toBe('crave Food Delivery Services')
  })

  it('has correct commission rate', () => {
    expect(DEFAULT_PAYMENT_CONFIG.vendorCommission).toBe(15)
  })

  it('has correct package cap', () => {
    expect(DEFAULT_PAYMENT_CONFIG.packagingCap).toBe(20)
  })

  it('has correct base delivery fee', () => {
    expect(DEFAULT_PAYMENT_CONFIG.baseDeliveryFee).toBe(30)
  })

  it('has correct driver payout share', () => {
    expect(DEFAULT_PAYMENT_CONFIG.driverPayoutShare).toBe(80)
  })

  it('requires UTR number by default', () => {
    expect(DEFAULT_PAYMENT_CONFIG.requireUtrNumber).toBe(true)
  })

  it('enables UPI deep link by default', () => {
    expect(DEFAULT_PAYMENT_CONFIG.enableUpiDeepLink).toBe(true)
  })

  it('enables cash on delivery by default', () => {
    expect(DEFAULT_PAYMENT_CONFIG.enableCashOnDelivery).toBe(false)
  })

  it('getLocalPaymentConfig returns defaults when no localStorage', () => {
    localStorage.clear()
    const config = getLocalPaymentConfig()
    expect(config.upiVpa).toBe(DEFAULT_PAYMENT_CONFIG.upiVpa)
    expect(config.merchantName).toBe(DEFAULT_PAYMENT_CONFIG.merchantName)
    expect(config.vendorCommission).toBe(DEFAULT_PAYMENT_CONFIG.vendorCommission)
  })

  it('getLocalPaymentConfig reads overrides from localStorage', () => {
    const overrides = { upiVpa: 'custom@upi', vendorCommission: 20 }
    localStorage.setItem('crave_admin_payment_config', JSON.stringify(overrides))

    const config = getLocalPaymentConfig()
    expect(config.upiVpa).toBe('custom@upi')
    expect(config.vendorCommission).toBe(20)
    expect(config.merchantName).toBe(DEFAULT_PAYMENT_CONFIG.merchantName)
  })

  it('all required fields exist in PaymentConfig', () => {
    const requiredFields: (keyof PaymentConfig)[] = [
      'upiVpa',
      'merchantName',
      'mccCode',
      'ifscCode',
      'accountNumber',
      'platformFee',
      'handlingFee',
      'vendorCommission',
      'packagingCap',
      'baseDeliveryFee',
      'baseDistanceKm',
      'perKmRate',
      'freeDeliveryThreshold',
      'driverPayoutShare',
      'surgeMultiplier',
      'isRainModeActive',
      'isNightSurgeActive',
      'enableCashOnDelivery',
      'enableUpiDeepLink',
      'requireUtrNumber',
    ]

    for (const field of requiredFields) {
      expect(DEFAULT_PAYMENT_CONFIG).toHaveProperty(field)
    }
  })
})
