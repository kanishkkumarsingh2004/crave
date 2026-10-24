'use client'

import ThemeToggle from '@/components/ThemeToggle'
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
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-stone-200 dark:border-[#202923] bg-white dark:bg-[#121815] text-[#121815] dark:text-white lg:flex transition-colors duration-200">
        <div className="border-b border-stone-200 dark:border-white/10 p-6">
          <Link href="/vendor/dashboard" className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-[#d9f447] text-[#121815] shadow-xs">
              <UtensilsCrossed className="size-5" />
            </span>
            <span className="text-xl font-black tracking-tight text-[#121815] dark:text-white">
              crave<span className="text-[#86a018] dark:text-[#d9f447]">.</span>
            </span>
          </Link>
          <div className="mt-5 rounded-xl bg-stone-100 dark:bg-white/5 border border-stone-200/80 dark:border-transparent px-3 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#86a018] dark:text-[#d9f447]">
              Vendor
            </p>
            <p className="mt-1 truncate text-sm font-bold text-stone-900 dark:text-white">
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
                className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
                  isActive
                    ? 'bg-[#18201c] text-white dark:bg-[#d9f447] dark:text-[#121815] font-bold shadow-xs'
                    : 'text-stone-600 dark:text-white/70 hover:bg-stone-100 dark:hover:bg-white/10 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                <Icon className="size-4 shrink-0" />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-stone-200 dark:border-white/10 p-4 space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-stone-500 dark:text-gray-400">Theme</span>
            <ThemeToggle />
          </div>
          <button
            onClick={() => logout()}
            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-rose-600 dark:text-rose-300 transition hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Top Header Navigation Bar */}
      <div className="sticky top-0 z-30 border-b border-stone-200 dark:border-[#202d25] bg-white/90 dark:bg-[#0f1512]/90 backdrop-blur-xl px-4 py-3.5 sm:px-8 shadow-xs dark:shadow-lg w-full max-w-full overflow-hidden transition-colors duration-200">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between w-full min-w-0">
          {/* Brand Logo & Kitchen Name */}
          <div className="flex items-center justify-between sm:justify-start gap-3 min-w-0">
            <Link
              href="/"
              className="font-black text-2xl sm:text-3xl tracking-tighter text-[#121815] dark:text-white shrink-0 lg:hidden"
            >
              crave<span className="text-[#86a018] dark:text-[#d9f447]">.</span>
            </Link>
            <span className="rounded-md bg-stone-100 dark:bg-white/10 border border-stone-200 dark:border-transparent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-700 dark:text-white/90">
              VENDOR
            </span>

            <div className="hidden sm:block h-6 w-px bg-stone-200 dark:bg-[#202d25] mx-1 shrink-0" />

            <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-stone-800 dark:text-gray-200 truncate">
              <Store className="size-4 text-[#86a018] dark:text-[#d9f447] shrink-0" />
              <span className="truncate max-w-[200px]">
                {user?.restaurantName || 'The Green Table'}
              </span>
            </div>

            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden grid size-9 place-items-center rounded-xl bg-stone-100 dark:bg-[#18201c] text-stone-700 dark:text-white hover:bg-stone-200 dark:hover:bg-[#222e27] transition border border-stone-200 dark:border-[#27342d]"
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </button>
          </div>

          {/* Desktop Navigation Links */}
          <div className="no-scrollbar hidden items-center gap-2 overflow-x-auto text-xs font-bold lg:hidden xl:flex">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  className={`rounded-2xl px-4 py-2 transition shrink-0 flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#d9f447] text-[#0d1310] font-black shadow-xs ring-1 ring-[#86a018]/30 dark:ring-transparent'
                      : 'bg-stone-100 dark:bg-[#161d19] text-stone-700 dark:text-gray-300 border border-stone-200 dark:border-[#27342d] hover:bg-stone-200/80 dark:hover:bg-[#1f2923] hover:text-stone-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="size-3.5" />
                  <span>{label}</span>
                </Link>
              )
            })}
            <ThemeToggle />
            <button
              onClick={() => logout()}
              className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 px-3.5 py-2 transition shrink-0 hover:bg-rose-100 dark:hover:bg-rose-500/20 flex items-center gap-1 cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="size-3.5" />
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
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-xs font-semibold transition ${
                    isActive
                      ? 'bg-[#d9f447] text-[#0d1310] font-black'
                      : 'text-stone-700 dark:text-gray-300 hover:bg-stone-100 dark:hover:bg-[#1d2621] hover:text-stone-900 dark:hover:text-white'
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
              className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-3 py-1.5 transition-all text-[10px] font-bold min-w-[64px] ${
                isActive
                  ? 'text-[#86a018] dark:text-[#d9f447] font-black scale-105'
                  : 'text-stone-500 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              <div
                className={`grid size-7 place-items-center rounded-xl transition-all ${
                  isActive
                    ? 'bg-[#d9f447] text-[#0d1310] shadow-md shadow-[#d9f447]/20 ring-2 ring-[#d9f447]/30'
                    : 'bg-transparent text-stone-500 dark:text-gray-400'
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
