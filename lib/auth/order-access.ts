import type { JWTPayload } from '@/lib/jwt'

type OrderOwnership = {
  customer_id?: string | null
  rider_id?: string | null
  restaurant_id?: string | null
}

/**
 * The delivery code is only meaningful once the driver has collected the food
 * and is on the way to the customer. Before that the customer has nothing to
 * hand over, and after the driver has entered the code it must disappear.
 */
const OTP_ACTIVE_STATUSES = new Set(['picked_up', 'out_for_delivery'])

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

/**
 * True while the delivery code should be shown to the customer: the driver has
 * the food, the order is not delivered yet and the code was never entered.
 */
export function isDeliveryOtpActive(order: {
  status?: string | null
  delivery_otp?: string | null
  otp_consumed_at?: string | Date | null
}): boolean {
  if (!order.delivery_otp) return false
  if (order.otp_consumed_at) return false
  return OTP_ACTIVE_STATUSES.has(String(order.status || ''))
}

/**
 * Removes every handover code from an order payload before it is broadcast or
 * handed to a party that is not allowed to read it (driver, vendor).
 */
export function stripOrderSecrets<T extends Record<string, any>>(order: T): T {
  const {
    delivery_otp: _deliveryOtp,
    otp_consumed_at: _otpConsumedAt,
    ...safeOrder
  } = order as T & Record<string, unknown>
  return safeOrder as T
}

export function sanitizeOrderForActor<T extends OrderOwnership>(actor: JWTPayload, order: T): T {
  const role = actor.role as string
  const isAdmin = role === 'admin'
  const isOrderCustomer = isCustomer(role) && order.customer_id === actor.id

  // Drivers and vendors never see the customer's handover code.
  if (!isAdmin && !isOrderCustomer) {
    return stripOrderSecrets(order as unknown as Record<string, any>) as unknown as T
  }

  // The customer only sees the code between pickup and delivery, and never
  // after the driver has entered it.
  if (!isAdmin && isOrderCustomer) {
    const typed = order as T & {
      status?: string | null
      delivery_otp?: string | null
      otp_consumed_at?: string | Date | null
    }
    if (!isDeliveryOtpActive(typed)) {
      return { ...order, delivery_otp: null } as T
    }
  }

  return order
}

export function getCustomerOrderScope(actor: JWTPayload, requestedCustomerId?: string | null) {
  const role = actor.role as string
  if (role === 'admin') return requestedCustomerId || null
  if (isCustomer(role)) return actor.id
  return null
}
