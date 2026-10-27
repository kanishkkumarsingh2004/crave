'use client'

import ThemeToggle from '@/components/ThemeToggle'
import CraveLogo from '@/components/CraveLogo'
import { useAuth } from '@/lib/auth-context'
import { useLanguage } from '@/lib/language-context'
import {
  ChartColumn,
  LogOut,
  Menu,
  Settings,
  ShoppingBag,
  Store,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function VendorSidebar() {
  const { user, logout } = useAuth()
  const { t } = useLanguage()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  const navItems = [
    {
      href: '/vendor/dashboard',
      label: t?.vendor?.liveOrders || 'Kitchen Orders',
      icon: ShoppingBag,
    },
    {
      href: '/vendor/menu',
      label: t?.vendor?.menuManagement || 'Menu Catalog',
      icon: UtensilsCrossed,
    },
    {
      href: '/vendor/sales',
      label: t?.vendor?.salesReports || 'Sales & Earnings',
      icon: ChartColumn,
    },
    {
      href: '/vendor/settings',
      label: t?.vendor?.vendorSettings || 'Bank & Settings',
      icon: Settings,
    },
  ]

  return (
    <>
      {/* Desktop Left Fixed Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-stone-200/80 dark:border-white/[0.08] bg-white dark:bg-[#121815] text-[#121815] dark:text-white lg:flex transition-colors duration-200">
        <div className="border-b border-stone-200/80 dark:border-white/[0.08] p-6">
          <Link href="/vendor/dashboard" className="flex items-center gap-2.5" aria-label="crave vendor dashboard">
            <CraveLogo variant="full" size="md" />
          </Link>
          <div className="mt-5 rounded-2xl bg-stone-100/80 dark:bg-white/[0.04] border border-stone-200/60 dark:border-white/10 p-3.5">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Vendor Live</span>
            </div>
            <p className="mt-1 truncate text-sm font-semibold text-[#1D1D1F] dark:text-white">
              {user?.restaurantName || 'The Green Table'}
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-4" aria-label="Vendor navigation">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs transition ${
                  isActive
                    ? 'bg-[#1D1D1F] text-white dark:bg-white dark:text-[#1D1D1F] font-semibold shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100/80 dark:hover:bg-white/[0.06] hover:text-[#1D1D1F] dark:hover:text-white font-medium'
                }`}
              >
                <Icon className="size-4 shrink-0 stroke-[2]" />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-stone-200/80 dark:border-white/[0.08] p-4 space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">Theme</span>
            <ThemeToggle />
          </div>
          <button
            onClick={() => logout()}
            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Top Header Navigation Bar */}
      <div className="sticky top-0 z-30 border-b border-stone-200/80 dark:border-white/[0.08] bg-white/85 dark:bg-[#0c100e]/85 backdrop-blur-xl px-4 py-3 sm:px-8 shadow-xs w-full max-w-full overflow-hidden transition-colors duration-200">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-3 w-full min-w-0">
          {/* Brand Logo & Kitchen Name */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="shrink-0 lg:hidden flex items-center"
              aria-label="crave home"
            >
              <CraveLogo variant="full" size="md" />
            </Link>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              VENDOR
            </span>

            <div className="hidden sm:block h-4 w-px bg-stone-200 dark:bg-white/10 mx-1 shrink-0" />

            <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-stone-700 dark:text-stone-300 truncate">
              <Store className="size-3.5 text-[#86a018] shrink-0" />
              <span className="truncate max-w-[200px]">
                {user?.restaurantName || 'The Green Table'}
              </span>
            </div>

            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden grid size-9 place-items-center rounded-full bg-stone-100 dark:bg-white/10 text-stone-700 dark:text-white hover:bg-stone-200 dark:hover:bg-white/15 transition border border-stone-200 dark:border-white/10"
              aria-label="Open menu"
            >
              <Menu className="size-4" />
            </button>
          </div>

          {/* Desktop Navigation Links - Apple Segmented Control */}
          <div className="hidden lg:flex items-center gap-2">
            <nav className="flex items-center gap-1 text-xs justify-center bg-stone-100/80 dark:bg-white/[0.06] p-1 rounded-full border border-stone-200/60 dark:border-white/10 backdrop-blur-xl">
              {navItems.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-1.5 rounded-full px-4 py-2 transition shrink-0 ${
                      isActive
                        ? 'bg-white dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-white font-semibold shadow-xs'
                        : 'text-stone-600 dark:text-stone-400 hover:text-[#1D1D1F] dark:hover:text-white font-medium'
                    }`}
                  >
                    <Icon className="size-3.5 stroke-[2]" />
                    <span>{label}</span>
                  </Link>
                )
              })}
            </nav>
            <ThemeToggle />
            <button
              onClick={() => logout()}
              className="size-9 rounded-full bg-stone-100 hover:bg-rose-50 dark:bg-white/5 dark:hover:bg-rose-500/10 text-stone-500 hover:text-rose-600 dark:text-stone-400 dark:hover:text-rose-400 border border-stone-200/60 dark:border-white/10 grid place-items-center transition cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Slide-Out Menu */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-64 transform border-l border-stone-200 dark:border-[#202923] bg-white dark:bg-[#121815] text-[#121815] dark:text-white shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-stone-200 dark:border-[#202923] p-4">
            <h2 className="text-lg font-extrabold text-[#121815] dark:text-white">Menu</h2>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="grid size-7 place-items-center rounded-xl bg-stone-100 dark:bg-[#1d2621] text-stone-600 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white transition"
              aria-label="Close menu"
            >
              <X className="size-4" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-1" aria-label="Mobile menu">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-xs transition ${
                    isActive
                      ? 'bg-[#1D1D1F] text-white dark:bg-white dark:text-[#1D1D1F] font-semibold shadow-xs'
                      : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/10 hover:text-[#1D1D1F] dark:hover:text-white font-medium'
                  }`}
                >
                  <Icon className="size-4 shrink-0" />
                  <span>{label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="border-t border-stone-200 dark:border-[#202923] p-4 space-y-3">
            <ThemeToggle variant="pill" className="w-full justify-center" />
            <button
              onClick={() => {
                setMobileMenuOpen(false)
                logout()
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Fixed Bottom Navigation Bar (< lg) */}
      <nav
        className="fixed bottom-0 inset-x-0 z-40 flex items-center justify-around border-t border-stone-200 dark:border-[#202923] bg-white/95 dark:bg-[#0f1512]/95 backdrop-blur-xl px-2 py-1.5 pb-safe-nav lg:hidden shadow-lg dark:shadow-[0_-8px_30px_rgba(0,0,0,0.6)]"
        aria-label="Vendor bottom navigation"
      >
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-3 py-1.5 transition-all text-[10px] min-w-[64px] ${
                isActive
                  ? 'text-[#1D1D1F] dark:text-white font-semibold'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white font-medium'
              }`}
            >
              <div
                className={`grid size-7 place-items-center rounded-xl transition-all ${
                  isActive
                    ? 'bg-[#1D1D1F] text-white dark:bg-white dark:text-[#1D1D1F] shadow-xs'
                    : 'bg-transparent text-stone-500 dark:text-stone-400'
                }`}
              >
                <Icon className="size-4 shrink-0" />
              </div>
              <span className="truncate max-w-[75px] text-center leading-tight">{label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
