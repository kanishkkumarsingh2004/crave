export type AppTab = 'home' | 'profile' | 'orders' | 'menu' | 'sales' | 'settings'

export interface RestaurantUser {
  id: string
  name: string
  email: string
  role: string
  phone?: string
  address?: string
  restaurantName?: string
  restaurantId?: string
  restaurant_id?: string
  cuisine?: string
}

export interface Restaurant {
  id: string
  owner_id?: string | null
  name: string
  cuisine?: string | null
  address?: string | null
  phone?: string | null
  image?: string | null
  is_open: boolean
  rating?: number | string | null
  commission_rate?: number | string | null
  bank_account_name?: string | null
  bank_name?: string | null
  bank_account_number?: string | null
  bank_ifsc?: string | null
  payout_vpa?: string | null
  fssai_license?: string | null
  gstin?: string | null
  gst_status?: string | null
  supplier_state?: string | null
  price_tax_mode?: string | null
}

export interface OrderLine {
  name: string
  qty: number
  price: number
  variantName?: string
}

export interface RestaurantOrder {
  id: string
  restaurant_id?: string
  customer_name?: string
  customer_phone?: string
  customer_address?: string
  items: OrderLine[] | string
  subtotal?: number | string
  total_amount?: number | string
  status: string
  payment_status?: string
  created_at?: string
  createdAt?: string
  utr_ref?: string
  utrRef?: string
  driver_name?: string
}

export interface MenuVariant {
  id: string
  name: string
  restaurant_price: number
  price: number
  in_stock: boolean
  is_default: boolean
}

export interface MenuItem {
  id: string
  restaurant_id: string
  name: string
  category: string
  price: number
  restaurant_price: number
  description: string
  image: string
  in_stock: boolean
  is_veg: boolean
  stock_count: number
  unit?: string | null
  variants: MenuVariant[]
}

export interface Settlement {
  id: string
  gross_sales?: number | string
  commission_amount?: number | string
  net_payout?: number | string
  status: string
  payout_date?: string
  transaction_ref?: string
  period_start?: string
  period_end?: string
}

export interface SettlementSummary {
  total_gross_sales: number
  total_commission: number
  total_net_payable: number
  total_settled_amount: number
  remaining_balance: number
}

export interface MenuEditorValue {
  id?: string
  name: string
  category: string
  description: string
  restaurantPrice: string
  image: string
  isVeg: boolean
  inStock: boolean
  unit: string
  useSizes: boolean
  variants: MenuVariant[]
}
