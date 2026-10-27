'use client'

import React, { useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Bike,
  Compass,
  Download,
  MapPin,
  ShoppingBag,
  ShoppingCart,
  User,
  UtensilsCrossed,
  X,
  Zap,
} from 'lucide-react'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import ThemeToggle from '@/components/ThemeToggle'
import CraveLogo from '@/components/CraveLogo'

interface MobileMenuDrawerProps {
  isOpen: boolean
  onClose: () => void
  user: any
  role?: string
  isCustomer: boolean
  showCustomerNav: boolean
  deliveryAddress: string
  currentDashboardLink: string
  logoTargetLink: string
  cartCount: number
  onOpenAddressModal: () => void
  onLogout: () => Promise<void>
}

export function MobileMenuDrawer({
  isOpen,
  onClose,
  user,
  role,
  isCustomer,
  showCustomerNav,
  deliveryAddress,
  currentDashboardLink,
  logoTargetLink,
  cartCount,
  onOpenAddressModal,
  onLogout,
}: MobileMenuDrawerProps) {
  const mobileMenuRef = useRef<HTMLElement>(null)
  const lastFocusedRef = useRef<HTMLElement | null>(null)

  // Focus trap for mobile menu
  useEffect(() => {
    if (isOpen && mobileMenuRef.current) {
      lastFocusedRef.current = document.activeElement as HTMLElement
      const focusableElements = mobileMenuRef.current.querySelectorAll<HTMLElement>(
        'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      firstElement?.focus()

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault()
            lastElement?.focus()
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault()
            firstElement?.focus()
          }
        }
        if (e.key === 'Escape') {
          onClose()
        }
      }

      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'

      return () => {
        document.removeEventListener('keydown', handleKeyDown)
        document.body.style.overflow = ''
        lastFocusedRef.current?.focus()
      }
    }
  }, [isOpen, onClose])

  return (
    <>
      {/* Mobile menu overlay */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-[85] bg-black/40 backdrop-blur-xs transition-opacity duration-300 lg:hidden ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden="true"
      />

      {/* Mobile slide-in drawer */}
      <aside
        ref={mobileMenuRef}
        id="mobile-menu-drawer"
        aria-label="Mobile navigation"
        aria-hidden={!isOpen}
        className={`fixed inset-y-0 right-0 z-[90] flex w-[min(20rem,85vw)] flex-col border-l border-[#e2e6de] dark:border-[#27342d] bg-white dark:bg-[#18201c] text-[#18201c] dark:text-white shadow-2xl transition-transform duration-300 ease-out lg:hidden ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-[#e5e9e1] dark:border-[#27342d] px-5 py-4">
          <Link href={logoTargetLink} onClick={onClose} className="flex items-center gap-2" aria-label="crave home">
            <CraveLogo variant="full" size="md" />
          </Link>
          <button
            onClick={onClose}
            className="grid size-10 place-items-center rounded-full border border-[#dfe4dc] dark:border-[#27342d] text-gray-600 dark:text-gray-300"
            aria-label="Close menu"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex flex-col gap-1 p-4 text-sm font-semibold overflow-y-auto">
          {user ? (
            <>
              {/* User Profile Summary Card */}
              <div className="rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200/80 dark:border-white/10 p-3 mb-2">
                <div className="flex items-center gap-2.5">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="size-9 rounded-full object-cover"
                    />
                  ) : (
                    <span className="grid size-9 place-items-center rounded-full bg-[#d9f447] text-xs font-black text-[#18201c]">
                      {user.name.charAt(0)}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-[#18201c] dark:text-white truncate">
                      {user.name}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                      {user.email}
                    </p>
                  </div>
                  <span className="text-[10px] font-extrabold uppercase text-emerald-600 dark:text-emerald-400">
                    {isCustomer ? 'Customer' : user?.role || role}
                  </span>
                </div>
              </div>

              {/* Mobile Address Selector Card */}
              {showCustomerNav && (
                <div className="rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-500/20 p-3 mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="size-4 text-emerald-600 dark:text-[#d9f447] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-400">
                        DELIVER TO
                      </p>
                      <p className="text-xs font-bold text-[#18201c] dark:text-white truncate">
                        {deliveryAddress || user?.address || 'Select Delivery Location'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onClose()
                      onOpenAddressModal()
                    }}
                    className="text-xs font-bold text-emerald-700 dark:text-[#d9f447] underline shrink-0 cursor-pointer"
                  >
                    Change
                  </button>
                </div>
              )}

              <Link
                href={currentDashboardLink}
                onClick={onClose}
                className="flex items-center justify-between rounded-xl px-4 py-3 text-[#18201c] dark:text-white hover:bg-[#f3f6ee] dark:hover:bg-[#27342d] min-h-[44px]"
              >
                <span>Dashboard</span>
                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 capitalize">
                  Overview
                </span>
              </Link>

              <div className="my-1 border-t border-[#e5e9e1] dark:border-[#27342d]" />

              <Link
                href="/user/explore"
                onClick={onClose}
                className="flex items-center gap-3 rounded-xl px-4 py-4 text-[#2d3732] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d] min-h-[44px]"
              >
                <Compass className="size-5 text-[#b5de28]" />
                Explore
              </Link>

              <Link
                href="/user/cravexp"
                onClick={onClose}
                className="flex items-center justify-between rounded-xl px-4 py-4 text-[#2d3732] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d] min-h-[44px]"
              >
                <span className="flex items-center gap-3">
                  <Zap className="size-5 text-emerald-600 fill-emerald-600" />
                  <span>craveXP Instamart</span>
                </span>
                <span className="text-[10px] font-extrabold uppercase text-emerald-600 dark:text-emerald-400">
                  10 MIN
                </span>
              </Link>

              <Link
                href="/user/track"
                onClick={onClose}
                className="flex items-center gap-3 rounded-xl px-4 py-4 text-[#2d3732] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d] min-h-[44px]"
              >
                <Bike className="size-5 text-[#b5de28]" />
                Track Drop
              </Link>

              <Link
                href="/user/orders"
                onClick={onClose}
                className="flex items-center gap-3 rounded-xl px-4 py-4 text-[#2d3732] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d] min-h-[44px]"
              >
                <ShoppingBag className="size-5 text-[#b5de28]" />
                Orders
              </Link>

              <Link
                href="/user/profile"
                onClick={onClose}
                className="flex items-center gap-3 rounded-xl px-4 py-4 text-[#2d3732] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d] min-h-[44px]"
              >
                <User className="size-5 text-[#b5de28]" />
                Profile
              </Link>

              <Link
                href="/user/dashboard"
                onClick={onClose}
                className="flex items-center justify-between rounded-xl px-4 py-4 text-[#2d3732] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d] min-h-[44px]"
              >
                <span className="flex items-center gap-3">
                  <ShoppingCart className="size-5 text-[#b5de28]" />
                  Cart
                </span>
                {cartCount > 0 && (
                  <span className="rounded-full bg-[#b5de28] px-2 py-0.5 text-[10px] font-bold text-white">
                    {cartCount}
                  </span>
                )}
              </Link>

              {/* Language switcher in mobile drawer */}
              <div className="px-1 py-1 flex flex-col gap-2">
                <LanguageSwitcher variant="menu" />
                <ThemeToggle variant="pill" className="w-full justify-between" />
              </div>

              {/* Install App for logged-in user */}
              <button
                onClick={() => {
                  onClose()
                  window.dispatchEvent(new CustomEvent('trigger-pwa-install'))
                }}
                className="flex items-center gap-3 rounded-xl px-4 py-4 text-[#2d3732] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d] text-left w-full font-semibold min-h-[44px]"
              >
                <Download className="size-5 text-[#b5de28]" />
                Install Crave App
              </button>

              <button
                onClick={async () => {
                  onClose()
                  await onLogout()
                }}
                className="rounded-xl px-4 py-4 text-left font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 min-h-[44px]"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/"
                onClick={onClose}
                className="rounded-xl px-4 py-4 text-[#18201c] dark:text-white hover:bg-[#f3f6ee] dark:hover:bg-[#27342d] min-h-[44px]"
              >
                Explore
              </Link>
              {/* Language switcher for guests too */}
              <div className="px-1 py-1 flex flex-col gap-2">
                <LanguageSwitcher variant="menu" />
                <ThemeToggle variant="pill" className="w-full justify-between" />
              </div>

              {/* Install App for guest user */}
              <button
                onClick={() => {
                  onClose()
                  window.dispatchEvent(new CustomEvent('trigger-pwa-install'))
                }}
                className="flex items-center gap-3 rounded-xl px-4 py-4 text-[#2d3732] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d] text-left w-full font-semibold min-h-[44px]"
              >
                <Download className="size-5 text-[#b5de28]" />
                Install Crave App
              </button>

              <Link
                href="/login"
                onClick={onClose}
                className="mt-2 rounded-full border border-[#dfe4dc] dark:border-[#27342d] px-4 py-4 text-center text-sm font-bold text-[#18201c] dark:text-white hover:bg-[#f3f6ee] dark:hover:bg-[#27342d] min-h-[44px]"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                onClick={onClose}
                className="rounded-full bg-[#18201c] dark:bg-[#d9f447] px-4 py-4 text-center text-sm font-bold text-white dark:text-[#18201c] hover:bg-[#323c36] dark:hover:bg-[#c8e434] min-h-[44px]"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </aside>
    </>
  )
}
