export type Restaurant = {
  id: string
  name: string
  cuisine: string
  rating: string
  ratingCount: string
  eta: string
  distance: string
  costForTwo: string
  image: string
  tag: string
  address: string
  offer?: string
  isPureVeg?: boolean
  latitude?: number | string | null
  longitude?: number | string | null
  deliveryMinutes?: number | null
  delivery_minutes?: number | null
  isOpen?: boolean
}

export type MenuItemVariant = {
  id: string
  name: string
  price: number
  inStock: boolean
  isDefault: boolean
}

export type MenuItem = {
  id: string
  menuItemId?: string
  name: string
  detail: string
  price: number
  image: string
  veg: boolean
  restaurantName?: string
  restaurantId?: string
  vendorId?: string
  restaurantLat?: number
  restaurantLng?: number
  category?: string
  in_stock?: boolean
  inStock?: boolean
  stock_count?: number
  rating?: string | number
  bestseller?: boolean
  variantId?: string
  variantName?: string
  variants?: MenuItemVariant[]
}

export type CartItem = MenuItem & {
  qty: number
}

export type CustomerAddress = {
  id: string
  label: string
  address: string
  tag: string
  lat: number | null
  lng: number | null
  isDefault?: boolean
}

export interface LatLngCoords {
  lat: number
  lng: number
}

export type PastOrder = {
  id: string
  restaurantName: string
  restaurantImage: string
  items: Array<{ name: string; qty: number; price: number; variantName?: string }>
  subtotal: number
  discount: number
  total: number
  couponCode?: string
  date: string
  time: string
  status: 'Delivered' | 'Cancelled' | 'In Progress' | 'Pending'
  deliveryTime: string
  trackStep?: number
  otp?: string
  driverName?: string
  driverPhone?: string
  restaurantId?: string
}
