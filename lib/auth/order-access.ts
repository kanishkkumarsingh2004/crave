import type { JWTPayload } from '@/lib/jwt'

type OrderOwnership = {
  customer_id?: string | null
  rider_id?: string | null
  restaurant_id?: string | null
}

function isCustomer(role: string) {
  return role === 'user' || role === 'customer'
}

function isRider(role: string) {
  return role === 'rider' || role === 'driver'
}

function isVendor(role: string) {
  return role === 'restaurant_vendor' || role === 'cravexp_store_vendor' || role === 'vendor'
}

export function canReadOrder(actor: JWTPayload, order: OrderOwnership): boolean {
  const role = actor.role as string
  if (role === 'admin') return true
  if (isCustomer(role)) return Boolean(order.customer_id && order.customer_id === actor.id)
  if (isRider(role)) return Boolean(order.rider_id && order.rider_id === actor.id)
  if (isVendor(role)) {
    const restaurantId = actor.restaurantId || actor.restaurant_id
    return Boolean(restaurantId && order.restaurant_id && order.restaurant_id === restaurantId)
  }
  return false
}

export function canReadDeliveryOtp(actor: JWTPayload, order: OrderOwnership): boolean {
  const role = actor.role as string
  return role === 'admin' || (isCustomer(role) && order.customer_id === actor.id)
}

export function sanitizeOrderForActor<T extends OrderOwnership>(actor: JWTPayload, order: T): T {
  if (canReadDeliveryOtp(actor, order)) return order
  const {
    delivery_otp: _deliveryOtp,
    otp_consumed_at: _otpConsumedAt,
    ...safeOrder
  } = order as T & {
    delivery_otp?: unknown
    otp_consumed_at?: unknown
  }
  return safeOrder as T
}

export function getCustomerOrderScope(actor: JWTPayload, requestedCustomerId?: string | null) {
  const role = actor.role as string
  if (role === 'admin') return requestedCustomerId || null
  if (isCustomer(role)) return actor.id
  return null
}
