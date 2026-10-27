export interface CancelledOrder {
  id: string
  status: string
  paymentStatus: string
  paymentMethod: string
  utrRef?: string
  createdAt: string
  totalAmount: number
  totalAmountPaise: number
  subtotal: number
  deliveryFee: number
  platformFee: number
  handlingFee: number
  packagingFee: number
  gst: number
  items: Array<{
    name: string
    qty: number
    price: number
    variantName?: string
  }>
  customer: {
    id: string
    name: string
    email: string
    phone: string
  }
  restaurant: {
    id: string
    name: string
    phone?: string
    address?: string
  }
  refund: {
    id: string
    status: 'pending' | 'processing' | 'completed' | 'failed'
    amount: number
    amountPaise?: number
    reason: string
    createdAt: string
    processedAt?: string
    gatewayRefundId?: string
  } | null
}

export interface Metrics {
  totalCancelledCount: number
  pendingRefundsCount: number
  pendingRefundsPaise: number
  pendingRefundsRupees: number
  approvedRefundsPaise: number
  approvedRefundsRupees: number
}

export function formatInr(num: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num)
}
