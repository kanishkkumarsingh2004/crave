'use client'

import { useAuth } from '@/lib/auth-context'
import { useLanguage } from '@/lib/language-context'
import {
  ChartColumn,
  LogOut,
  Menu,
  Percent,
  Settings,
  ShoppingBag,
  Store,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

export default function VendorSidebar() {
  const { user, logout } = useAuth()
  const { t } = useLanguage()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = [
    {
      href: '/vendor/dashboard',
      label: t?.vendor?.liveOrders || 'Kitchen Orders',
      icon: ShoppingBag,
    },
    {
      href: '/vendor/menu',
      label: t?.vendor?.menuManagement || 'Menu Management',
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
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-[#202923] bg-[#121815] text-white lg:flex">
        <div className="border-b border-white/10 p-6">
          <Link href="/vendor/dashboard" className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-[#d9f447] text-[#121815]">
              <UtensilsCrossed className="size-5" />
            </span>
            <span className="text-xl font-black tracking-tight">
              crave<span className="text-[#d9f447]">.</span>
            </span>
          </Link>
          <div className="mt-5 rounded-xl bg-white/5 px-3 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#d9f447]">Vendor</p>
            <p className="mt-1 truncate text-sm font-bold">
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
                    ? 'bg-[#d9f447] text-[#121815]'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="size-4 shrink-0" />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <button
            onClick={() => logout()}
            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-rose-300 transition hover:bg-rose-500/10"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Top Header Navigation Bar */}
      <div className="sticky top-0 z-30 border-b border-[#202d25] bg-[#0f1512]/90 backdrop-blur-xl px-4 py-3.5 sm:px-8 shadow-lg">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Brand Logo & Kitchen Name */}
          <div className="flex items-center justify-between sm:justify-start gap-3 min-w-0">
            <Link
              href="/"
              className="font-black text-2xl sm:text-3xl tracking-tighter text-white shrink-0 lg:hidden"
            >
              crave<span className="text-[#d9f447]">.</span>
            </Link>
            <span className="rounded-full bg-[#d9f447]/10 border border-[#d9f447]/30 px-2.5 py-0.5 text-[10px] font-black uppercase text-[#d9f447]">
              VENDOR
            </span>

            <div className="hidden sm:block h-6 w-px bg-[#202d25] mx-1 shrink-0" />

            <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-gray-200 truncate">
              <Store className="size-4 text-[#d9f447] shrink-0" />
              <span className="truncate max-w-[200px]">
                {user?.restaurantName || 'The Green Table'}
              </span>
            </div>

            <button
              onClick={() => setMobileMenuOpen(true)}
              className="sm:hidden grid size-9 place-items-center rounded-xl bg-[#18201c] text-white hover:bg-[#222e27] transition border border-[#27342d]"
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
                      ? 'bg-[#d9f447] text-[#0d1310] font-black shadow-md shadow-[#d9f447]/10'
                      : 'bg-[#161d19] text-gray-300 border border-[#27342d] hover:bg-[#1f2923] hover:text-white'
                  }`}
                >
                  <Icon className="size-3.5" />
                  <span>{label}</span>
                </Link>
              )
            })}
            <button
              onClick={() => logout()}
              className="rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3.5 py-2 transition shrink-0 hover:bg-rose-500/20 flex items-center gap-1"
              title="Sign Out"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Slide-Out Menu */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-64 transform border-l border-[#202923] bg-[#121815] text-white shadow-2xl transition-transform duration-300 ease-in-out sm:hidden ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-[#202923] p-4">
            <h2 className="text-lg font-extrabold text-white">Menu</h2>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="grid size-7 place-items-center rounded-xl bg-[#1d2621] text-gray-400 hover:text-white transition"
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
                    isActive ? 'bg-[#d9f447] text-[#0d1310] font-black' : 'text-gray-300 hover:bg-[#1d2621] hover:text-white'
                  }`}
                >
                  <Icon className="size-4 shrink-0" />
                  <span>{label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="border-t border-[#202923] p-4">
            <button
              onClick={() => {
                setMobileMenuOpen(false)
                logout()
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 sm:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  )
}
