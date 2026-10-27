import { Coupon } from '@/lib/coupons'

export interface RestaurantItem {
  id: string
  name: string
  address: string
}

export type StatusFilter = 'all' | 'active' | 'inactive'
