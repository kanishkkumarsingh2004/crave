export interface KitchenItem {
  name: string
  qty: number
  price?: number
}

export interface KitchenOrder {
  id: string
  customerName: string
  customerPhone?: string
  itemsText: string
  itemsList: KitchenItem[]
  subtotal: number
  totalAmount: number
  status: string
  paymentStatus: string
  time: string
  createdAt?: string
  address: string
  utrRef?: string
}
