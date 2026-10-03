import { supabase } from '@/lib/supabase'

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
    id: 'c_1',
    code: 'CRAVE50',
    description: '50% OFF up to ₹100 on first 3 orders',
    discountType: 'percentage',
    discountValue: 50,
    minOrderAmount: 199,
    maxDiscount: 100,
    expiryDate: '2026-12-31',
    usageLimit: 1000,
    usedCount: 142,
    isActive: true,
  },
  {
    id: 'c_2',
    code: 'FREEDEL',
    description: 'Flat ₹40 OFF Delivery Fee on orders above ₹299',
    discountType: 'flat',
    discountValue: 40,
    minOrderAmount: 299,
    maxDiscount: 40,
    expiryDate: '2026-11-30',
    usageLimit: 500,
    usedCount: 89,
    isActive: true,
  },
]

const LOCAL_STORAGE_KEY = 'crave_admin_coupons'

export async function fetchCouponsFromSupabase(): Promise<Coupon[]> {
  try {
    const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false })
    if (!error && data && data.length > 0) {
      const parsed: Coupon[] = data.map((item) => ({
        id: item.id,
        code: item.code,
        description: item.description,
        discountType: item.discount_type as 'percentage' | 'flat',
        discountValue: item.discount_value,
        minOrderAmount: item.min_order_amount,
        maxDiscount: item.max_discount || undefined,
        expiryDate: item.expiry_date || '2026-12-31',
        usageLimit: item.usage_limit || undefined,
        usedCount: item.used_count || 0,
        isActive: item.is_active ?? true,
      }))
      saveCoupons(parsed)
      return parsed
    }
  } catch (err) {
    console.error('Failed to fetch coupons from Supabase:', err)
  }
  return getCoupons()
}

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

  discount = Math.min(discount, subtotal)

  return {
    valid: true,
    discountAmount: discount,
    coupon: found,
    message: `Coupon '${cleanCode}' applied successfully! Saved ₹${discount}.`,
  }
}
