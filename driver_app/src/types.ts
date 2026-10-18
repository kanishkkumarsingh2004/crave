export type AppTab = 'home' | 'trips' | 'earnings' | 'rewards' | 'account'

export interface DriverUser {
  id: string
  name: string
  email: string
  role: string
  phone?: string
  address?: string
  vehicleType?: string
  licensePlate?: string
}

export interface DriverProfile extends DriverUser {
  vehicleNo?: string
  zone?: string
  kycStatus?: string
}

export interface DriverOffer {
  id: string
  status: string
  restaurantId?: string
  restaurantName: string
  customerArea: string
  itemsCount: number
  distanceKm: number
  driverPayout: number
  tip: number
  createdAt?: string
}

export interface DriverOrder {
  id: string
  status: string
  restaurant_id?: string
  restaurant_name?: string
  customer_name?: string
  customer_phone?: string
  customer_address?: string
  items?: any[] | string
  rider_id?: string
  driver_name?: string
  delivery_latitude?: number | string
  delivery_longitude?: number | string
  driver_payout?: number | string
  financial_snapshot?: { riderPayablePaise?: number; riderTipPaise?: number } | null
  delivery_fee?: number | string
  tip?: number | string
  total_amount?: number | string
  created_at?: string
}

export interface CompletedTrip {
  id: string
  order: string
  restaurant: string
  customer: string
  baseEarnings: number
  surge: number
  tip: number
  total: number
  time: string
  distance: string
}

export interface PayoutLog {
  id: string
  amount: number
  date: string
  status: string
}

export interface UpiAccount {
  id: string
  vpa: string
  bankName: string
  isPrimary: boolean
  isVerified: boolean
}

export interface Incentive {
  id: string
  title: string
  description: string
  rewardAmount: number
  startsAt?: string
  endsAt?: string
  isActive: boolean
}

export interface DriverOrdersResponse {
  success: boolean
  activeOrder: DriverOrder | null
  completedTrips: CompletedTrip[]
  allAssignedOrders: DriverOrder[]
}
