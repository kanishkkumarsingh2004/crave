export interface Coupon {
  id: string
  code: string
  description: string
  discountType: 'percentage' | 'flat'
  discountValue: number
  minOrderAmount: number
  maxDiscount?: number
  expiryDate: string
  usageLimit?: number
  usedCount: number
  isActive: boolean
}

export const initialCoupons: Coupon[] = [
  {
    id: 'coup_1',
    code: 'BLINK50',
    description: '50% OFF up to ₹120 on orders above ₹199',
    discountType: 'percentage',
    discountValue: 50,
    minOrderAmount: 199,
    maxDiscount: 120,
    expiryDate: '2026-12-31',
    usageLimit: 1000,
    usedCount: 248,
    isActive: true,
  },
  {
    id: 'coup_2',
    code: 'WELCOME100',
    description: 'Flat ₹100 OFF on your order above ₹299',
    discountType: 'flat',
    discountValue: 100,
    minOrderAmount: 299,
    expiryDate: '2026-12-31',
    usageLimit: 500,
    usedCount: 142,
    isActive: true,
  },
  {
    id: 'coup_3',
    code: 'SUPER20',
    description: '20% OFF up to ₹200 on premium gourmet bowls',
    discountType: 'percentage',
    discountValue: 20,
    minOrderAmount: 399,
    maxDiscount: 200,
    expiryDate: '2026-11-30',
    usageLimit: 300,
    usedCount: 89,
    isActive: true,
  },
  {
    id: 'coup_4',
    code: 'SAVEMORE',
    description: 'Flat ₹50 OFF on quick snacks above ₹149',
    discountType: 'flat',
    discountValue: 50,
    minOrderAmount: 149,
    expiryDate: '2026-10-31',
    usageLimit: 200,
    usedCount: 64,
    isActive: true,
  },
]

const LOCAL_STORAGE_KEY = 'blinkbite_admin_coupons'

export function getCoupons(): Coupon[] {
  if (typeof window === 'undefined') return initialCoupons
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (e) {
    console.error('Failed to parse coupons from localStorage', e)
  }
  return initialCoupons
}

export function saveCoupons(coupons: Coupon[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(coupons))
  } catch (e) {
    console.error('Failed to save coupons to localStorage', e)
  }
}

export function validateCoupon(
  code: string,
  subtotal: number,
  couponsList?: Coupon[]
): { valid: boolean; discountAmount: number; coupon?: Coupon; message: string } {
  const coupons = couponsList || getCoupons()
  const cleanCode = code.trim().toUpperCase()
  const found = coupons.find((c) => c.code.toUpperCase() === cleanCode)

  if (!found) {
    return { valid: false, discountAmount: 0, message: `Coupon code '${cleanCode}' is invalid.` }
  }

  if (!found.isActive) {
    return {
      valid: false,
      discountAmount: 0,
      message: `Coupon code '${cleanCode}' has been deactivated.`,
    }
  }

  // Check expiry
  if (found.expiryDate) {
    const today = new Date().toISOString().split('T')[0]
    if (found.expiryDate < today) {
      return { valid: false, discountAmount: 0, message: `Coupon code '${cleanCode}' has expired.` }
    }
  }

  if (subtotal < found.minOrderAmount) {
    return {
      valid: false,
      discountAmount: 0,
      message: `Add ₹${found.minOrderAmount - subtotal} more to apply '${cleanCode}' (Min ₹${found.minOrderAmount}).`,
    }
  }

  let discount = 0
  if (found.discountType === 'percentage') {
    discount = Math.round((subtotal * found.discountValue) / 100)
    if (found.maxDiscount && discount > found.maxDiscount) {
      discount = found.maxDiscount
    }
  } else {
    discount = found.discountValue
  }

  // Ensure discount does not exceed subtotal
  discount = Math.min(discount, subtotal)

  return {
    valid: true,
    discountAmount: discount,
    coupon: found,
    message: `Coupon '${cleanCode}' applied successfully! Saved ₹${discount}.`,
  }
}
