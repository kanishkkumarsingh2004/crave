export interface TransactionRecord {
  id: string
  orderId: string
  customerName: string
  customerPhone?: string
  restaurantName: string
  restaurantId?: string
  amount: number
  subtotal: number
  deliveryFee: number
  platformFee: number
  handlingFee: number
  packagingFee: number
  gst: number
  paymentMethod: 'razorpay' | 'cod' | 'upi_manual' | 'online'
  gatewayPaymentId?: string
  gatewayOrderId?: string
  paymentStatus: 'paid' | 'verified' | 'pending' | 'rejected' | 'refunded'
  orderStatus: string
  createdAt: string
  itemsCount: number
  vendorCut: number
  driverCut: number
  platformCut: number
}

export function formatCurrency(num: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(num)
}

export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins === 1) return '1 min ago'
  if (diffMins < 60) return `${diffMins} mins ago`
  if (diffHours === 1) return '1 hr ago'
  if (diffHours < 24) return `${diffHours} hrs ago`
  if (diffDays === 1) return 'Yesterday'
  return `${diffDays} days ago`
}
