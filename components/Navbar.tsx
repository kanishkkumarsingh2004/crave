'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Menu, ShoppingCart } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useCart } from '@/lib/cart-context'
import ThemeToggle from '@/components/ThemeToggle'
import { cn } from '@/lib/utils'
import { roleDetails } from './navbar/types'
import { AddressPill } from './navbar/AddressPill'
import { DesktopNavLinks } from './navbar/DesktopNavLinks'
import { UserDropdown } from './navbar/UserDropdown'
import { MobileMenuDrawer } from './navbar/MobileMenuDrawer'
import CraveLogo from '@/components/CraveLogo'

export { roleDetails }

const AddressModal = dynamic(() => import('@/components/AddressModal'), {
  ssr: false,
})

export default function Navbar() {
  const { user, role, logout } = useAuth()
  const { items: cartItems, totalCount: cartCount } = useCart()
  const cartSubtotal = cartItems.reduce((acc, i) => acc + i.price * i.qty, 0)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [mounted, setMounted] = useState(false)
  const [navVisible, setNavVisible] = useState(true)
  const lastScrollYRef = useRef(0)
  const pathname = usePathname()

  // Auto-hide mobile top navbar on scroll down, show on scroll up
  useEffect(() => {
    let ticking = false
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentY = window.scrollY
          if (currentY < 30) {
            setNavVisible(true)
          } else if (currentY > lastScrollYRef.current + 10) {
            setNavVisible(false)
          } else if (currentY < lastScrollYRef.current - 10) {
            setNavVisible(true)
          }
          lastScrollYRef.current = currentY
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('crave_selected_address')
      if (stored) setDeliveryAddress(stored)
      else if (user?.address) setDeliveryAddress(user.address)
    } else if (user?.address) {
      setDeliveryAddress(user.address)
    }
  }, [user?.address])

  const normalizedRole = (user?.role || role || '').toString().toLowerCase().trim()
  const isCustomerRoute =
    pathname.startsWith('/user') ||
    pathname === '/' ||
    pathname.startsWith('/track') ||
    pathname.startsWith('/checkout')
  const isCustomer = Boolean(user && (normalizedRole === 'customer' || normalizedRole === 'user'))
  const showCustomerNav = Boolean(user && (isCustomer || isCustomerRoute))

  const currentDashboardLink = isCustomer
    ? '/user/dashboard'
    : normalizedRole === 'rider' || normalizedRole === 'driver'
      ? '/driver/dashboard'
      : normalizedRole === 'restaurant_vendor' || normalizedRole === 'vendor'
        ? '/vendor/dashboard'
        : normalizedRole === 'cravexp_store_vendor'
          ? '/vendor/crave-ep'
          : normalizedRole === 'admin'
            ? '/admin/dashboard'
            : '/'
  const logoTargetLink = user ? currentDashboardLink : '/'

  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 pt-[env(safe-area-inset-top,0px)] border-b border-gray-200/70 dark:border-white/10 bg-white/90 dark:bg-[#121815]/90 backdrop-blur-md">
        <nav className="mx-auto flex max-w-[1240px] items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group shrink-0" suppressHydrationWarning aria-label="crave home">
              <CraveLogo variant="full" size="md" />
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <Link
                href="/login"
                className="rounded-full border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] px-4 py-2 text-xs font-semibold text-[#18201c] dark:text-white transition hover:bg-[#f3f6ee] dark:hover:bg-[#27342d]"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-[#18201c] dark:bg-[#d9f447] px-4 py-2 text-xs font-semibold text-white dark:text-[#18201c] transition hover:bg-[#323c36] dark:hover:bg-[#c8e434]"
              >
                Sign up
              </Link>
            </div>
          </div>
        </nav>
      </header>
    )
  }

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-50 pt-[env(safe-area-inset-top,0px)] border-b border-gray-200/70 dark:border-white/10 bg-white/85 dark:bg-[#0c100e]/85 backdrop-blur-xl transition-all duration-300',
          navVisible ? 'translate-y-0' : '-translate-y-full lg:translate-y-0'
        )}
      >
        <nav className="mx-auto flex max-w-[1240px] items-center justify-between px-3 py-2 sm:px-6 sm:py-2.5 gap-2">
          {/* Logo */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link href={logoTargetLink} className="flex items-center gap-1.5 group shrink-0" aria-label="crave home">
              <CraveLogo variant="full" size="md" />
            </Link>
          </div>

          {/* Center navigation links (Desktop) */}
          <DesktopNavLinks
            user={user}
            showCustomerNav={showCustomerNav}
            pathname={pathname}
            currentDashboardLink={currentDashboardLink}
            normalizedRole={normalizedRole}
            role={role}
          />

          {/* Right side — auth & profile */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {user && showCustomerNav && (
              <AddressPill
                deliveryAddress={deliveryAddress}
                userAddress={user?.address}
                onClick={() => setShowAddressModal(true)}
              />
            )}

            <div className="hidden sm:flex items-center">
              <ThemeToggle />
            </div>

            {user && (
              <>
                <Link
                  href="/user/cart"
                  className="hidden sm:flex relative items-center gap-2 rounded-full bg-[#18201c] dark:bg-[#d9f447] px-4 py-2 text-xs font-bold text-white dark:text-[#18201c] shadow-xs hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
                  title="View Cart"
                >
                  <ShoppingCart className="size-3.5 text-[#d9f447] dark:text-[#18201c]" />
                  <span>Cart ({cartCount})</span>
                  {cartSubtotal > 0 && (
                    <span className="text-[#d9f447] dark:text-[#18201c] font-black">
                      &bull; ₹{cartSubtotal}
                    </span>
                  )}
                </Link>

                <Link
                  href="/user/cart"
                  className="sm:hidden relative grid size-9 place-items-center rounded-full border border-gray-200/80 dark:border-white/10 bg-white dark:bg-[#18201c] text-[#18201c] dark:text-white shadow-xs"
                  title="View Cart"
                >
                  <ShoppingCart className="size-4" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 grid size-4.5 place-items-center rounded-full bg-[#86a018] text-[9px] font-black text-white shadow-sm">
                      {cartCount}
                    </span>
                  )}
                </Link>
              </>
            )}

            {user ? (
              <UserDropdown
                user={user}
                isCustomer={isCustomer}
                normalizedRole={normalizedRole}
                currentDashboardLink={currentDashboardLink}
                onLogout={logout}
              />
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <Link
                  href="/login"
                  className="rounded-full border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] px-4 py-2 text-xs font-semibold text-[#18201c] dark:text-white transition hover:bg-[#f3f6ee] dark:hover:bg-[#27342d]"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-full bg-[#18201c] dark:bg-[#d9f447] px-4 py-2 text-xs font-semibold text-white dark:text-[#18201c] transition hover:bg-[#323c36] dark:hover:bg-[#c8e434]"
                >
                  Sign up
                </Link>
              </div>
            )}

            <button
              onClick={() => setShowMobileMenu(true)}
              className="grid size-9 place-items-center rounded-full border border-gray-200/80 dark:border-white/10 bg-white dark:bg-[#18201c] lg:hidden text-[#18201c] dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition cursor-pointer"
              aria-label="Open mobile menu"
            >
              <Menu className="size-4.5" />
            </button>
          </div>
        </nav>
      </header>

      <MobileMenuDrawer
        isOpen={showMobileMenu}
        onClose={() => setShowMobileMenu(false)}
        user={user}
        role={role}
        isCustomer={isCustomer}
        showCustomerNav={showCustomerNav}
        deliveryAddress={deliveryAddress}
        currentDashboardLink={currentDashboardLink}
        logoTargetLink={logoTargetLink}
        cartCount={cartCount}
        onOpenAddressModal={() => setShowAddressModal(true)}
        onLogout={logout}
      />

      {showAddressModal && (
        <AddressModal
          isOpen={showAddressModal}
          onClose={() => setShowAddressModal(false)}
          onSelectAddress={(addr) => {
            setDeliveryAddress(addr.address)
            if (typeof window !== 'undefined') {
              localStorage.setItem('crave_selected_address', addr.address)
            }
            setShowAddressModal(false)
          }}
        />
      )}
    </>
  )
}
