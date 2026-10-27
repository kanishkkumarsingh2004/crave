import { GroceryItem } from '@/components/dashboards/CraveXPStore'

export interface GroceryOrderItem {
  name: string
  qty: number
  unit: string
  packed?: boolean
  skuCode: string
}

export interface IncomingGroceryOrder {
  id: string
  customerName: string
  phone: string
  address: string
  distance?: string
  items: GroceryOrderItem[]
  total: number
  paymentMethod: string
  time: string
  status: 'new' | 'packing' | 'ready' | 'picked_up'
  packTimerSeconds?: number
  pickerName: string
  batchZone: string
}

export type InventoryItem = GroceryItem & {
  skuCode: string
  expiryDate: string | null
}
