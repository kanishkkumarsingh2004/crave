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
  restaurantIds?: string[]
}

export async function fetchCouponsFromSupabase(restaurantId?: string): Promise<Coupon[]> {
  try {
    const url = restaurantId
      ? `/api/admin/coupons?restaurantId=${encodeURIComponent(restaurantId)}`
      : '/api/admin/coupons'
    const res = await fetch(url)
    if (res.ok) {
      const json = await res.json()
      if (json.success && Array.isArray(json.coupons)) {
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
          restaurantIds: Array.isArray(item.restaurant_ids)
            ? item.restaurant_ids
            : typeof item.restaurant_ids === 'string'
              ? JSON.parse(item.restaurant_ids)
              : item.restaurant_id
                ? [item.restaurant_id]
                : [],
        }))
      }
    }
    return []
  } catch (err) {
    return []
  }
}

export function validateCoupon(
  code: string,
  subtotal: number,
  couponsList: Coupon[] = [],
  restaurantId?: string
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

  if (restaurantId) {
    if (found.restaurantIds && found.restaurantIds.length > 0) {
      if (!found.restaurantIds.includes(restaurantId)) {
        return {
          valid: false,
          discountAmount: 0,
          message: `Coupon code '${cleanCode}' is not applicable for the selected restaurant.`,
        }
      }
    } else if (found.restaurantId && found.restaurantId !== restaurantId) {
      return {
        valid: false,
        discountAmount: 0,
        message: `Coupon code '${cleanCode}' is not applicable for the selected restaurant.`,
      }
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
