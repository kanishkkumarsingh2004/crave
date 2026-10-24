'use client'

import LanguageSwitcher from '@/components/LanguageSwitcher'
import ThemeToggle from '@/components/ThemeToggle'
import { useAuth, UserRole } from '@/lib/auth-context'
import { useCart } from '@/lib/cart-context'
import { cn } from '@/lib/utils'
import {
  Bike,
  ChevronDown,
  Compass,
  Download,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Store,
  User,
  UtensilsCrossed,
  X,
  Zap,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect, useRef, useState } from 'react'

const AddressModal = dynamic(() => import('@/components/AddressModal'), {
  ssr: false,
})

export const roleDetails: Partial<
  Record<
    UserRole,
    { title: string; badge: string; color: string; bg: string; icon: React.ElementType }
  >
> = {
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

export default function Navbar() {
  const { user, role, logout } = useAuth()
  const { items: cartItems, totalCount: cartCount } = useCart()
  const cartSubtotal = cartItems.reduce((acc, i) => acc + i.price * i.qty, 0)
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [mounted, setMounted] = useState(false)
  const [navVisible, setNavVisible] = useState(true)
  const lastScrollYRef = useRef(0)
  const mobileMenuRef = useRef<HTMLElement>(null)
  const lastFocusedRef = useRef<HTMLElement | null>(null)
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

  // Focus trap for mobile menu
  useEffect(() => {
    if (showMobileMenu && mobileMenuRef.current) {
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
          setShowMobileMenu(false)
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
  }, [showMobileMenu])

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
      <>
        <header className="sticky top-0 z-50 pt-[env(safe-area-inset-top,0px)] border-b border-gray-200/70 dark:border-white/10 bg-white/90 dark:bg-[#121815]/90 backdrop-blur-md">
          <nav className="mx-auto flex max-w-[1240px] items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2 group" suppressHydrationWarning>
                <span className="font-black text-xl sm:text-2xl tracking-tighter text-[#18201c] dark:text-white">
                  crave<span className="text-[#86a018]">.</span>
                </span>
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
      </>
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
            <Link href={logoTargetLink} className="flex items-center gap-1.5 group shrink-0">
              <span className="font-black text-xl sm:text-2xl tracking-tighter text-[#18201c] dark:text-white hover:opacity-90 transition">
                crave<span className="text-[#86a018]">.</span>
              </span>
            </Link>
          </div>

          {/* Center navigation links (Desktop) */}
          <div className="hidden items-center gap-1 text-xs font-bold justify-center bg-gray-100/80 dark:bg-white/[0.06] p-1 rounded-full border border-gray-200/60 dark:border-white/10 backdrop-blur-xl lg:flex">
            {user ? (
              <>
                {showCustomerNav ? (
                  <>
                    <Link
                      href="/user/explore"
                      className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition shrink-0 ${
                        pathname.includes('/user/explore') ||
                        (pathname.includes('/user/dashboard') &&
                          !pathname.includes('/user/cravexp'))
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
                      <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 text-[9px] font-black uppercase">
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
                      Dashboard (
                      {roleDetails[normalizedRole as UserRole]?.title || user?.role || role})
                    </span>
                  </Link>
                )}
              </>
            ) : null}
          </div>

          {/* Right side — auth & profile */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {user && showCustomerNav && (
              <>
                {/* Desktop Deliver-To Pill */}
                <button
                  type="button"
                  onClick={() => setShowAddressModal(true)}
                  className="hidden sm:flex items-center gap-2 rounded-full border border-gray-200/80 dark:border-white/10 bg-gray-50/80 dark:bg-white/[0.04] px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer max-w-[210px] lg:max-w-[280px]"
                  title="Change delivery location"
                >
                  <div className="grid size-6 place-items-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-[#d9f447] shrink-0">
                    <MapPin className="size-3.5" />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="flex items-center gap-1 leading-none text-[8px] font-black uppercase tracking-wider text-gray-400">
                      <span>DELIVER TO</span>
                      <span className="text-[#86a018] dark:text-[#d9f447] font-bold group-hover:underline">
                        (Change)
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 text-xs font-bold text-[#18201c] dark:text-white truncate mt-0.5">
                      <span className="truncate">
                        {deliveryAddress?.split(',')[0] ||
                          user?.address?.split(',')[0] ||
                          'Select Location'}
                      </span>
                      <ChevronDown className="size-3 text-gray-400 shrink-0" />
                    </div>
                  </div>
                </button>

                {/* Mobile Deliver-To Pill */}
                <button
                  type="button"
                  onClick={() => setShowAddressModal(true)}
                  className="sm:hidden flex items-center gap-1.5 rounded-full bg-gray-100/90 dark:bg-white/[0.06] border border-gray-200/60 dark:border-white/10 px-2.5 py-1 text-left min-w-0 max-w-[155px] xs:max-w-[190px] hover:bg-gray-200 dark:hover:bg-white/10 transition cursor-pointer"
                  title="Change delivery location"
                >
                  <MapPin className="size-3 text-emerald-600 dark:text-[#d9f447] shrink-0" />
                  <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200 truncate">
                    {deliveryAddress?.split(',')[0] ||
                      user?.address?.split(',')[0] ||
                      'Select location'}
                  </span>
                  <ChevronDown className="size-2.5 text-gray-400 shrink-0" />
                </button>
              </>
            )}

            <div className="hidden sm:flex items-center">
              <ThemeToggle />
            </div>

            {user && (
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
            )}

            {user && (
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
            )}

            {user ? (
              <div className="relative hidden sm:block">
                <button
                  onClick={() => setShowUserDropdown((v) => !v)}
                  className="flex items-center gap-2 rounded-full border border-[#dbe1d7] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-1 pr-2.5 transition hover:bg-[#f4f7f1] dark:hover:bg-[#27342d] cursor-pointer"
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="size-7 rounded-full object-cover"
                    />
                  ) : (
                    <span className="grid size-7 place-items-center rounded-full bg-[#d9f447] text-xs font-bold text-[#18201c]">
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

                {showUserDropdown && (
                  <div className="absolute right-0 top-11 z-50 w-56 rounded-2xl border border-[#e2e6df] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                    {/* User info header */}
                    <div className="border-b border-[#eff2ed] dark:border-[#27342d] px-3 py-2.5">
                      <p className="text-xs font-bold text-[#18201c] dark:text-white">
                        {user.name}
                      </p>
                      <p className="text-[11px] text-[#78827c] dark:text-gray-400 truncate">
                        {user.email}
                      </p>
                      <span
                        className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${
                          isCustomer
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : (roleDetails[user.role]?.bg || 'bg-gray-100') +
                              ' ' +
                              (roleDetails[user.role]?.color || 'text-gray-700')
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
                          onClick={() => setShowUserDropdown(false)}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#2d3732] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d] mt-1"
                        >
                          <Compass className="size-4 text-[#b5de28]" />
                          Explore Kitchens
                        </Link>
                        <Link
                          href="/user/cravexp"
                          onClick={() => setShowUserDropdown(false)}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                        >
                          <Zap className="size-4 text-emerald-600 fill-emerald-600" />
                          craveXP Instamart (10 Min)
                        </Link>
                        <Link
                          href="/user/orders"
                          onClick={() => setShowUserDropdown(false)}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#2d3732] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d]"
                        >
                          <ShoppingBag className="size-4 text-[#b5de28]" />
                          My Orders
                        </Link>
                        <Link
                          href="/user/track"
                          onClick={() => setShowUserDropdown(false)}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#2d3732] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d]"
                        >
                          <Bike className="size-4 text-[#b5de28]" />
                          Track Order
                        </Link>
                        <Link
                          href="/user/profile"
                          onClick={() => setShowUserDropdown(false)}
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
                          onClick={() => setShowUserDropdown(false)}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#2d3732] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d] mt-1"
                        >
                          <LayoutDashboard className="size-4 text-[#b5de28]" />
                          Go to Dashboard
                        </Link>
                        {(normalizedRole === 'cravexp_store_vendor' ||
                          normalizedRole === 'admin') && (
                          <Link
                            href="/vendor/crave-ep"
                            onClick={() => setShowUserDropdown(false)}
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
                        setShowUserDropdown(false)
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
                        setShowUserDropdown(false)
                        await logout()
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-t border-[#eff2ed] dark:border-[#27342d] mt-1 pt-2"
                    >
                      <LogOut className="size-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
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

      {/* Mobile menu overlay */}
      <div
        onClick={() => setShowMobileMenu(false)}
        className={`fixed inset-0 z-[85] bg-black/40 backdrop-blur-xs transition-opacity duration-300 lg:hidden ${
          showMobileMenu ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden="true"
      />

      {/* Mobile slide-in drawer */}
      <aside
        ref={mobileMenuRef}
        id="mobile-menu-drawer"
        aria-label="Mobile navigation"
        aria-hidden={!showMobileMenu}
        className={`fixed inset-y-0 right-0 z-[90] flex w-[min(20rem,85vw)] flex-col border-l border-[#e2e6de] dark:border-[#27342d] bg-white dark:bg-[#18201c] text-[#18201c] dark:text-white shadow-2xl transition-transform duration-300 ease-out lg:hidden ${
          showMobileMenu ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-[#e5e9e1] dark:border-[#27342d] px-5 py-4">
          <Link
            href={logoTargetLink}
            onClick={() => setShowMobileMenu(false)}
            className="flex items-center gap-2.5"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-[#d9f447] text-[#18201c]">
              <UtensilsCrossed className="size-5 fill-current" />
            </span>
            <span className="text-xl font-bold text-[#18201c] dark:text-white">
              crave<span className="text-[#869c18]">.</span>
            </span>
          </Link>
          <button
            onClick={() => setShowMobileMenu(false)}
            className="grid size-10 place-items-center rounded-full border border-[#dfe4dc] dark:border-[#27342d] text-gray-600 dark:text-gray-300"
            aria-label="Close menu"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex flex-col gap-1 p-4 text-sm font-semibold">
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
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400">
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
                      setShowMobileMenu(false)
                      setShowAddressModal(true)
                    }}
                    className="text-xs font-bold text-emerald-700 dark:text-[#d9f447] underline shrink-0 cursor-pointer"
                  >
                    Change
                  </button>
                </div>
              )}

              <Link
                href={currentDashboardLink}
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center justify-between rounded-xl px-4 py-3 text-[#18201c] dark:text-white hover:bg-[#f3f6ee] dark:hover:bg-[#27342d] min-h-[44px]"
              >
                <span>Dashboard</span>
                <span className="rounded-md bg-gray-100 dark:bg-white/10 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:text-gray-300 capitalize">
                  Overview
                </span>
              </Link>

              <div className="my-1 border-t border-[#e5e9e1] dark:border-[#27342d]" />

              <Link
                href="/user/explore"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-3 rounded-xl px-4 py-4 text-[#2d3732] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d] min-h-[44px]"
              >
                <Compass className="size-5 text-[#b5de28]" />
                Explore
              </Link>

              <Link
                href="/user/cravexp"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center justify-between rounded-xl px-4 py-4 text-[#2d3732] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d] min-h-[44px]"
              >
                <span className="flex items-center gap-3">
                  <Zap className="size-5 text-emerald-600 fill-emerald-600" />
                  <span>craveXP Instamart</span>
                </span>
                <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-black uppercase">
                  10 MIN
                </span>
              </Link>

              <Link
                href="/user/track"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-3 rounded-xl px-4 py-4 text-[#2d3732] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d] min-h-[44px]"
              >
                <Bike className="size-5 text-[#b5de28]" />
                Track Drop
              </Link>

              <Link
                href="/user/orders"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-3 rounded-xl px-4 py-4 text-[#2d3732] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d] min-h-[44px]"
              >
                <ShoppingBag className="size-5 text-[#b5de28]" />
                Orders
              </Link>

              <Link
                href="/user/profile"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-3 rounded-xl px-4 py-4 text-[#2d3732] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d] min-h-[44px]"
              >
                <User className="size-5 text-[#b5de28]" />
                Profile
              </Link>

              <Link
                href="/user/dashboard"
                onClick={() => setShowMobileMenu(false)}
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
                  setShowMobileMenu(false)
                  window.dispatchEvent(new CustomEvent('trigger-pwa-install'))
                }}
                className="flex items-center gap-3 rounded-xl px-4 py-4 text-[#2d3732] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d] text-left w-full font-semibold min-h-[44px]"
              >
                <Download className="size-5 text-[#b5de28]" />
                Install Crave App
              </button>

              <button
                onClick={async () => {
                  setShowMobileMenu(false)
                  await logout()
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
                onClick={() => setShowMobileMenu(false)}
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
                  setShowMobileMenu(false)
                  window.dispatchEvent(new CustomEvent('trigger-pwa-install'))
                }}
                className="flex items-center gap-3 rounded-xl px-4 py-4 text-[#2d3732] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d] text-left w-full font-semibold min-h-[44px]"
              >
                <Download className="size-5 text-[#b5de28]" />
                Install Crave App
              </button>

              <Link
                href="/login"
                onClick={() => setShowMobileMenu(false)}
                className="mt-2 rounded-full border border-[#dfe4dc] dark:border-[#27342d] px-4 py-4 text-center text-sm font-bold text-[#18201c] dark:text-white hover:bg-[#f3f6ee] dark:hover:bg-[#27342d] min-h-[44px]"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                onClick={() => setShowMobileMenu(false)}
                className="rounded-full bg-[#18201c] dark:bg-[#d9f447] px-4 py-4 text-center text-sm font-bold text-white dark:text-[#18201c] hover:bg-[#323c36] dark:hover:bg-[#c8e434] min-h-[44px]"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </aside>

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
