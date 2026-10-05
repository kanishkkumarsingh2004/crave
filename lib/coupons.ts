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
  restaurantId?: string
}

export const DEFAULT_COUPONS: Coupon[] = [
  {
    id: 'c1',
    code: 'CRAVE50',
    description: '50% OFF up to ₹100 on orders above ₹149',
    discountType: 'percentage',
    discountValue: 50,
    minOrderAmount: 149,
    maxDiscount: 100,
    expiryDate: '2028-12-31',
    usedCount: 0,
    isActive: true,
  },
  {
    id: 'c2',
    code: 'WELCOME100',
    description: 'Flat ₹100 OFF on orders above ₹299',
    discountType: 'flat',
    discountValue: 100,
    minOrderAmount: 299,
    expiryDate: '2028-12-31',
    usedCount: 0,
    isActive: true,
  },
  {
    id: 'c3',
    code: 'FREEDEL',
    description: 'Flat ₹30 OFF on orders above ₹99',
    discountType: 'flat',
    discountValue: 30,
    minOrderAmount: 99,
    expiryDate: '2028-12-31',
    usedCount: 0,
    isActive: true,
  },
]

export async function fetchCouponsFromSupabase(restaurantId?: string): Promise<Coupon[]> {
  try {
    if (typeof window !== 'undefined') {
      const url = restaurantId
        ? `/api/admin/coupons?restaurantId=${encodeURIComponent(restaurantId)}`
        : '/api/admin/coupons'
      const res = await fetch(url)
      if (res.ok) {
        const json = await res.json()
        if (json.success && Array.isArray(json.coupons) && json.coupons.length > 0) {
          return json.coupons.map((item: any) => ({
            id: item.id,
            code: item.code,
            description: item.description,
            discountType: item.discount_type as 'percentage' | 'flat',
            discountValue: Number(item.discount_value),
            minOrderAmount: Number(item.min_order_amount),
            maxDiscount: item.max_discount == null ? undefined : Number(item.max_discount),
            expiryDate: item.expiry_date ? String(item.expiry_date).split('T')[0] : '',
            usageLimit: item.usage_limit == null ? undefined : Number(item.usage_limit),
            usedCount: Number(item.used_count ?? 0),
            isActive: Boolean(item.is_active),
            restaurantId: item.restaurant_id ?? undefined,
          }))
        }
      }
    }

    // Direct Supabase fallback
    let query = supabase.from('coupons').select('*')
    if (restaurantId) query = query.eq('restaurant_id', restaurantId)
    const { data, error } = await query

    if (error || !data || data.length === 0) return DEFAULT_COUPONS

    return data.map((item: any) => ({
      id: item.id,
      code: item.code,
      description: item.description,
      discountType: item.discount_type as 'percentage' | 'flat',
      discountValue: Number(item.discount_value),
      minOrderAmount: Number(item.min_order_amount),
      maxDiscount: item.max_discount == null ? undefined : Number(item.max_discount),
      expiryDate: item.expiry_date ? String(item.expiry_date).split('T')[0] : '',
      usageLimit: item.usage_limit == null ? undefined : Number(item.usage_limit),
      usedCount: Number(item.used_count ?? 0),
      isActive: Boolean(item.is_active),
      restaurantId: item.restaurant_id ?? undefined,
    }))
  } catch (err) {
    return DEFAULT_COUPONS
  }
}

export function validateCoupon(
  code: string,
  subtotal: number,
  couponsList: Coupon[] = []
): { valid: boolean; discountAmount: number; coupon?: Coupon; message: string } {
  const coupons = couponsList
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
