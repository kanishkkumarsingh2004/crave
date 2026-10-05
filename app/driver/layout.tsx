'use client'

import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useAuth } from '@/lib/auth-context'
import { DriverProvider, useDriver } from '@/lib/driver-context'
import {
  Bike,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  DollarSign,
  History,
  LogOut,
  MapPin,
  Menu,
  Navigation,
  Power,
  Radio,
  Settings,
  Target,
  TrendingUp,
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
  const [sosModalOpen, setSosModalOpen] = useState(false)

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
  } = useDriver()

  useEffect(() => {
    if (isLoading) return

    if (!user) {
      router.replace('/login')
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

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-[#f8f9f7] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="mx-auto size-8 border-4 border-[#d9f447] border-t-[#18201c] rounded-full animate-spin" />
          <p className="mt-4 text-xs font-bold text-[#18201c] uppercase tracking-wider">
            Loading Delivery Cockpit...
          </p>
        </div>
      </div>
    )
  }

  if (role !== 'driver' && role !== 'rider') {
    return null
  }

  const totalEarningsToday = completedTrips.reduce((acc, t) => acc + t.total, 0)
  const activeDutyTimeText =
    completedTrips.length > 0 ? `${(completedTrips.length * 1.2).toFixed(1)} hrs` : '0.0 hrs'
  const avgPaceText = completedTrips.length > 0 ? '18 mins' : '0 mins'
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
    { href: '/driver/profile', label: 'Vehicle & Profile', icon: User, badge: 'Profile' },
    { href: '/driver/settings', label: 'UPI Payout Settings', icon: Settings, badge: 'UPI' },
  ]

  const currentItem = navItems.find(
    (item) =>
      pathname === item.href || (item.href === '/driver/dashboard' && pathname === '/driver')
  )
  const pageTitle = currentItem ? currentItem.label : 'Driver Cockpit'

  return (
    <div className="flex min-h-screen bg-[#f8f9f7] text-[#18201c]">
      {/* Mobile Overlay */}
      <div
        onClick={() => setSidebarOpen(false)}
        className={`fixed inset-0 z-40 bg-[#121815]/60 backdrop-blur-sm lg:hidden transition-opacity duration-300 ease-in-out ${
          sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* DESKTOP DARK FULL-HEIGHT STICKY SIDEBAR (EXACTLY MATCHING ADMIN SIDEBAR LAYOUT) */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex flex-col justify-between bg-[#121815] text-white transition-all duration-300 ease-in-out will-change-[width,transform] lg:sticky lg:top-0 lg:h-screen lg:left-0 lg:right-auto lg:border-r lg:border-[#202923] lg:translate-x-0 overflow-hidden ${
          sidebarOpen
            ? 'translate-x-0 shadow-2xl w-64 border-l border-[#202923]'
            : 'translate-x-full lg:shadow-none'
        } ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        <div className="flex flex-col justify-between h-full min-h-0 overflow-hidden">
          <div
            className={`flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto no-scrollbar transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'p-2.5' : 'p-4'}`}
          >
            {/* Sidebar Top Header (Matching Admin Brand Logo) */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 pt-1">
              <Link
                href="/driver/dashboard"
                className="flex items-center gap-2.5 group min-w-0"
                title={sidebarCollapsed ? 'crave. Driver' : undefined}
              >
                <span className="grid size-9 place-items-center rounded-xl bg-[#d9f447] text-[#121815] shadow-[0_4px_16px_rgba(217,244,71,0.35)] shrink-0 transition-transform duration-300 group-hover:scale-105">
                  <Bike className="size-5" />
                </span>
                <div
                  className={`flex items-center gap-1.5 transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
                    sidebarCollapsed
                      ? 'opacity-0 max-w-0 hidden lg:hidden'
                      : 'opacity-100 max-w-[160px]'
                  }`}
                >
                  <span className="text-lg font-bold tracking-tight text-white leading-none">
                    crave<span className="text-[#d9f447]">.</span>
                  </span>
                  <span className="rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-emerald-300 border border-emerald-500/30">
                    Driver
                  </span>
                </div>
              </Link>
              <button
                onClick={() => setSidebarOpen(false)}
                className="grid size-7 place-items-center rounded-lg bg-white/10 text-white lg:hidden hover:bg-white/20 transition"
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
              } rounded-xl text-xs font-bold transition shadow-sm ${
                isOnline ? 'bg-emerald-500 text-[#121815]' : 'bg-gray-800 text-white'
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
                className={`px-3 text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1 transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
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
                        ? 'bg-[#d9f447] text-[#121815] font-bold shadow-md'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={`size-4 shrink-0 transition-transform duration-300 ${isActive ? 'text-[#121815] scale-105' : 'text-[#d9f447]'}`}
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
                        className={`rounded-full px-2 py-0.5 text-[9px] font-bold shrink-0 ${
                          isActive ? 'bg-[#121815] text-white' : 'bg-white/15 text-[#d9f447]'
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
          <div className="border-t border-white/10 p-3.5 flex flex-col gap-2 shrink-0 bg-[#121815]">
            <div
              className={`flex items-center ${sidebarCollapsed ? 'justify-center p-2' : 'justify-between p-2.5'} rounded-xl bg-white/5 transition-all duration-300 ease-in-out`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="grid size-8 place-items-center rounded-lg bg-blue-950 text-blue-300 font-bold border border-blue-800 text-xs shrink-0"
                  title={user?.name || 'Driver Partner'}
                >
                  {driverInitials}
                </span>
                <div
                  className={`transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap min-w-0 flex-1 ${
                    sidebarCollapsed ? 'opacity-0 max-w-0 hidden' : 'opacity-100 max-w-[130px]'
                  }`}
                >
                  <p className="text-xs font-bold text-white truncate">
                    {user?.name || 'Driver Partner'}
                  </p>
                  <p className="text-[10px] text-white/50 truncate">
                    {user?.vehicleNo || 'EV Fleet Vehicle'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => logout()}
                title="Sign Out"
                className={`grid size-7 place-items-center rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white transition-all duration-300 shrink-0 ${
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
              } rounded-xl border border-white/10 bg-white/5 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-all duration-300 ease-in-out shrink-0`}
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
                  <ChevronRight className="size-4 text-[#d9f447]" />
                ) : (
                  <ChevronLeft className="size-4 text-[#d9f447]" />
                )}
              </span>
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar for Driver */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#e3e8de] bg-white/90 px-4 py-3.5 sm:px-6 lg:px-8 backdrop-blur-md">
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[#18201c] capitalize flex items-center gap-2">
              Driver Cockpit — {pageTitle}
            </h1>
            <p className="text-xs text-[#737e77]">
              Vehicle:{' '}
              <span className="font-semibold text-[#18201c]">
                {user?.vehicleType || 'Commercial EV Scooter'}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Test Simulation Radar Trigger */}
            <button
              onClick={triggerSimulatedOffer}
              className="hidden sm:flex items-center gap-1.5 rounded-full bg-amber-100 px-3.5 py-1.5 text-xs font-bold text-amber-900 border border-amber-300 hover:bg-amber-200 transition"
              title="Test Delivery Radar"
            >
              <Radio className="size-4 text-amber-700 animate-pulse" />
              <span>Scan Nearby Orders</span>
            </button>

            <LanguageSwitcher variant="pill" />

            {/* Mobile Hamburger Menu Button */}
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open mobile navigation drawer"
              className="grid size-9 place-items-center rounded-xl border border-[#dfe4dc] bg-white shadow-xs lg:hidden hover:bg-gray-50 active:scale-95 transition"
            >
              <Menu className="size-5 text-[#18201c]" />
            </button>
          </div>
        </header>

        {/* Dashboard Body Content */}
        <main className="p-4 sm:p-6 lg:p-8 flex-1 flex flex-col justify-between">
          <div>
            {/* Top 4 KPI Overview Cards (Rendered across all Driver pages) */}
            <div className="mb-6 sm:mb-8 grid gap-3 grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl sm:rounded-3xl border border-[#e2e7dc] bg-white p-3.5 sm:p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition">
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#737e77] truncate">
                      Today's Earnings
                    </p>
                    <span className="grid size-7 sm:size-9 place-items-center rounded-xl bg-emerald-100 text-emerald-800 font-bold shrink-0">
                      <DollarSign className="size-3.5 sm:size-5" />
                    </span>
                  </div>
                  <p className="mt-1 sm:mt-2 text-xl sm:text-3xl font-extrabold text-emerald-700">
                    ₹{totalEarningsToday}
                  </p>
                </div>
                <Link
                  href="/driver/wallet"
                  className="mt-2 text-[11px] sm:text-xs font-bold text-blue-700 hover:underline flex items-center gap-1"
                >
                  <Wallet className="size-3 sm:size-3.5" /> Instant Cashout
                </Link>
              </div>

              <div className="rounded-2xl sm:rounded-3xl border border-[#e2e7dc] bg-white p-3.5 sm:p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition">
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#737e77] truncate">
                      Completed Drops
                    </p>
                    <span className="grid size-7 sm:size-9 place-items-center rounded-xl bg-blue-100 text-blue-800 font-bold shrink-0">
                      <CheckCircle2 className="size-3.5 sm:size-5" />
                    </span>
                  </div>
                  <p className="mt-1 sm:mt-2 text-xl sm:text-3xl font-extrabold text-[#18201c]">
                    {completedTrips.length}
                  </p>
                </div>
                <p className="mt-2 text-[11px] sm:text-xs text-emerald-600 font-semibold truncate">
                  {completedTrips.length > 0 ? '100% On-time score' : '0 deliveries today'}
                </p>
              </div>

              <div className="rounded-2xl sm:rounded-3xl border border-[#e2e7dc] bg-white p-3.5 sm:p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition">
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#737e77] truncate">
                      Active Duty Time
                    </p>
                    <span className="grid size-7 sm:size-9 place-items-center rounded-xl bg-blue-100 text-blue-800 font-bold shrink-0">
                      <Clock3 className="size-3.5 sm:size-5" />
                    </span>
                  </div>
                  <p className="mt-1 sm:mt-2 text-xl sm:text-3xl font-extrabold text-[#18201c]">
                    {activeDutyTimeText}
                  </p>
                </div>
                <p className="mt-2 text-[11px] sm:text-xs text-blue-600 font-semibold truncate">
                  {completedTrips.length > 0 ? 'Online & Accepting Drops' : 'Duty Ready'}
                </p>
              </div>

              <div className="rounded-2xl sm:rounded-3xl border border-[#e2e7dc] bg-white p-3.5 sm:p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition">
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#737e77] truncate">
                      Avg Delivery Pace
                    </p>
                    <span className="grid size-7 sm:size-9 place-items-center rounded-xl bg-[#f0f5db] text-[#718714] font-bold shrink-0">
                      <TrendingUp className="size-3.5 sm:size-5" />
                    </span>
                  </div>
                  <p className="mt-1 sm:mt-2 text-xl sm:text-3xl font-extrabold text-[#18201c]">
                    {avgPaceText}
                  </p>
                </div>
                <p className="mt-2 text-[11px] sm:text-xs text-emerald-600 font-medium truncate">
                  {completedTrips.length > 0 ? 'Optimal route efficiency' : 'No drops recorded'}
                </p>
              </div>
            </div>

            {/* Child Page Route Content */}
            {children}
          </div>
        </main>

        {/* MOBILE BOTTOM NAVIGATION BAR (lg:hidden) */}
        <nav className="lg:hidden sticky bottom-0 z-30 flex items-center justify-around border-t border-[#24302a] bg-[#121815] p-2 text-white shadow-2xl">
          <Link
            href="/driver/dashboard"
            className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition ${
              pathname === '/driver/dashboard'
                ? 'text-[#d9f447] font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Navigation className="size-4" />
            <span className="text-[9px]">Map</span>
          </Link>

          <Link
            href="/driver/history"
            className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition ${
              pathname === '/driver/history'
                ? 'text-[#d9f447] font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <History className="size-4" />
            <span className="text-[9px]">History</span>
          </Link>

          <Link
            href="/driver/wallet"
            className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition ${
              pathname === '/driver/wallet'
                ? 'text-[#d9f447] font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Wallet className="size-4" />
            <span className="text-[9px]">Wallet</span>
          </Link>

          <Link
            href="/driver/settings"
            className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition ${
              pathname === '/driver/settings'
                ? 'text-[#d9f447] font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Settings className="size-4" />
            <span className="text-[9px]">UPI</span>
          </Link>
        </nav>
      </div>

      {/* NEW ORDER REQUEST BROADCAST POPUP MODAL */}
      {broadcastOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#121815]/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl border-2 border-[#d9f447] bg-[#121815] p-5 text-white shadow-2xl relative overflow-hidden">
            {/* Top Timer Bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gray-800">
              <div
                style={{ width: `${(offerTimer / 15) * 100}%` }}
                className="h-full bg-[#d9f447] transition-all duration-1000 ease-linear"
              />
            </div>

            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-[#d9f447] animate-ping" />
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#d9f447]">
                  New Delivery Offer ({offerTimer}s)
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-white/60">
                {broadcastOffer.orderNumber}
              </span>
            </div>

            <div className="mt-3 flex flex-col gap-2.5">
              <div>
                <span className="text-[9px] font-bold uppercase text-amber-400">
                  Pickup Kitchen
                </span>
                <h3 className="text-base font-bold text-white">{broadcastOffer.restaurantName}</h3>
                <p className="text-xs text-white/70 flex items-center gap-1 mt-0.5">
                  <MapPin className="size-3 text-amber-400" /> {broadcastOffer.restaurantAddress}
                </p>
              </div>

              <div className="border-t border-white/10 pt-2">
                <span className="text-[9px] font-bold uppercase text-blue-400">
                  Customer Delivery Zone
                </span>
                <p className="text-xs text-white/90 font-semibold mt-0.5">
                  {broadcastOffer.customerAddress}
                </p>
                <p className="text-[10px] text-white/60 mt-0.5">
                  Distance: {broadcastOffer.distance}
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 p-3 flex items-center justify-between border border-white/10">
                <div>
                  <p className="text-[9px] font-bold uppercase text-[#d9f447]">
                    Estimated Total Payout
                  </p>
                  <p className="text-xl font-extrabold text-emerald-400">
                    ₹{broadcastOffer.basePayout + broadcastOffer.surgeBonus + broadcastOffer.tip}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-[#d9f447] bg-[#1d2722] px-2 py-0.5 rounded-md border border-[#303f37]">
                    ~18 mins total
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setBroadcastOffer(null)}
                className="rounded-full border border-white/20 bg-white/5 py-2.5 text-xs font-bold text-white hover:bg-white/10 transition"
              >
                Reject / Skip
              </button>
              <button
                onClick={acceptBroadcastOffer}
                className="rounded-full bg-[#d9f447] py-2.5 text-xs font-extrabold text-[#121815] shadow-lg hover:bg-[#c2dc3a] transition"
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

            <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider">
              Delivery Complete
            </span>
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
