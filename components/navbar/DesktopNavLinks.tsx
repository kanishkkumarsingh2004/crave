'use client'

import React from 'react'
import Link from 'next/link'
import { Bike, Compass, LayoutDashboard, ShoppingBag, Zap } from 'lucide-react'
import { UserRole } from '@/lib/auth-context'
import { roleDetails } from './types'

interface DesktopNavLinksProps {
  user: any
  showCustomerNav: boolean
  pathname: string
  currentDashboardLink: string
  normalizedRole: string
  role?: string
}

export function DesktopNavLinks({
  user,
  showCustomerNav,
  pathname,
  currentDashboardLink,
  normalizedRole,
  role,
}: DesktopNavLinksProps) {
  if (!user) return null

  return (
    <div className="hidden items-center gap-1 text-xs font-bold justify-center bg-gray-100/80 dark:bg-white/[0.06] p-1 rounded-full border border-gray-200/60 dark:border-white/10 backdrop-blur-xl lg:flex">
      {showCustomerNav ? (
        <>
          <Link
            href="/user/explore"
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition shrink-0 ${
              pathname.includes('/user/explore') ||
              (pathname.includes('/user/dashboard') && !pathname.includes('/user/cravexp'))
                ? 'bg-white dark:bg-[#18201c] text-[#18201c] dark:text-[#d9f447] shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-[#18201c] dark:hover:text-white'
            }`}
          >
            <Compass className="size-3.5 text-[#86a018] dark:text-[#d9f447]" />
            <span>Explore</span>
          </Link>
          <Link
            href="/user/cravexp"
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition shrink-0 ${
              pathname.includes('/user/cravexp')
                ? 'bg-white dark:bg-[#18201c] text-[#18201c] dark:text-[#d9f447] shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-[#18201c] dark:hover:text-white'
            }`}
          >
            <Zap className="size-3.5 text-[#86a018] dark:text-[#d9f447]" />
            <span>craveXP</span>
            <span className="text-[10px] font-extrabold uppercase text-emerald-600 dark:text-emerald-400">
              10m
            </span>
          </Link>
          <Link
            href="/user/track"
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition shrink-0 ${
              pathname.includes('/user/track')
                ? 'bg-white dark:bg-[#18201c] text-[#18201c] dark:text-[#d9f447] shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-[#18201c] dark:hover:text-white'
            }`}
          >
            <Bike className="size-3.5 text-[#86a018] dark:text-[#d9f447]" />
            <span>Track Drop</span>
          </Link>
          <Link
            href="/user/orders"
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition shrink-0 ${
              pathname.includes('/user/orders')
                ? 'bg-white dark:bg-[#18201c] text-[#18201c] dark:text-[#d9f447] shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-[#18201c] dark:hover:text-white'
            }`}
          >
            <ShoppingBag className="size-3.5 text-[#86a018] dark:text-[#d9f447]" />
            <span>Orders</span>
          </Link>
        </>
      ) : (
        <Link
          href={currentDashboardLink}
          className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition shrink-0 ${
            pathname.includes('dashboard')
              ? 'bg-white dark:bg-[#18201c] text-[#18201c] dark:text-[#d9f447] shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:text-[#18201c] dark:hover:text-white'
          }`}
        >
          <LayoutDashboard className="size-3.5 text-[#b5de28]" />
          <span>
            Dashboard ({roleDetails[normalizedRole as UserRole]?.title || user?.role || role})
          </span>
        </Link>
      )}
    </div>
  )
}
