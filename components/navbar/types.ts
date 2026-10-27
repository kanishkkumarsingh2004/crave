import React from 'react'
import { Bike, ShieldCheck, ShoppingBag, Store, UtensilsCrossed } from 'lucide-react'
import { UserRole } from '@/lib/auth-context'

export interface RoleDetail {
  title: string
  badge: string
  color: string
  bg: string
  icon: React.ElementType
}

export const roleDetails: Partial<Record<UserRole, RoleDetail>> = {
  customer: {
    title: 'Customer',
    badge: 'Customer',
    color: 'text-emerald-700',
    bg: 'bg-emerald-100 border-emerald-200',
    icon: ShoppingBag,
  },
  vendor: {
    title: 'Vendor',
    badge: 'Restaurant Partner',
    color: 'text-amber-700',
    bg: 'bg-amber-100 border-amber-200',
    icon: Store,
  },
  driver: {
    title: 'Driver',
    badge: 'Delivery Partner',
    color: 'text-blue-700',
    bg: 'bg-blue-100 border-blue-200',
    icon: Bike,
  },
  admin: {
    title: 'Admin',
    badge: 'Admin Console',
    color: 'text-purple-700',
    bg: 'bg-purple-100 border-purple-200',
    icon: ShieldCheck,
  },
  user: {
    title: 'Customer',
    badge: 'Customer',
    color: 'text-emerald-700',
    bg: 'bg-emerald-100 border-emerald-200',
    icon: ShoppingBag,
  },
  restaurant_vendor: {
    title: 'Restaurant Vendor',
    badge: 'Restaurant Partner',
    color: 'text-amber-700',
    bg: 'bg-amber-100 border-amber-200',
    icon: UtensilsCrossed,
  },
  cravexp_store_vendor: {
    title: 'CraveXP Store Vendor',
    badge: 'CraveXP Store',
    color: 'text-purple-700',
    bg: 'bg-purple-100 border-purple-200',
    icon: Store,
  },
  rider: {
    title: 'Rider',
    badge: 'Delivery Partner',
    color: 'text-blue-700',
    bg: 'bg-blue-100 border-blue-200',
    icon: Bike,
  },
}
