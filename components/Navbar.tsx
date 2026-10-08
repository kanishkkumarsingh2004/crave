'use client'

import CraveLogo from '@/components/CraveLogo'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useAuth, UserRole } from '@/lib/auth-context'
import { useCart } from '@/lib/cart-context'
import {
  Bike,
  ChevronDown,
  Compass,
  Download,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Store,
  UtensilsCrossed,
  User,
  X,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'

export const roleDetails: Partial<
  Record<
    UserRole,
    { title: string; badge: string; color: string; bg: string; icon: React.ElementType }
  >
> = {
  customer: {
    title: 'Customer',
    badge: 'Customer View',
    color: 'text-emerald-700',
    bg: 'bg-emerald-100 border-emerald-200',
    icon: ShoppingBag,
  },
  vendor: {
    title: 'Vendor',
    badge: 'Kitchen Console',
    color: 'text-amber-700',
    bg: 'bg-amber-100 border-amber-200',
    icon: Store,
  },
  driver: {
    title: 'Driver',
    badge: 'Delivery Cockpit',
    color: 'text-blue-700',
    bg: 'bg-blue-100 border-blue-200',
    icon: Bike,
  },
  admin: {
    title: 'Admin',
    badge: 'Command Center',
    color: 'text-purple-700',
    bg: 'bg-purple-100 border-purple-200',
    icon: ShieldCheck,
  },
  user: {
    title: 'User',
    badge: 'User View',
    color: 'text-emerald-700',
    bg: 'bg-emerald-100 border-emerald-200',
    icon: ShoppingBag,
  },
  restaurant_vendor: {
    title: 'Restaurant Vendor',
    badge: 'Restaurant Console',
    color: 'text-amber-700',
    bg: 'bg-amber-100 border-amber-200',
    icon: UtensilsCrossed,
  },
  cravexp_store_vendor: {
    title: 'CraveXP Store Vendor',
    badge: 'CraveXP Console',
    color: 'text-purple-700',
    bg: 'bg-purple-100 border-purple-200',
    icon: Store,
  },
  rider: {
    title: 'Rider',
    badge: 'Delivery Cockpit',
    color: 'text-blue-700',
    bg: 'bg-blue-100 border-blue-200',
    icon: Bike,
  },
}

export default function Navbar() {
  const { user, role, logout } = useAuth()
  const { totalCount: cartCount } = useCart()
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  const currentDashboardLink =
    role === 'customer' || role === 'user'
      ? '/user/dashboard'
      : role === 'rider' || role === 'driver'
        ? '/driver/dashboard'
        : role === 'restaurant_vendor' || role === 'vendor'
          ? '/vendor/dashboard'
          : role === 'cravexp_store_vendor'
            ? '/vendor/crave-ep'
            : role === 'admin'
              ? '/admin/dashboard'
              : '/'
  const logoTargetLink = user ? currentDashboardLink : '/'

  if (!mounted) {
    return (
      <>
        <header className="sticky top-0 z-50 border-b border-[#e5e9e1] dark:border-[#27342d] bg-white/90 dark:bg-[#121815]/90 backdrop-blur-md">
          <nav className="mx-auto flex max-w-[1240px] items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2 group" suppressHydrationWarning>
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
                  className="rounded-full bg-[#18201c] dark:bg-[#d9f447] px-4 py-2 text-xs font-semibold text-white dark:text-[#18201c] transition hover:bg-[#323c36] dark:hover:bg-[#c2dc37]"
                >
                  Sign up
                </Link>
              </div>
              <button
                onClick={() => setShowMobileMenu((v) => !v)}
                className="grid size-9 place-items-center rounded-full border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] lg:hidden"
                aria-label="Toggle menu"
              >
                <Menu className="size-4 text-[#18201c] dark:text-white" />
              </button>
            </div>
          </nav>
        </header>
      </>
    )
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[#e5e9e1] dark:border-[#27342d] bg-white/90 dark:bg-[#121815]/90 backdrop-blur-md">
        <nav className="mx-auto flex max-w-[1240px] items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <Link href={logoTargetLink} className="flex items-center gap-2 group">
              <CraveLogo variant="full" size="md" />
            </Link>
          </div>

          {/* Center navigation links */}
          <div className="hidden items-center gap-6 text-xs font-semibold text-[#5a655f] dark:text-gray-300 lg:flex">
            {user ? (
              <>
                {role === 'customer' ? (
                  <>
                    <Link
                      href="/user/explore"
                      className={`flex items-center gap-1.5 transition hover:text-[#18201c] dark:hover:text-white ${
                        pathname.includes('/user/explore') || pathname.includes('/user/dashboard')
                          ? 'text-[#18201c] dark:text-white font-bold'
                          : ''
                      }`}
                    >
                      <Compass className="size-3.5 text-[#859d19]" />
                      Explore Kitchens
                    </Link>
                    <Link
                      href="/user/cravexp"
                      className={`flex items-center gap-1.5 transition hover:text-emerald-700 dark:hover:text-emerald-400 ${
                        pathname.includes('/user/cravexp')
                          ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                          : ''
                      }`}
                    >
                      <Zap className="size-3.5 text-emerald-600 fill-emerald-600" />
                      <span>
                        crave<strong className="text-emerald-600">XP</strong> Instamart
                      </span>
                    </Link>
                    <Link
                      href="/user/orders"
                      className={`flex items-center gap-1.5 transition hover:text-[#18201c] dark:hover:text-white ${
                        pathname.includes('/user/orders')
                          ? 'text-[#18201c] dark:text-white font-bold'
                          : ''
                      }`}
                    >
                      <ShoppingBag className="size-3.5 text-[#859d19]" />
                      My Orders
                    </Link>
                    <Link
                      href="/user/track"
                      className={`flex items-center gap-1.5 transition hover:text-[#18201c] dark:hover:text-white ${
                        pathname.includes('/user/track')
                          ? 'text-[#18201c] dark:text-white font-bold'
                          : ''
                      }`}
                    >
                      <Bike className="size-3.5 text-[#859d19]" />
                      Track Live Drop
                    </Link>
                  </>
                ) : (
                  <Link
                    href={currentDashboardLink}
                    className={`flex items-center gap-1.5 transition hover:text-[#18201c] dark:hover:text-white ${
                      pathname.includes('dashboard')
                        ? 'text-[#18201c] dark:text-white font-bold'
                        : ''
                    }`}
                  >
                    <LayoutDashboard className="size-3.5 text-[#859d19]" />
                    Dashboard ({roleDetails[role]?.title})
                  </Link>
                )}
              </>
            ) : (
              <></>
            )}
          </div>

          {/* Right side — auth & profile */}
          <div className="flex items-center gap-3">
            {user && (
              <Link
                href="/user/cart"
                className="relative grid size-9 place-items-center rounded-full border border-[#dfe4dc] dark:border-[#27342d] bg-[#f8f9f6] dark:bg-[#18201c] text-[#18201c] dark:text-white hover:bg-[#f1f4ed] dark:hover:bg-[#27342d] transition shrink-0"
                title="View Cart Page"
              >
                <ShoppingCart className="size-4" />
                {cartCount > 0 && (
                  <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-[#859d19] text-[9px] font-black text-white shadow-sm">
                    {cartCount}
                  </span>
                )}
              </Link>
            )}

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserDropdown((v) => !v)}
                  className="flex items-center gap-2.5 rounded-full border border-[#dbe1d7] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-1 pr-3 transition hover:bg-[#f4f7f1] dark:hover:bg-[#27342d]"
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
                  <div className="hidden text-left sm:block">
                    <p className="text-xs font-bold leading-none text-[#18201c] dark:text-white">
                      {user.name}
                    </p>
                    <p className="mt-0.5 text-[10px] font-medium capitalize text-[#75817a] dark:text-gray-400">
                      {user.role}
                    </p>
                  </div>
                  <ChevronDown className="size-3.5 text-[#88928a] dark:text-gray-400" />
                </button>

                {showUserDropdown && (
                  <div className="absolute right-0 top-11 z-50 w-56 rounded-2xl border border-[#e2e6df] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-2 shadow-2xl">
                    {/* User info header */}
                    <div className="border-b border-[#eff2ed] dark:border-[#27342d] px-3 py-2.5">
                      <p className="text-xs font-bold text-[#18201c] dark:text-white">
                        {user.name}
                      </p>
                      <p className="text-[11px] text-[#78827c] dark:text-gray-400 truncate">
                        {user.email}
                      </p>
                      <span
                        className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${roleDetails[user.role]?.bg} ${roleDetails[user.role]?.color}`}
                      >
                        {user.role} Account
                      </span>
                    </div>

                    {/* Role-specific links */}
                    {user.role === 'customer' ? (
                      <>
                        <Link
                          href="/user/explore"
                          onClick={() => setShowUserDropdown(false)}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#2d3732] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d] mt-1"
                        >
                          <Compass className="size-4 text-[#7d9518]" />
                          Explore Kitchens
                        </Link>
                        <Link
                          href="/user/cravexp"
                          onClick={() => setShowUserDropdown(false)}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                        >
                          <Zap className="size-4 text-emerald-600 fill-emerald-600" />
                          craveXP. Instamart (10 Min)
                        </Link>
                        <Link
                          href="/vendor/crave-ep"
                          onClick={() => setShowUserDropdown(false)}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-[#18201c] dark:text-white bg-[#f0f3eb] dark:bg-[#27342d] hover:bg-[#e2e7dc] dark:hover:bg-[#324239]"
                        >
                          <Store className="size-4 text-[#7d9518]" />
                          craveXP. Console
                        </Link>
                        <Link
                          href="/user/orders"
                          onClick={() => setShowUserDropdown(false)}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#2d3732] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d]"
                        >
                          <ShoppingBag className="size-4 text-[#7d9518]" />
                          My Orders
                        </Link>
                        <Link
                          href="/user/track"
                          onClick={() => setShowUserDropdown(false)}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#2d3732] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d]"
                        >
                          <Bike className="size-4 text-[#7d9518]" />
                          Track Order
                        </Link>
                        <Link
                          href="/user/profile"
                          onClick={() => setShowUserDropdown(false)}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#2d3732] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d]"
                        >
                          <LayoutDashboard className="size-4 text-[#7d9518]" />
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
                          <LayoutDashboard className="size-4 text-[#7d9518]" />
                          Go to Dashboard
                        </Link>
                        <Link
                          href="/vendor/crave-ep"
                          onClick={() => setShowUserDropdown(false)}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                        >
                          <Store className="size-4 text-emerald-600" />
                          craveXP. Console
                        </Link>
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
                      <Download className="size-4 text-[#859d19]" />
                      Install Crave App
                    </button>

                    {/* Sign out */}
                    <button
                      onClick={async () => {
                        await logout()
                        setShowUserDropdown(false)
                        router.push('/login')
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
                  className="rounded-full bg-[#18201c] dark:bg-[#d9f447] px-4 py-2 text-xs font-semibold text-white dark:text-[#18201c] transition hover:bg-[#323c36] dark:hover:bg-[#c2dc37]"
                >
                  Sign up
                </Link>
              </div>
            )}

            <button
              onClick={() => {
                if (pathname.includes('/dashboard') || pathname.includes('/user/')) {
                  window.dispatchEvent(new CustomEvent('toggle-mobile-sidebar'))
                } else {
                  setShowMobileMenu((v) => !v)
                }
              }}
              className="grid size-9 place-items-center rounded-full border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] lg:hidden"
              aria-label="Toggle menu"
            >
              {showMobileMenu ? (
                <X className="size-4 text-[#18201c] dark:text-white" />
              ) : (
                <Menu className="size-4 text-[#18201c] dark:text-white" />
              )}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile menu overlay */}
      <div
        onClick={() => setShowMobileMenu(false)}
        className={`fixed inset-0 z-[60] bg-black/35 transition-opacity duration-300 lg:hidden ${
          showMobileMenu ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden="true"
      />

      {/* Mobile slide-in drawer */}
      <aside
        aria-label="Mobile navigation"
        aria-hidden={!showMobileMenu}
        className={`fixed inset-y-0 right-0 z-[70] flex w-[min(20rem,85vw)] flex-col border-l border-[#e2e6de] dark:border-[#27342d] bg-white dark:bg-[#18201c] text-[#18201c] dark:text-white shadow-2xl transition-transform duration-300 ease-out lg:hidden ${
          showMobileMenu ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-[#e5e9e1] dark:border-[#27342d] px-5 py-4">
          <Link
            href={logoTargetLink}
            onClick={() => setShowMobileMenu(false)}
            className="flex items-center gap-2.5"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-[#d9f447] text-[#18201c]">
              <UtensilsCrossed className="size-5 fill-current" />
            </span>
            <span className="text-xl font-bold text-[#18201c] dark:text-white">
              crave<span className="text-[#869c18]">.</span>
            </span>
          </Link>
          <button
            onClick={() => setShowMobileMenu(false)}
            className="grid size-9 place-items-center rounded-full border border-[#dfe4dc] dark:border-[#27342d] text-gray-600 dark:text-gray-300"
            aria-label="Close menu"
          >
            <X className="size-4" />
          </button>
        </div>

        <nav className="flex flex-col gap-1 p-4 text-sm font-semibold">
          {user ? (
            <>
              <Link
                href={currentDashboardLink}
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center justify-between rounded-xl px-3 py-3 text-[#18201c] dark:text-white hover:bg-[#f3f6ee] dark:hover:bg-[#27342d]"
              >
                <span>Dashboard</span>
                <span className="rounded-full bg-[#f0f5db] dark:bg-[#27342d] px-2 py-0.5 text-[10px] text-[#718714] dark:text-[#d9f447] capitalize">
                  {role}
                </span>
              </Link>

              <div className="mt-2 border-t border-[#e5e9e1] dark:border-[#27342d]" />

              <Link
                href="/user/explore"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-[#2d3732] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d]"
              >
                <Compass className="size-5 text-[#859d19]" />
                Explore
              </Link>

              <Link
                href="/user/track"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-[#2d3732] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d]"
              >
                <Bike className="size-5 text-[#859d19]" />
                Track Drop
              </Link>

              <Link
                href="/user/orders"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-[#2d3732] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d]"
              >
                <ShoppingBag className="size-5 text-[#859d19]" />
                Orders
              </Link>

              <Link
                href="/user/profile"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-[#2d3732] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d]"
              >
                <User className="size-5 text-[#859d19]" />
                Profile
              </Link>

              <Link
                href="/user/dashboard"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center justify-between rounded-xl px-3 py-3 text-[#2d3732] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d]"
              >
                <span className="flex items-center gap-3">
                  <ShoppingCart className="size-5 text-[#859d19]" />
                  Cart
                </span>
                {cartCount > 0 && (
                  <span className="rounded-full bg-[#859d19] px-2 py-0.5 text-[10px] font-bold text-white">
                    {cartCount}
                  </span>
                )}
              </Link>

              {/* Language switcher in mobile drawer */}
              <div className="px-1 py-1">
                <LanguageSwitcher variant="menu" />
              </div>

              {/* Install App for logged-in user */}
              <button
                onClick={() => {
                  setShowMobileMenu(false)
                  window.dispatchEvent(new CustomEvent('trigger-pwa-install'))
                }}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-[#2d3732] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d] text-left w-full font-semibold"
              >
                <Download className="size-5 text-[#859d19]" />
                Install Crave App
              </button>

              <button
                onClick={async () => {
                  await logout()
                  setShowMobileMenu(false)
                  router.push('/login')
                }}
                className="rounded-xl px-3 py-3 text-left font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/"
                onClick={() => setShowMobileMenu(false)}
                className="rounded-xl px-3 py-3 text-[#18201c] dark:text-white hover:bg-[#f3f6ee] dark:hover:bg-[#27342d]"
              >
                Explore
              </Link>
              {/* Language switcher for guests too */}
              <div className="px-1 py-1">
                <LanguageSwitcher variant="menu" />
              </div>

              {/* Install App for guest user */}
              <button
                onClick={() => {
                  setShowMobileMenu(false)
                  window.dispatchEvent(new CustomEvent('trigger-pwa-install'))
                }}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-[#2d3732] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d] text-left w-full font-semibold"
              >
                <Download className="size-5 text-[#859d19]" />
                Install Crave App
              </button>

              <Link
                href="/login"
                onClick={() => setShowMobileMenu(false)}
                className="mt-2 rounded-full border border-[#dfe4dc] dark:border-[#27342d] px-4 py-3 text-center text-sm font-bold text-[#18201c] dark:text-white hover:bg-[#f3f6ee] dark:hover:bg-[#27342d]"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                onClick={() => setShowMobileMenu(false)}
                className="rounded-full bg-[#18201c] dark:bg-[#d9f447] px-4 py-3 text-center text-sm font-bold text-white dark:text-[#18201c] hover:bg-[#323c36] dark:hover:bg-[#c2dc37]"
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
