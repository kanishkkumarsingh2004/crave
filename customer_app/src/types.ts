export interface User {
  id: string
  name: string
  email: string
  phone?: string
  role: string
}
export interface Restaurant {
  id: string
  name: string
  cuisine?: string
  rating?: number
  rating_count?: number
  eta?: string
  distance?: string
  cost_for_two?: number
  image?: string
  address?: string
  offer?: string
  is_open?: boolean
  is_dark_store?: boolean
  is_pure_veg?: boolean
  latitude?: number | string
  longitude?: number | string
}
export interface Variant {
  id: string
  name: string
  price: number
  in_stock: boolean
  is_default: boolean
}
export interface MenuItem {
  id: string
  restaurant_id: string
  name: string
  description?: string
  detail?: string
  category?: string
  price: number
  image?: string
  image_url?: string
  is_veg?: boolean
  veg?: boolean
  in_stock?: boolean
  is_available?: boolean
  variants?: Variant[]
}
export interface CartItem {
  key: string
  itemId: string
  variantId?: string
  name: string
  variant?: string
  price: number
  quantity: number
  image?: string
}
export interface Address {
  id: string
  label: string
  address: string
  latitude?: number | string
  longitude?: number | string
  is_default?: boolean
}
export interface Order {
  id: string
  restaurant_id?: string
  restaurant_name?: string
  status: string
  payment_status?: string
  total_amount: number
  created_at?: string
  items: any[]
  delivery_otp?: string | null
  otp_consumed_at?: string | null
  customer_address?: string
}
