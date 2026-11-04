/**
 * Restaurant app domain constants and status sets used for filtering and eligibility.
 */

export const APP_NAME = 'crave kitchen'

export const RESTAURANT_ROLES = new Set(['restaurant_vendor', 'cravexp_store_vendor', 'vendor'])

export const ACTIVE_STATUSES = new Set([
  'payment_verified',
  'sent_to_vendor',
  'new',
  'accepted',
  'preparing',
  'cooking',
  'packing',
  'ready',
  'ready_for_pickup',
  'rider_assigned',
])

export const COMPLETED_STATUSES = new Set([
  'picked_up',
  'out_for_delivery',
  'delivered',
  'completed',
])
