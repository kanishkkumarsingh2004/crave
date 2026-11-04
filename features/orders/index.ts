/**
 * Orders feature public API.
 * Application use cases are the only entry point for business operations.
 * HTTP routes should import from here and remain thin adapters.
 */

export type {
  OrderActor,
  OrderItemInput,
  OrderPriceBreakdown,
  CreateOrderResult,
  UpdateOrderResult,
  GetOrderResult,
  ListOrdersResult,
  CancelOrderResult,
} from './domain/order.types'

export type { OrderStatus } from './domain/order-rules'
export {
  canReadOrder,
  isVendorRole,
  isRiderRole,
  isAdminRole,
  isCustomerRole,
  isTerminalStatus,
  scopeListByActor,
  VENDOR_STATUSES,
  RIDER_STATUSES,
  TERMINAL_STATUSES,
  DELIVERY_CONFIRMATION_STATUSES,
} from './domain/order-rules'

export { getOrder } from './application/get-order'
export { listOrdersUseCase } from './application/get-orders'
export { createOrder } from './application/create-order'
export { updateOrder } from './application/update-order'
export { cancelOrder } from './application/cancel-order'
