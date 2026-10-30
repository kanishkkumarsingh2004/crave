'use client'

import CraveLogo from '@/components/CraveLogo'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import ThemeToggle from '@/components/ThemeToggle'
import { DriverDashboardSkeleton } from '@/components/ui/SkeletonLoaders'
import { useAuth } from '@/lib/auth-context'
import { DriverProvider, useDriver } from '@/lib/driver-context'
import {
  Bike,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  History,
  LogOut,
  MapPin,
  Menu,
  Navigation,
  PackageCheck,
  Power,
  Radio,
  Settings,
  Target,
  User,
  Wallet,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'

function DriverLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, role, logout, isLoading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const {
    isOnline,
    setIsOnline,
    activeTask,
    broadcastOffer,
    setBroadcastOffer,
    offerTimer,
    completedTrips,
    completedSummaryModal,
    setCompletedSummaryModal,
    triggerSimulatedOffer,
    acceptBroadcastOffer,
    gpsStatus,
    gpsPermissionState,
    requestMobileGps,
    isBackgroundWorkerActive,
    workerLastSyncTime,
  } = useDriver()

  useEffect(() => {
    if (isLoading) return

    if (!user) {
      router.replace('/login?logout=1')
    } else if (role !== 'driver' && role !== 'rider') {
      const redirectPath =
        role === 'user' || role === 'customer'
          ? '/user/dashboard'
          : role === 'restaurant_vendor' || role === 'vendor'
            ? '/vendor/dashboard'
            : role === 'cravexp_store_vendor'
              ? '/vendor/crave-ep'
              : role === 'admin'
                ? '/admin/dashboard'
                : '/login'
      router.replace(redirectPath)
    }
  }, [user, role, isLoading, router])

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [sidebarOpen])

  if (isLoading || !user) {
    return <DriverDashboardSkeleton />
  }

  if (role !== 'driver' && role !== 'rider') {
    return null
  }

  const totalEarningsToday = completedTrips.reduce((acc, t) => acc + t.total, 0)
  const driverInitials = user?.name
    ? user.name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'DP'

  const navItems = [
    {
      href: '/driver/dashboard',
      label: 'Active Delivery Task',
      icon: Bike,
      badge: activeTask ? 'Active' : isOnline ? 'Searching' : 'Offline',
    },
    {
      href: '/driver/orders',
      label: 'Accepted Orders',
      icon: PackageCheck,
      badge: activeTask ? '1' : '0',
    },
    {
      href: '/driver/history',
      label: 'Trip History Log',
      icon: History,
      badge: completedTrips.length.toString(),
    },
    {
      href: '/driver/wallet',
      label: 'Wallet & Earnings',
      icon: Wallet,
      badge: `₹${totalEarningsToday}`,
    },
    {
      href: '/driver/incentives',
      label: 'Quests & Incentives',
      icon: Target,
      badge: 'Surge',
    },
    { href: '/driver/profile', label: 'Vehicle & Profile', icon: User, badge: 'Profile' },
    { href: '/driver/settings', label: 'UPI Payout Settings', icon: Settings, badge: 'UPI' },
  ]

  const currentItem = navItems.find(
    (item) =>
      pathname === item.href || (item.href === '/driver/dashboard' && pathname === '/driver')
  )
  const pageTitle = currentItem ? currentItem.label : 'Driver Cockpit'

  return (
    <div className="flex min-h-screen bg-[#f8f9f7] dark:bg-[#121815] text-[#18201c] dark:text-white transition-colors duration-200">
      {/* Mobile Overlay */}
      <div
        onClick={() => setSidebarOpen(false)}
        className={`fixed inset-0 z-40 bg-black/60 dark:bg-[#121815]/80 backdrop-blur-sm lg:hidden transition-opacity duration-300 ease-in-out ${
          sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* DESKTOP FULL-HEIGHT FIXED SIDEBAR */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex flex-col justify-between bg-white dark:bg-[#121815] text-[#18201c] dark:text-white transition-all duration-300 ease-in-out will-change-[width,transform] lg:fixed lg:inset-y-0 lg:left-0 lg:h-screen lg:right-auto lg:border-r lg:border-[#e2e8e3] dark:lg:border-[#202923] lg:translate-x-0 lg:z-40 overflow-hidden shadow-xs ${
          sidebarOpen
            ? 'translate-x-0 shadow-2xl w-64 border-l border-[#e2e8e3] dark:border-[#202923]'
            : 'translate-x-full lg:shadow-none'
        } ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        <div className="flex flex-col justify-between h-full min-h-0 overflow-hidden">
          <div
            className={`flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto no-scrollbar transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'p-2.5' : 'p-4'}`}
          >
            {/* Sidebar Top Header */}
            <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06] pb-4 pt-1">
              <Link
                href="/driver/dashboard"
                className="flex items-center gap-2.5 group min-w-0"
                title={sidebarCollapsed ? 'crave. Driver' : undefined}
              >
                <span className="grid size-9 place-items-center rounded-xl bg-[#1D1D1F] dark:bg-white text-white dark:text-[#1D1D1F] shadow-sm shrink-0 transition-transform duration-300 group-hover:scale-105">
                  <Bike className="size-5" />
                </span>
                <div
                  className={`flex items-center gap-1.5 transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
                    sidebarCollapsed
                      ? 'opacity-0 max-w-0 hidden lg:hidden'
                      : 'opacity-100 max-w-[160px]'
                  }`}
                >
                  <CraveLogo variant="full" size="sm" />
                  <span className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400">
                    Driver
                  </span>
                </div>
              </Link>
              <button
                onClick={() => setSidebarOpen(false)}
                className="grid size-7 place-items-center rounded-lg bg-black/5 dark:bg-white/10 text-stone-700 dark:text-white lg:hidden hover:bg-black/10 dark:hover:bg-white/20 transition"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Duty Online/Offline Switch */}
            <button
              onClick={() => setIsOnline((prev) => !prev)}
              title={sidebarCollapsed ? (isOnline ? 'Duty Online' : 'Duty Offline') : undefined}
              className={`flex items-center ${
                sidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2.5'
              } rounded-xl text-xs font-bold transition shadow-xs ${
                isOnline
                  ? 'bg-emerald-600 text-white'
                  : 'bg-stone-200 dark:bg-white/10 text-stone-700 dark:text-stone-300'
              }`}
            >
              <span className="flex items-center gap-2">
                <Power className="size-4 shrink-0" />
                <span
                  className={`transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
                    sidebarCollapsed ? 'opacity-0 max-w-0 hidden' : 'opacity-100 max-w-[120px]'
                  }`}
                >
                  Duty Status
                </span>
              </span>
              <span
                className={`uppercase text-[10px] tracking-wider font-extrabold transition-all duration-300 ease-in-out ${
                  sidebarCollapsed ? 'hidden' : 'block'
                }`}
              >
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
            </button>

            {/* Nav Links with Real Next.js Routing */}
            <nav className="flex flex-col gap-1">
              <p
                className={`px-3 text-[10px] font-bold uppercase tracking-wider text-[#607367] dark:text-white/40 mb-1 transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
                  sidebarCollapsed ? 'opacity-0 max-h-0 mb-0 hidden' : 'opacity-100 max-h-6'
                }`}
              >
                Driver Controls
              </p>
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive =
                  pathname === item.href ||
                  (item.href === '/driver/dashboard' && pathname === '/driver')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={sidebarCollapsed ? item.label : undefined}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center ${
                      sidebarCollapsed
                        ? 'justify-center px-0 py-2.5'
                        : 'justify-between px-3.5 py-2.5'
                    } rounded-xl text-xs font-semibold transition-all duration-300 ease-in-out ${
                      isActive
                        ? 'bg-[#1D1D1F] text-white dark:bg-white dark:text-[#1D1D1F] font-bold shadow-xs'
                        : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-white/10 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={`size-4 shrink-0 transition-transform duration-300 ${isActive ? 'text-white dark:text-[#1D1D1F] scale-105' : 'text-stone-500 dark:text-stone-400'}`}
                      />
                      <span
                        className={`truncate transition-all duration-300 ease-in-out whitespace-nowrap ${
                          sidebarCollapsed
                            ? 'opacity-0 max-w-0 hidden'
                            : 'opacity-100 max-w-[150px]'
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>
                    {item.badge && !sidebarCollapsed && (
                      <span
                        className={`text-[10px] font-bold shrink-0 ${
                          isActive
                            ? 'text-white dark:text-[#1D1D1F]'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Sidebar Footer & Single Minimize Toggle Arrow Button */}
          <div className="border-t border-[#e2e8e3] dark:border-white/10 p-3.5 flex flex-col gap-2 shrink-0 bg-[#f4f7f4] dark:bg-[#121815]">
            <div
              className={`flex items-center ${sidebarCollapsed ? 'justify-center p-2' : 'justify-between p-2.5'} rounded-xl bg-white dark:bg-white/5 border border-[#e2e8e3] dark:border-transparent transition-all duration-300 ease-in-out`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="grid size-8 place-items-center rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800 text-xs shrink-0"
                  title={user?.name || 'Driver Partner'}
                >
                  {driverInitials}
                </span>
                <div
                  className={`transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap min-w-0 flex-1 ${
                    sidebarCollapsed ? 'opacity-0 max-w-0 hidden' : 'opacity-100 max-w-[130px]'
                  }`}
                >
                  <p className="text-xs font-bold text-[#18201c] dark:text-white truncate">
                    {user?.name || 'Driver Partner'}
                  </p>
                  <p className="text-[10px] text-[#607367] dark:text-white/50 truncate">
                    {user?.vehicleNo || 'EV Fleet Vehicle'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => logout()}
                title="Sign Out"
                className={`grid size-7 place-items-center rounded-lg bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300 hover:bg-rose-500 hover:text-white transition-all duration-300 shrink-0 ${
                  sidebarCollapsed ? 'hidden' : 'block'
                }`}
              >
                <LogOut className="size-3.5" />
              </button>
            </div>

            {/* Minimize Toggle Arrow Button */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? 'Expand Sidebar' : 'Minimize Sidebar'}
              className={`hidden lg:flex items-center ${
                sidebarCollapsed ? 'justify-center py-2.5' : 'justify-between px-3.5 py-2.5'
              } rounded-xl border border-[#e2e8e3] dark:border-white/10 bg-white dark:bg-white/5 text-xs font-semibold text-[#44554b] dark:text-white/70 hover:bg-[#eef2ee] dark:hover:bg-white/10 hover:text-[#121815] dark:hover:text-white transition-all duration-300 ease-in-out shrink-0`}
            >
              <span
                className={`transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
                  sidebarCollapsed ? 'opacity-0 max-w-0 hidden' : 'opacity-100 max-w-[130px]'
                }`}
              >
                Minimize Sidebar
              </span>
              <span className="transition-transform duration-300 ease-in-out">
                {sidebarCollapsed ? (
                  <ChevronRight className="size-4 text-stone-500 dark:text-stone-400" />
                ) : (
                  <ChevronLeft className="size-4 text-stone-500 dark:text-stone-400" />
                )}
              </span>
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div
        className={`flex-1 flex flex-col min-w-0 bg-[#fafbfa] dark:bg-[#0c100e] transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}
      >
        {/* Top Header Bar for Driver */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] bg-white/90 dark:bg-[#161617]/95 px-4 py-3.5 sm:px-6 lg:px-8 backdrop-blur-md text-[#1D1D1F] dark:text-white">
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[#1D1D1F] dark:text-white capitalize flex items-center gap-2">
              Driver Cockpit — {pageTitle}
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Vehicle:{' '}
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {user?.vehicleType || 'Commercial EV Scooter'}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Background Worker Sync Badge */}
            {isBackgroundWorkerActive && (
              <span
                className="hidden sm:inline text-xs font-bold text-emerald-600 dark:text-emerald-400"
                title={`Background Web Worker active in recent apps / background tab (Last sync: ${workerLastSyncTime})`}
              >
                Background GPS: Active (3s)
              </span>
            )}

            {/* Test Simulation Radar Trigger */}
            <button
              onClick={triggerSimulatedOffer}
              className="hidden sm:inline-flex text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
              title="Test Delivery Radar"
            >
              Scan Nearby Orders
            </button>

            <ThemeToggle />

            <LanguageSwitcher variant="pill" />

            {/* Mobile Hamburger Menu Button */}
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open mobile navigation drawer"
              className="grid size-9 place-items-center rounded-xl border border-[#e2e8e3] dark:border-[#2d3b32] bg-white dark:bg-[#1c2620] text-[#18201c] dark:text-white shadow-xs lg:hidden hover:bg-[#f0f4f1] dark:hover:bg-[#25332a] active:scale-95 transition"
            >
              <Menu className="size-5" />
            </button>
          </div>
        </header>

        {/* Dashboard Body Content */}
        <main className="p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 flex-1 flex flex-col justify-between bg-[#f8f9f7] dark:bg-[#121815] text-[#18201c] dark:text-white transition-colors duration-200">
          <div>
            {/* GPS Location Permission Access Banner */}
            {(gpsStatus === 'denied' ||
              gpsPermissionState === 'denied' ||
              gpsStatus === 'error' ||
              gpsPermissionState === 'prompt') && (
              <div className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 shadow-sm animate-in fade-in duration-200 text-white">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="size-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
                      <Navigation className="size-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-sm text-white">
                          GPS Location Access Required
                        </h4>
                        <span className="text-xs font-bold text-amber-300 uppercase">
                          {gpsStatus === 'denied' || gpsPermissionState === 'denied'
                            ? 'Permission Denied'
                            : 'Access Needed'}
                        </span>
                      </div>
                      <p className="text-xs text-white/80 font-medium mt-0.5">
                        {gpsStatus === 'denied' || gpsPermissionState === 'denied'
                          ? 'Location permission is currently blocked by your browser. Please tap the lock icon next to the browser URL to allow location permissions.'
                          : 'Real-time GPS access is required to receive nearby delivery orders and update live customer telemetry.'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={requestMobileGps}
                    className="flex items-center justify-center gap-1.5 rounded-full bg-[#1D1D1F] dark:bg-white text-white dark:text-[#1D1D1F] hover:bg-[#2C2C2E] dark:hover:bg-stone-200 px-4 py-2 text-xs font-semibold shadow-xs transition shrink-0 active:scale-95"
                  >
                    <MapPin className="size-3.5" />
                    <span>Allow GPS Access</span>
                  </button>
                </div>
              </div>
            )}

            {/* Top 2 KPI Overview Cards (Rendered across all Driver pages) */}
            <div className="mb-6 sm:mb-8 grid gap-3 grid-cols-2">
              <div className="rounded-2xl sm:rounded-3xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#161617] p-3.5 sm:p-5 shadow-xs flex flex-col justify-between transition">
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 truncate">
                      Today's Earnings
                    </p>
                    <span className="grid size-7 sm:size-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-bold shrink-0">
                      <DollarSign className="size-3.5 sm:size-5" />
                    </span>
                  </div>
                  <p className="mt-1 sm:mt-2 text-xl sm:text-3xl font-extrabold text-[#1D1D1F] dark:text-white">
                    ₹{totalEarningsToday}
                  </p>
                </div>
                <Link
                  href="/driver/wallet"
                  className="mt-2 text-[11px] sm:text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-black dark:hover:text-white flex items-center gap-1"
                >
                  <Wallet className="size-3 sm:size-3.5" /> Instant Cashout
                </Link>
              </div>

              <div className="rounded-2xl sm:rounded-3xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#161617] p-3.5 sm:p-5 shadow-xs flex flex-col justify-between transition">
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 truncate">
                      Completed Drops
                    </p>
                    <span className="grid size-7 sm:size-9 place-items-center rounded-xl bg-stone-100 text-stone-800 dark:bg-white/10 dark:text-stone-200 border border-black/[0.06] dark:border-white/[0.06] font-bold shrink-0">
                      <CheckCircle2 className="size-3.5 sm:size-5" />
                    </span>
                  </div>
                  <p className="mt-1 sm:mt-2 text-xl sm:text-3xl font-extrabold text-[#1D1D1F] dark:text-white">
                    {completedTrips.length}
                  </p>
                </div>
                <p className="mt-2 text-[11px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-semibold truncate">
                  {completedTrips.length > 0 ? '100% On-time score' : '0 deliveries today'}
                </p>
              </div>
            </div>

            {/* Child Page Route Content */}
            {children}
          </div>
        </main>

        {/* MOBILE BOTTOM NAVIGATION BAR (lg:hidden) */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 flex items-center justify-around border-t border-black/[0.08] dark:border-white/[0.08] bg-white/95 dark:bg-[#161617]/95 backdrop-blur-md px-2 py-1.5 pb-safe text-[#1D1D1F] dark:text-white shadow-lg">
          <Link
            href="/driver/dashboard"
            className={`flex flex-col items-center justify-center gap-1 py-1.5 px-3 min-h-[44px] rounded-xl transition ${
              pathname === '/driver/dashboard' || pathname === '/driver'
                ? 'text-[#1D1D1F] dark:text-white font-bold'
                : 'text-stone-400 dark:text-stone-500 hover:text-black dark:hover:text-white'
            }`}
          >
            <Navigation className="size-4" />
            <span className="text-[10px]">Map</span>
          </Link>

          <Link
            href="/driver/orders"
            className={`flex flex-col items-center justify-center gap-1 py-1.5 px-3 min-h-[44px] rounded-xl transition ${
              pathname === '/driver/orders'
                ? 'text-[#1D1D1F] dark:text-white font-bold'
                : 'text-stone-400 dark:text-stone-500 hover:text-black dark:hover:text-white'
            }`}
          >
            <PackageCheck className="size-4" />
            <span className="text-[10px]">Orders</span>
          </Link>

          <Link
            href="/driver/history"
            className={`flex flex-col items-center justify-center gap-1 py-1.5 px-3 min-h-[44px] rounded-xl transition ${
              pathname === '/driver/history'
                ? 'text-[#1D1D1F] dark:text-white font-bold'
                : 'text-stone-400 dark:text-stone-500 hover:text-black dark:hover:text-white'
            }`}
          >
            <History className="size-4" />
            <span className="text-[10px]">History</span>
          </Link>

          <Link
            href="/driver/wallet"
            className={`flex flex-col items-center justify-center gap-1 py-1.5 px-3 min-h-[44px] rounded-xl transition ${
              pathname === '/driver/wallet'
                ? 'text-[#1D1D1F] dark:text-white font-bold'
                : 'text-stone-400 dark:text-stone-500 hover:text-black dark:hover:text-white'
            }`}
          >
            <Wallet className="size-4" />
            <span className="text-[10px]">Wallet</span>
          </Link>

          <Link
            href="/driver/settings"
            className={`flex flex-col items-center justify-center gap-1 py-1.5 px-3 min-h-[44px] rounded-xl transition ${
              pathname === '/driver/settings'
                ? 'text-[#1D1D1F] dark:text-white font-bold'
                : 'text-stone-400 dark:text-stone-500 hover:text-black dark:hover:text-white'
            }`}
          >
            <Settings className="size-4" />
            <span className="text-[10px]">Settings</span>
          </Link>
        </nav>
      </div>

      {/* NEW ORDER REQUEST BROADCAST POPUP MODAL */}
      {broadcastOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl border border-black/[0.1] dark:border-white/[0.1] bg-white dark:bg-[#161617] p-5 text-[#1D1D1F] dark:text-white shadow-2xl relative overflow-hidden">
            {/* Top Timer Bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-stone-100 dark:bg-white/10">
              <div
                style={{ width: `${(offerTimer / 15) * 100}%` }}
                className="h-full bg-emerald-500 transition-all duration-1000 ease-linear"
              />
            </div>

            <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  New Delivery Offer ({offerTimer}s)
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-stone-500 dark:text-stone-400">
                {broadcastOffer.orderNumber}
              </span>
            </div>

            <div className="mt-3 flex flex-col gap-2.5">
              <div>
                <span className="text-[9px] font-bold uppercase text-amber-500">
                  Pickup Kitchen
                </span>
                <h3 className="text-base font-bold text-[#1D1D1F] dark:text-white">
                  {broadcastOffer.restaurantName}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="size-3 text-amber-500" /> {broadcastOffer.restaurantAddress}
                </p>
              </div>

              <div className="border-t border-black/[0.06] dark:border-white/[0.06] pt-2">
                <span className="text-[9px] font-bold uppercase text-blue-500">
                  Customer Delivery Zone
                </span>
                <p className="text-xs text-[#1D1D1F] dark:text-white font-semibold mt-0.5">
                  {broadcastOffer.customerAddress}
                </p>
                <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                  Distance: {broadcastOffer.distance}
                </p>
              </div>

              <div className="rounded-2xl bg-stone-50 dark:bg-white/5 p-3.5 border border-black/[0.06] dark:border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                      Driver Earning for this Order
                    </p>
                    <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                      ₹{broadcastOffer.basePayout + broadcastOffer.surgeBonus + broadcastOffer.tip}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-white/10 px-2.5 py-1 rounded-full border border-black/[0.06] dark:border-white/[0.06]">
                      ~18 mins total
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setBroadcastOffer(null)}
                className="rounded-full border border-black/[0.1] dark:border-white/[0.1] bg-stone-100 dark:bg-white/10 min-h-[44px] text-xs font-semibold text-[#1D1D1F] dark:text-white hover:bg-stone-200 dark:hover:bg-white/20 transition cursor-pointer"
              >
                Reject / Skip
              </button>
              <button
                onClick={acceptBroadcastOffer}
                className="rounded-full bg-[#1D1D1F] dark:bg-white text-white dark:text-[#1D1D1F] hover:bg-[#2C2C2E] dark:hover:bg-stone-200 min-h-[44px] text-xs font-bold shadow-md transition cursor-pointer"
              >
                ACCEPT ORDER
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELIVERY COMPLETED SUMMARY MODAL */}
      {completedSummaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#121815]/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl border border-emerald-400 bg-white p-5 shadow-2xl text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-600 mb-3 shadow-lg">
              <CheckCircle2 className="size-8" />
            </div>

            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
              Delivery Complete
            </p>
            <h3 className="mt-1.5 text-xl font-extrabold text-[#18201c]">
              Order {completedSummaryModal.order}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Delivered to {completedSummaryModal.customer}
            </p>

            <div className="mt-4 rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 text-center">
              <p className="text-[10px] font-bold text-emerald-800 uppercase">
                Payout Credited to Wallet
              </p>
              <p className="text-2xl font-extrabold text-emerald-700 mt-0.5">
                ₹{completedSummaryModal.total}
              </p>
            </div>

            <button
              onClick={() => setCompletedSummaryModal(null)}
              className="mt-5 w-full rounded-full bg-[#18201c] py-3 text-xs font-extrabold text-white shadow-lg hover:bg-[#323d36] transition"
            >
              BACK ONLINE & SEARCH NEXT ORDER
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <DriverProvider>
      <DriverLayoutContent>{children}</DriverLayoutContent>
    </DriverProvider>
  )
}
