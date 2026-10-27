'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Bike,
  Compass,
  Download,
  LayoutDashboard,
  LogOut,
  ShoppingBag,
  Store,
  User,
  Zap,
} from 'lucide-react'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { roleDetails } from './types'
import { UserRole } from '@/lib/auth-context'

interface UserDropdownProps {
  user: any
  isCustomer: boolean
  normalizedRole: string
  currentDashboardLink: string
  onLogout: () => Promise<void>
}

export function UserDropdown({
  user,
  isCustomer,
  normalizedRole,
  currentDashboardLink,
  onLogout,
}: UserDropdownProps) {
  const [showDropdown, setShowDropdown] = useState(false)

  if (!user) return null

  return (
    <div className="relative hidden sm:block">
      <button
        onClick={() => setShowDropdown((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-white/[0.06] p-1 pr-2.5 transition hover:bg-stone-50 dark:hover:bg-white/10 cursor-pointer"
      >
        {user.avatar ? (
          <img src={user.avatar} alt={user.name} className="size-7 rounded-full object-cover" />
        ) : (
          <span className="grid size-7 place-items-center rounded-full bg-stone-100 dark:bg-white/15 text-xs font-semibold text-[#1D1D1F] dark:text-white">
            {user.name.charAt(0)}
          </span>
        )}
        <div className="hidden sm:block text-left">
          <p className="text-xs font-bold leading-none text-[#18201c] dark:text-white">
            {user.name}
          </p>
          <p className="mt-0.5 text-[10px] font-medium capitalize text-[#75817a] dark:text-gray-400">
            {isCustomer ? 'Customer' : user.role}
          </p>
        </div>
      </button>

      {showDropdown && (
        <div className="absolute right-0 top-11 z-50 w-56 rounded-2xl border border-[#e2e6df] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
          {/* User info header */}
          <div className="border-b border-[#eff2ed] dark:border-[#27342d] px-3 py-2.5">
            <p className="text-xs font-bold text-[#18201c] dark:text-white">{user.name}</p>
            <p className="text-[11px] text-[#78827c] dark:text-gray-400 truncate">{user.email}</p>
            <span
              className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${
                isCustomer
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : (roleDetails[user.role as UserRole]?.bg || 'bg-gray-100') +
                    ' ' +
                    (roleDetails[user.role as UserRole]?.color || 'text-gray-700')
              }`}
            >
              {isCustomer ? 'Customer View' : `${user.role} Account`}
            </span>
          </div>

          {/* Role-specific links */}
          {isCustomer ? (
            <>
              <Link
                href="/user/explore"
                onClick={() => setShowDropdown(false)}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#2d3732] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d] mt-1"
              >
                <Compass className="size-4 text-[#b5de28]" />
                Explore Kitchens
              </Link>
              <Link
                href="/user/cravexp"
                onClick={() => setShowDropdown(false)}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
              >
                <Zap className="size-4 text-emerald-600 fill-emerald-600" />
                craveXP Instamart (10 Min)
              </Link>
              <Link
                href="/user/orders"
                onClick={() => setShowDropdown(false)}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#2d3732] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d]"
              >
                <ShoppingBag className="size-4 text-[#b5de28]" />
                My Orders
              </Link>
              <Link
                href="/user/track"
                onClick={() => setShowDropdown(false)}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#2d3732] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d]"
              >
                <Bike className="size-4 text-[#b5de28]" />
                Track Order
              </Link>
              <Link
                href="/user/profile"
                onClick={() => setShowDropdown(false)}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#2d3732] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d]"
              >
                <User className="size-4 text-[#b5de28]" />
                My Profile Settings
              </Link>
            </>
          ) : (
            <>
              <Link
                href={currentDashboardLink}
                onClick={() => setShowDropdown(false)}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#2d3732] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d] mt-1"
              >
                <LayoutDashboard className="size-4 text-[#b5de28]" />
                Go to Dashboard
              </Link>
              {(normalizedRole === 'cravexp_store_vendor' || normalizedRole === 'admin') && (
                <Link
                  href="/vendor/crave-ep"
                  onClick={() => setShowDropdown(false)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                >
                  <Store className="size-4 text-emerald-600" />
                  craveXP. Console
                </Link>
              )}
            </>
          )}

          {/* Language switcher row */}
          <div className="border-t border-[#eff2ed] dark:border-[#27342d] mt-1 pt-2 px-1">
            <LanguageSwitcher variant="menu" />
          </div>

          {/* Install App */}
          <button
            onClick={() => {
              setShowDropdown(false)
              window.dispatchEvent(new CustomEvent('trigger-pwa-install'))
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-[#18201c] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d]"
          >
            <Download className="size-4 text-[#b5de28]" />
            Install Crave App
          </button>

          {/* Sign out */}
          <button
            onClick={async () => {
              setShowDropdown(false)
              await onLogout()
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-t border-[#eff2ed] dark:border-[#27342d] mt-1 pt-2"
          >
            <LogOut className="size-4" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}
