/**
 * Driver app order status sets used for filtering and offer eligibility.
 */

export const ACTIVE_STATUSES = new Set([
  'ready_for_pickup',
  'rider_assigned',
  'picked_up',
  'out_for_delivery',
])

export const AVAILABLE_OFFER_STATUSES = new Set([
  'sent_to_vendor',
  'preparing',
  'packing',
  'ready_for_pickup',
])
