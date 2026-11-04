/**
 * Admin app type definitions extracted from App.tsx
 */

export interface AdminUser {
  id: string
  name: string
  email: string
  role: string
}

export interface AdminStats {
  weeklyGross?: number
  weeklyRevenue?: number
  orderCount?: number
  totalCommission?: number
  customerCount?: number
  vendorCount?: number
  driverCount?: number
  restaurantCount?: number
  liveDevices?: number
}

export interface OrderRecord {
  id: string
  status?: string
  customer_name?: string
  restaurant_name?: string
  total_amount?: number | string
  created_at?: string
}

export interface RestaurantRecord {
  id: string
  owner_id?: string | null
  name: string
  cuisine?: string
  phone?: string
  address?: string
  latitude?: number | string
  longitude?: number | string
  is_open?: boolean
  commission_rate?: number | string
  commercial_model?: 'commission' | 'markup' | 'hybrid'
  markup_rate?: number | string
  fixed_commission?: number | string
  fixed_markup?: number | string
}

export interface XPProduct {
  id: string
  name: string
  category: string
  unit: string
  price: number | string
  mrp: number | string
  image?: string | null
  in_stock: boolean
  stock_count: number
  sku_code: string
  barcode?: string | null
}

export interface XPProductForm {
  name: string
  category: string
  unit: string
  price: string
  mrp: string
  image: string
  stockCount: string
  barcode: string
  inStock: boolean
}

export interface PartnerForm {
  ownerName: string
  email: string
  password: string
  name: string
  cuisine: string
  phone: string
  address: string
  latitude: string
  longitude: string
  commercialModel: 'commission' | 'markup' | 'hybrid'
  commissionRate: string
  markupRate: string
  fixedCommission: string
  fixedMarkup: string
}

export interface PaymentReview {
  id: string
  order_id: string
  customer_vpa?: string | null
  utr_ref: string
  amount: number | string
  status: 'pending' | 'verified' | 'rejected'
  created_at?: string
}

export interface DriverPayoutRecord {
  id: string
  driver_id: string
  amount: number | string
  status: string
  transaction_ref?: string | null
  created_at?: string
  driver?: { id: string; name?: string | null; email?: string | null; phone?: string | null }
}

export interface DashboardData {
  stats: AdminStats
  orders: OrderRecord[]
  restaurants: RestaurantRecord[]
}

export interface AddressMapPoint {
  lat: number
  lng: number
}