/**
 * Request validation schemas for the Orders API.
 * Pure validation with no HTTP or database dependencies.
 */

import type { OrderStatus } from '../domain/order-rules'

export interface CreateOrderBody {
  id?: string
  customer_name?: string
  customer_phone?: string
  restaurant_id?: string
  restaurant_name?: string
  items?: unknown
  payment_method?: string
  utr_ref?: string
  customer_vpa?: string
  tip?: number
  coupon_code?: string
  order_type?: string
  address_id?: string
  addressId?: string
  customer_address?: string
  idempotency_key?: string
  idempotencyKey?: string
  [key: string]: unknown
}

export interface UpdateOrderBody {
  orderId?: string
  status?: OrderStatus
  payment_status?: string
  paymentStatus?: string
  driver_name?: string
  driver_phone?: string
  driver_id?: string
  driver_lat?: number
  driver_lng?: number
  items?: unknown
  otp?: string
  delivery_otp?: string
  admin_reason?: string
  rejection_reason?: string
  [key: string]: unknown
}

export interface CancellationWindow {
  maxAgeMs: number
}

export const DEFAULT_CANCELLATION_WINDOW: CancellationWindow = {
  maxAgeMs: 15 * 1000, // 15 seconds
}

export function validateCreateOrderBody(body: unknown): {
  valid: boolean
  error?: string
  data?: CreateOrderBody
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' }
  }

  const b = body as Record<string, unknown>

  const rawItems = b.items
  let items: unknown[] = []
  if (Array.isArray(rawItems)) {
    items = rawItems
  } else if (typeof rawItems === 'string') {
    try {
      items = JSON.parse(rawItems)
      if (!Array.isArray(items)) {
        return { valid: false, error: 'Items must be an array' }
      }
    } catch {
      return { valid: false, error: 'Invalid items format' }
    }
  } else {
    items = []
  }

  if (items.length === 0) {
    return { valid: false, error: 'At least one item is required' }
  }

  for (const item of items) {
    if (!item || typeof item !== 'object') {
      return { valid: false, error: 'Each item must be an object' }
    }
    const itemRecord = item as Record<string, unknown>
    const itemId =
      itemRecord.menuItemId || itemRecord.menu_item_id || itemRecord.itemId || itemRecord.id
    if (!itemId) {
      return { valid: false, error: 'Each item must have an itemId/menuItemId' }
    }
  }

  return { valid: true, data: b as CreateOrderBody }
}

export function validateUpdateOrderBody(body: unknown): {
  valid: boolean
  error?: string
  data?: UpdateOrderBody
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' }
  }

  const b = body as Record<string, unknown>

  if (!b.orderId) {
    return { valid: false, error: 'Order ID is required' }
  }

  const hasStatusChange = typeof b.status !== 'undefined'
  const hasPaymentStatusChange =
    typeof b.payment_status !== 'undefined' || typeof b.paymentStatus !== 'undefined'
  const hasDriverInfoChange =
    typeof b.driver_name !== 'undefined' ||
    typeof b.driver_phone !== 'undefined' ||
    typeof b.driver_id !== 'undefined'
  const hasCoordinateChange =
    typeof b.driver_lat !== 'undefined' || typeof b.driver_lng !== 'undefined'
  const hasItemsChange = typeof b.items !== 'undefined'

  if (
    !hasStatusChange &&
    !hasPaymentStatusChange &&
    !hasDriverInfoChange &&
    !hasCoordinateChange &&
    !hasItemsChange
  ) {
    return { valid: false, error: 'No valid fields to update' }
  }

  if (hasStatusChange && hasPaymentStatusChange) {
    return {
      valid: false,
      error: 'Update payment status and fulfillment status in separate requests',
    }
  }

  return { valid: true, data: b as UpdateOrderBody }
}

export function validateCancellation(
  createdAt: Date | string | null,
  window: CancellationWindow = DEFAULT_CANCELLATION_WINDOW
): { allowed: boolean; error?: string } {
  if (!createdAt) {
    return { allowed: true }
  }

  const orderAgeMs = Date.now() - new Date(createdAt).getTime()
  if (orderAgeMs > window.maxAgeMs) {
    return {
      allowed: false,
      error:
        'Order cancellation window expired. Orders can only be cancelled within 15 seconds of placement.',
    }
  }

  return { allowed: true }
}
