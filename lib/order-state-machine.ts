/**
 * Order Lifecycle State Machine
 *
 * Canonical states (from Prisma schema - detailed fulfillment + payment):
 * payment_pending → payment_submitted → payment_verified → sent_to_vendor → preparing → packing → ready_for_pickup → rider_assigned → picked_up → out_for_delivery → delivered → completed
 *
 * App Flow states (simplified for UI): PENDING → CONFIRMED → PREPARING → READY_FOR_PICKUP → OUT_FOR_DELIVERY → DELIVERED
 *
 * This module provides explicit mapping and transition validation.
 */

// Canonical order states from Prisma (source of truth)
export const OrderStatus = {
  // Payment phase
  PAYMENT_PENDING: 'payment_pending',
  PAYMENT_SUBMITTED: 'payment_submitted',
  PAYMENT_VERIFIED: 'payment_verified',

  // Fulfillment phase
  SENT_TO_VENDOR: 'sent_to_vendor',
  PREPARING: 'preparing',
  PACKING: 'packing',
  READY_FOR_PICKUP: 'ready_for_pickup',
  RIDER_ASSIGNED: 'rider_assigned',
  PICKED_UP: 'picked_up',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',

  // Terminal
  CANCELLED: 'cancelled',
} as const

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus]

// App Flow states (simplified for customer-facing UI)
export const AppFlowStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PREPARING: 'PREPARING',
  READY_FOR_PICKUP: 'READY_FOR_PICKUP',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const

export type AppFlowStatus = (typeof AppFlowStatus)[keyof typeof AppFlowStatus]

// Payment states (from billing state machine)
export const PaymentStatus = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
} as const

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus]

// Mapping: Canonical Order Status → App Flow Status
export const ORDER_TO_APP_FLOW_MAP: Record<OrderStatus, AppFlowStatus> = {
  [OrderStatus.PAYMENT_PENDING]: AppFlowStatus.PENDING,
  [OrderStatus.PAYMENT_SUBMITTED]: AppFlowStatus.PENDING,
  [OrderStatus.PAYMENT_VERIFIED]: AppFlowStatus.CONFIRMED,
  [OrderStatus.SENT_TO_VENDOR]: AppFlowStatus.CONFIRMED,
  [OrderStatus.PREPARING]: AppFlowStatus.PREPARING,
  [OrderStatus.PACKING]: AppFlowStatus.PREPARING,
  [OrderStatus.READY_FOR_PICKUP]: AppFlowStatus.READY_FOR_PICKUP,
  [OrderStatus.RIDER_ASSIGNED]: AppFlowStatus.OUT_FOR_DELIVERY,
  [OrderStatus.PICKED_UP]: AppFlowStatus.OUT_FOR_DELIVERY,
  [OrderStatus.OUT_FOR_DELIVERY]: AppFlowStatus.OUT_FOR_DELIVERY,
  [OrderStatus.DELIVERED]: AppFlowStatus.DELIVERED,
  [OrderStatus.COMPLETED]: AppFlowStatus.DELIVERED,
  [OrderStatus.CANCELLED]: AppFlowStatus.CANCELLED,
}

// Mapping: Canonical Order Status → Payment Status
export const ORDER_TO_PAYMENT_MAP: Record<OrderStatus, PaymentStatus> = {
  [OrderStatus.PAYMENT_PENDING]: PaymentStatus.PENDING,
  [OrderStatus.PAYMENT_SUBMITTED]: PaymentStatus.PENDING,
  [OrderStatus.PAYMENT_VERIFIED]: PaymentStatus.VERIFIED,
  [OrderStatus.SENT_TO_VENDOR]: PaymentStatus.VERIFIED,
  [OrderStatus.PREPARING]: PaymentStatus.VERIFIED,
  [OrderStatus.PACKING]: PaymentStatus.VERIFIED,
  [OrderStatus.READY_FOR_PICKUP]: PaymentStatus.VERIFIED,
  [OrderStatus.RIDER_ASSIGNED]: PaymentStatus.VERIFIED,
  [OrderStatus.PICKED_UP]: PaymentStatus.VERIFIED,
  [OrderStatus.OUT_FOR_DELIVERY]: PaymentStatus.VERIFIED,
  [OrderStatus.DELIVERED]: PaymentStatus.VERIFIED,
  [OrderStatus.COMPLETED]: PaymentStatus.VERIFIED,
  [OrderStatus.CANCELLED]: PaymentStatus.PENDING, // Can be refunded
}

// Valid state transitions (from → allowed to[])
export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PAYMENT_PENDING]: [OrderStatus.PAYMENT_SUBMITTED, OrderStatus.CANCELLED],
  [OrderStatus.PAYMENT_SUBMITTED]: [
    OrderStatus.PAYMENT_VERIFIED,
    OrderStatus.PAYMENT_PENDING,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PAYMENT_VERIFIED]: [OrderStatus.SENT_TO_VENDOR, OrderStatus.CANCELLED],
  [OrderStatus.SENT_TO_VENDOR]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.PACKING, OrderStatus.CANCELLED],
  [OrderStatus.PACKING]: [OrderStatus.READY_FOR_PICKUP, OrderStatus.CANCELLED],
  [OrderStatus.READY_FOR_PICKUP]: [OrderStatus.RIDER_ASSIGNED, OrderStatus.CANCELLED],
  [OrderStatus.RIDER_ASSIGNED]: [OrderStatus.PICKED_UP, OrderStatus.CANCELLED],
  [OrderStatus.PICKED_UP]: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
}

/**
 * Check if a transition is valid
 */
export function isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
  const allowed = VALID_TRANSITIONS[from]
  return allowed ? allowed.includes(to) : false
}

/**
 * Get the app flow status for a canonical order status
 */
export function getAppFlowStatus(orderStatus: OrderStatus): AppFlowStatus {
  return ORDER_TO_APP_FLOW_MAP[orderStatus] || AppFlowStatus.PENDING
}

/**
 * Get the payment status for a canonical order status
 */
export function getPaymentStatus(orderStatus: OrderStatus): PaymentStatus {
  return ORDER_TO_PAYMENT_MAP[orderStatus] || PaymentStatus.PENDING
}

/**
 * Get all valid next states from current state
 */
export function getValidNextStates(current: OrderStatus): OrderStatus[] {
  return VALID_TRANSITIONS[current] || []
}

/**
 * Check if status is a payment phase
 */
export function isPaymentPhase(status: OrderStatus): boolean {
  const paymentStatuses: OrderStatus[] = [
    OrderStatus.PAYMENT_PENDING,
    OrderStatus.PAYMENT_SUBMITTED,
    OrderStatus.PAYMENT_VERIFIED,
  ]
  return paymentStatuses.includes(status)
}

/**
 * Check if status is a fulfillment phase
 */
export function isFulfillmentPhase(status: OrderStatus): boolean {
  const fulfillmentStatuses: OrderStatus[] = [
    OrderStatus.SENT_TO_VENDOR,
    OrderStatus.PREPARING,
    OrderStatus.PACKING,
    OrderStatus.READY_FOR_PICKUP,
    OrderStatus.RIDER_ASSIGNED,
    OrderStatus.PICKED_UP,
    OrderStatus.OUT_FOR_DELIVERY,
    OrderStatus.DELIVERED,
    OrderStatus.COMPLETED,
  ]
  return fulfillmentStatuses.includes(status)
}

/**
 * Check if status is terminal
 */
export function isTerminalStatus(status: OrderStatus): boolean {
  const terminalStatuses: OrderStatus[] = [OrderStatus.COMPLETED, OrderStatus.CANCELLED]
  return terminalStatuses.includes(status)
}

/**
 * Get human-readable label for canonical status
 */
export function getStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    [OrderStatus.PAYMENT_PENDING]: 'Payment Pending',
    [OrderStatus.PAYMENT_SUBMITTED]: 'Payment Submitted (UTR)',
    [OrderStatus.PAYMENT_VERIFIED]: 'Payment Verified',
    [OrderStatus.SENT_TO_VENDOR]: 'Sent to Vendor',
    [OrderStatus.PREPARING]: 'Preparing',
    [OrderStatus.PACKING]: 'Packing',
    [OrderStatus.READY_FOR_PICKUP]: 'Ready for Pickup',
    [OrderStatus.RIDER_ASSIGNED]: 'Rider Assigned',
    [OrderStatus.PICKED_UP]: 'Picked Up',
    [OrderStatus.OUT_FOR_DELIVERY]: 'Out for Delivery',
    [OrderStatus.DELIVERED]: 'Delivered',
    [OrderStatus.COMPLETED]: 'Completed',
    [OrderStatus.CANCELLED]: 'Cancelled',
  }
  return labels[status] || status
}

/**
 * Get human-readable label for app flow status
 */
export function getAppFlowLabel(status: AppFlowStatus): string {
  const labels: Record<AppFlowStatus, string> = {
    [AppFlowStatus.PENDING]: 'Pending',
    [AppFlowStatus.CONFIRMED]: 'Confirmed',
    [AppFlowStatus.PREPARING]: 'Preparing',
    [AppFlowStatus.READY_FOR_PICKUP]: 'Ready for Pickup',
    [AppFlowStatus.OUT_FOR_DELIVERY]: 'Out for Delivery',
    [AppFlowStatus.DELIVERED]: 'Delivered',
    [AppFlowStatus.CANCELLED]: 'Cancelled',
  }
  return labels[status] || status
}

/**
 * Get phase name for canonical status
 */
export function getPhaseName(status: OrderStatus): 'payment' | 'fulfillment' | 'terminal' {
  if (isTerminalStatus(status)) return 'terminal'
  if (isPaymentPhase(status)) return 'payment'
  return 'fulfillment'
}

export default {
  OrderStatus,
  AppFlowStatus,
  PaymentStatus,
  ORDER_TO_APP_FLOW_MAP,
  ORDER_TO_PAYMENT_MAP,
  VALID_TRANSITIONS,
  isValidTransition,
  getAppFlowStatus,
  getPaymentStatus,
  getValidNextStates,
  isPaymentPhase,
  isFulfillmentPhase,
  isTerminalStatus,
  getStatusLabel,
  getAppFlowLabel,
  getPhaseName,
}
