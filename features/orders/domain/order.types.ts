/**
 * Domain types for the Orders feature.
 * Shared across application use cases, infrastructure, and the HTTP adapter.
 */

export type OrderRole =
  | 'user'
  | 'customer'
  | 'restaurant_vendor'
  | 'cravexp_store_vendor'
  | 'vendor'
  | 'rider'
  | 'driver'
  | 'admin'

export interface OrderActor {
  id: string
  role: OrderRole
  name?: string | null
  email?: string | null
  restaurantId?: string | null
  restaurant_id?: string | null
  restaurantName?: string | null
}

export interface OrderItemInput {
  itemId: string
  variantId?: string | null
  quantity: number
}

export interface OrderPriceBreakdown {
  subtotal: number
  commercial_model: string
  markup_rate: number
  markup_amount: number
  product_margin: number
  restaurant_base_subtotal: number
  packaging_fee: number
  delivery_fee: number
  platform_fee: number
  handling_fee: number
  gst: number
  gst_rate_percent: number
  tip: number
  discount_amount: number
  total_amount: number
  vendor_commission_rate: number
  vendor_commission_amount: number
  vendor_net_payout: number
  driver_payout: number
  driver_base_payout: number
  driver_extra_distance_payout: number
  driver_surge_payout: number
  driver_payout_share: number
  platform_net_profit: number
}

export interface CreateOrderResult {
  success: boolean
  order?: any
  orderId?: string
  billing?: OrderPriceBreakdown
  error?: string | { code: string; error: string }
  message?: string
  statusCode?: number
}

export interface UpdateOrderResult {
  success: boolean
  order?: any
  error?: string | { code: string; error: string }
  currentStatus?: string
  targetStatus?: string
  validNextStates?: string[]
  statusCode?: number
}

export interface GetOrderResult {
  success: boolean
  order?: any
  driverLocation?: any | null
  missedEvents?: any[]
  error?: string
  statusCode?: number
}

export interface ListOrdersResult {
  success: boolean
  orders: any[]
  error?: string
  statusCode?: number
}

export interface CancelOrderResult {
  success: boolean
  refundQueued?: boolean
  error?: string
  statusCode?: number
}
