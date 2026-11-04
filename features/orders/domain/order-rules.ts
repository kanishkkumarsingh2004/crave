/**
 * Domain business rules for orders.
 * Pure functions with no HTTP or database dependencies.
 */

import type { OrderActor, OrderRole } from './order.types'

export type OrderStatus =
  | 'payment_pending'
  | 'payment_submitted'
  | 'payment_verified'
  | 'sent_to_vendor'
  | 'preparing'
  | 'packing'
  | 'ready_for_pickup'
  | 'rider_assigned'
  | 'picked_up'
  | 'out_for_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled'

export interface OrderRecord {
  id: string
  customer_id?: string | null
  restaurant_id?: string | null
  restaurant_name?: string | null
  rider_id?: string | null
  status: OrderStatus
  payment_status?: string | null
  [key: string]: unknown
}

const VENDOR_ROLES: OrderRole[] = ['restaurant_vendor', 'cravexp_store_vendor', 'vendor']

const RIDER_ROLES: OrderRole[] = ['rider', 'driver']

export function isVendorRole(role: OrderRole | string): boolean {
  return VENDOR_ROLES.includes(role as OrderRole)
}

export function isRiderRole(role: OrderRole | string): boolean {
  return RIDER_ROLES.includes(role as OrderRole)
}

export function isAdminRole(role: OrderRole | string): boolean {
  return role === 'admin'
}

export function isCustomerRole(role: OrderRole | string): boolean {
  return role === 'user' || role === 'customer'
}

/**
 * Authorization: can the actor read this order?
 * Mirrors lib/auth/order-access.canReadOrder semantics.
 */
export function canReadOrder(actor: OrderActor | null, order: OrderRecord): boolean {
  if (!actor) return false
  if (isAdminRole(actor.role)) return true
  if (isCustomerRole(actor.role) && order.customer_id === actor.id) return true
  if (isRiderRole(actor.role) && order.rider_id === actor.id) return true
  if (isVendorRole(actor.role)) {
    const actorRestaurantId = actor.restaurantId || actor.restaurant_id
    return order.restaurant_id === actorRestaurantId || order.restaurant_name === actor.name
  }
  return false
}

/**
 * Determine the scoped filter values for list queries based on actor role.
 */
export function scopeListByActor(
  actor: OrderActor | null,
  params: { customerId?: string; vendorId?: string; driverId?: string }
): {
  customerId?: string
  driverId?: string
  restaurantId?: string
  restaurantName?: string
  onlyApprovedForVendor?: boolean
  includeAvailableForRider?: boolean
} {
  const result: {
    customerId?: string
    driverId?: string
    restaurantId?: string
    restaurantName?: string
    onlyApprovedForVendor?: boolean
    includeAvailableForRider?: boolean
  } = {
    customerId: params.customerId ?? undefined,
    driverId: params.driverId ?? undefined,
    restaurantId: params.vendorId ?? undefined,
  }

  if (!actor) return result
  if (isAdminRole(actor.role)) {
    result.restaurantName = params.vendorId ?? undefined
    return result
  }

  if (isCustomerRole(actor.role)) {
    result.customerId = actor.id
  } else if (isRiderRole(actor.role)) {
    result.driverId = actor.id
  } else if (isVendorRole(actor.role)) {
    result.restaurantId = actor.restaurantId || actor.restaurant_id || undefined
    result.onlyApprovedForVendor = true
  }

  return result
}

/**
 * Vendor statuses that a vendor may transition an order to.
 */
export const VENDOR_STATUSES: OrderStatus[] = ['preparing', 'packing', 'ready_for_pickup']

/**
 * Rider/driver statuses that a rider/driver may transition an order to.
 */
export const RIDER_STATUSES: OrderStatus[] = [
  'rider_assigned',
  'ready_for_pickup',
  'picked_up',
  'out_for_delivery',
  'delivered',
  'completed',
]

export const TERMINAL_STATUSES: OrderStatus[] = ['completed', 'cancelled']

export function isTerminalStatus(status: OrderStatus | string): boolean {
  return TERMINAL_STATUSES.includes(status as OrderStatus)
}

export const DELIVERY_CONFIRMATION_STATUSES: OrderStatus[] = ['delivered', 'completed']
