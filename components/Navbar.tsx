'use client'

import { useAuth, UserRole } from '@/lib/auth-context'
import {
  Bike,
  ChevronDown,
  Compass,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  ShoppingBag,
  Store,
  UtensilsCrossed,
  X,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import React, { useState } from 'react'

export const roleDetails: Record<
  UserRole,
  { title: string; badge: string; color: string; bg: string; icon: React.ElementType }
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
}

export default function Navbar() {
  const { user, role, logout } = useAuth()
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const currentDashboardLink = role === 'customer' ? '/user/dashboard' : `/${role}/dashboard`
  const logoTargetLink = user ? currentDashboardLink : '/'

  return (
    <header className="sticky top-0 z-50 border-b border-[#e5e9e1] bg-white/90 backdrop-blur-md">
      <nav className="mx-auto flex max-w-[1240px] items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-6">
          <Link href={logoTargetLink} className="flex items-center gap-2.5 group">
            <span className="grid size-9 place-items-center rounded-xl bg-[#d9f447] text-[#18201c] shadow-[0_4px_16px_rgba(217,244,71,0.4)] transition group-hover:scale-105">
              <UtensilsCrossed className="size-5 fill-current" />
            </span>
            <span className="text-xl font-bold tracking-tight text-[#18201c]">
              crave<span className="text-[#869c18]">.</span>
            </span>
          </Link>
        </div>

        {/* Center navigation links */}
        <div className="hidden items-center gap-6 text-xs font-semibold text-[#5a655f] lg:flex">
          {user ? (
            /* Authenticated Nav Items */
            <>
              {role === 'customer' ? (
                <>
                  <Link
                    href="/user/explore"
                    className={`flex items-center gap-1.5 transition hover:text-[#18201c] ${
                      pathname.includes('/user/explore') || pathname.includes('/user/dashboard') ? 'text-[#18201c] font-bold' : ''
                    }`}
                  >
                    <Compass className="size-3.5 text-[#859d19]" />
                    Explore Kitchens
                  </Link>
                  <Link
                    href="/user/cravexp"
                    className={`flex items-center gap-1.5 transition hover:text-emerald-700 ${
                      pathname.includes('/user/cravexp') ? 'text-emerald-700 font-bold' : ''
                    }`}
                  >
                    <Zap className="size-3.5 text-emerald-600 fill-emerald-600" />
                    <span>crave<strong className="text-emerald-600">XP</strong> Instamart</span>
                  </Link>
                  <Link
                    href="/user/orders"
                    className={`flex items-center gap-1.5 transition hover:text-[#18201c] ${
                      pathname.includes('/user/orders') ? 'text-[#18201c] font-bold' : ''
                    }`}
                  >
                    <ShoppingBag className="size-3.5 text-[#859d19]" />
                    My Orders
                  </Link>
                  <Link
                    href="/user/track"
                    className={`flex items-center gap-1.5 transition hover:text-[#18201c] ${
                      pathname.includes('/user/track') ? 'text-[#18201c] font-bold' : ''
                    }`}
                  >
                    <Bike className="size-3.5 text-[#859d19]" />
                    Track Live Drop
                  </Link>
                </>
              ) : (
                <Link
                  href={currentDashboardLink}
                  className={`flex items-center gap-1.5 transition hover:text-[#18201c] ${
                    pathname.includes('dashboard') ? 'text-[#18201c] font-bold' : ''
                  }`}
                >
                  <LayoutDashboard className="size-3.5 text-[#859d19]" />
                  Dashboard ({roleDetails[role]?.title})
                </Link>
              )}
            </>
          ) : (
            /* Unauthenticated Nav Items */
            <>
              <Link
                href="/"
                className={`transition hover:text-[#18201c] ${pathname === '/' ? 'text-[#18201c] font-bold' : ''}`}
              >
                Explore Cravings
              </Link>
              <a
                href="#why-crave"
                className="transition hover:text-[#18201c]"
              >
                Why crave.
              </a>
            </>
          )}
        </div>

        {/* Right side auth & profile */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown((v) => !v)}
                className="flex items-center gap-2.5 rounded-full border border-[#dbe1d7] bg-white p-1 pr-3 transition hover:bg-[#f4f7f1]"
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
                  <p className="text-xs font-bold leading-none text-[#18201c]">{user.name}</p>
                  <p className="mt-0.5 text-[10px] font-medium capitalize text-[#75817a]">
                    {user.role}
                  </p>
                </div>
                <ChevronDown className="size-3.5 text-[#88928a]" />
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 top-11 z-50 w-56 rounded-2xl border border-[#e2e6df] bg-white p-2 shadow-2xl">
                  <div className="border-b border-[#eff2ed] px-3 py-2.5">
                    <p className="text-xs font-bold text-[#18201c]">{user.name}</p>
                    <p className="text-[11px] text-[#78827c] truncate">{user.email}</p>
                    <span
                      className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${roleDetails[user.role]?.bg} ${roleDetails[user.role]?.color}`}
                    >
                      {user.role} Account
                    </span>
                  </div>

                  {user.role === 'customer' ? (
                    <>
                      <Link
                        href="/user/explore"
                        onClick={() => setShowUserDropdown(false)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#2d3732] hover:bg-[#f3f6ee] mt-1"
                      >
                        <Compass className="size-4 text-[#7d9518]" />
                        Explore Kitchens
                      </Link>
                      <Link
                        href="/user/cravexp"
                        onClick={() => setShowUserDropdown(false)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100"
                      >
                        <Zap className="size-4 text-emerald-600 fill-emerald-600" />
                        craveXP Instamart (10 Min)
                      </Link>
                      <Link
                        href="/vendor/crave-ep"
                        onClick={() => setShowUserDropdown(false)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-[#18201c] bg-[#f0f3eb] hover:bg-[#e2e7dc]"
                      >
                        <Store className="size-4 text-[#7d9518]" />
                        craveEP Store Console
                      </Link>
                      <Link
                        href="/user/orders"
                        onClick={() => setShowUserDropdown(false)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#2d3732] hover:bg-[#f3f6ee]"
                      >
                        <ShoppingBag className="size-4 text-[#7d9518]" />
                        My Orders
                      </Link>
                      <Link
                        href="/user/track"
                        onClick={() => setShowUserDropdown(false)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#2d3732] hover:bg-[#f3f6ee]"
                      >
                        <Bike className="size-4 text-[#7d9518]" />
                        Track Order
                      </Link>
                      <Link
                        href="/user/profile"
                        onClick={() => setShowUserDropdown(false)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#2d3732] hover:bg-[#f3f6ee]"
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
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#2d3732] hover:bg-[#f3f6ee] mt-1"
                      >
                        <LayoutDashboard className="size-4 text-[#7d9518]" />
                        Go to Dashboard
                      </Link>
                      <Link
                        href="/vendor/crave-ep"
                        onClick={() => setShowUserDropdown(false)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100"
                      >
                        <Store className="size-4 text-emerald-600" />
                        craveEP Store Console
                      </Link>
                    </>
                  )}

                  <button
                    onClick={async () => {
                      await logout()
                      setShowUserDropdown(false)
                      router.push('/login')
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 border-t border-[#eff2ed] mt-1 pt-2"
                  >
                    <LogOut className="size-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-full border border-[#dfe4dc] bg-white px-4 py-2 text-xs font-semibold text-[#18201c] transition hover:bg-[#f3f6ee]"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-[#18201c] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#323c36]"
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
            className="grid size-9 place-items-center rounded-full border border-[#dfe4dc] bg-white lg:hidden"
            aria-label="Toggle menu"
          >
            {showMobileMenu ? (
              <X className="size-4 text-[#18201c]" />
            ) : (
              <Menu className="size-4 text-[#18201c]" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {showMobileMenu && (
        <div className="border-t border-[#e2e6de] bg-white px-5 py-4 lg:hidden">
          <div className="flex flex-col gap-3 text-xs font-semibold">
            {user ? (
              <>
                <Link
                  href={currentDashboardLink}
                  onClick={() => setShowMobileMenu(false)}
                  className="py-1 text-[#18201c] flex items-center justify-between"
                >
                  <span>Dashboard</span>
                  <span className="rounded-full bg-[#f0f5db] px-2 py-0.5 text-[10px] text-[#718714] capitalize">
                    {role}
                  </span>
                </Link>
                <button
                  onClick={async () => {
                    await logout()
                    setShowMobileMenu(false)
                    router.push('/login')
                  }}
                  className="py-1 text-rose-600 font-semibold text-left"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/"
                  onClick={() => setShowMobileMenu(false)}
                  className="py-1 text-[#18201c]"
                >
                  Explore
                </Link>
                <Link
                  href="/login"
                  onClick={() => setShowMobileMenu(false)}
                  className="py-1 text-[#18201c]"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setShowMobileMenu(false)}
                  className="py-1 text-[#18201c]"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
