import { PriceTaxMode } from '@/lib/commercial-engine'

export interface InvoiceOrderData {
  id: string
  restaurantName?: string
  restaurantAddress?: string
  customerName?: string
  customerAddress?: string
  customerPhone?: string
  timestamp?: string
  items?: Array<{
    name: string
    qty?: number
    quantity?: number
    price?: number
    mrp?: number
    hsnSacCode?: string
    taxCategory?: string
    priceTaxMode?: PriceTaxMode
    taxRate?: number
  }>
  subtotal?: number
  packagingFee?: number
  deliveryFee?: number
  platformFee?: number
  handlingFee?: number
  gst?: number
  tip?: number
  discountAmount?: number
  couponCode?: string
  total?: number
  paymentMethod?: string
  utrRef?: string
  otp?: string
  status?: string
  driverName?: string
}
