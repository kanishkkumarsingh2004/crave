'use client'

import LanguageSwitcher from '@/components/LanguageSwitcher'
import ThemeToggle from '@/components/ThemeToggle'
import { useAuth } from '@/lib/auth-context'
import { useLanguage } from '@/lib/language-context'
import {
  Activity,
  BarChart3,
  Calculator,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  QrCode,
  Settings,
  ShieldCheck,
  Sparkles,
  Store,
  Tag,
  Users,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, role, logout, isLoading } = useAuth()
  const { t } = useLanguage()
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showRoleMenu, setShowRoleMenu] = useState(false)

  useEffect(() => {
    if (isLoading) return

    if (!user) {
      router.replace('/login')
    } else if (role !== 'admin') {
      const redirectPath =
        role === 'customer' || role === 'user'
          ? '/user/dashboard'
          : role === 'rider' || (role as string) === 'driver'
            ? '/driver/dashboard'
            : role === 'restaurant_vendor' || (role as string) === 'vendor'
              ? '/vendor/dashboard'
              : role === 'cravexp_store_vendor'
                ? '/vendor/crave-ep'
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
    return (
      <div className="min-h-screen bg-[#f8f9f7] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="mx-auto size-8 border-4 border-[#d9f447] border-t-[#18201c] rounded-full animate-spin" />
          <p
            className="mt-4 text-xs font-bold text-[#18201c] uppercase tracking-wider"
            suppressHydrationWarning
          >
            {t.admin.loadingConsole}
          </p>
        </div>
      </div>
    )
  }

  if (role !== 'admin') {
    return null
  }

  const navItems = [
    { href: '/admin/dashboard', label: t.admin.platformOverview, icon: LayoutDashboard },
    { href: '/admin/analytics', label: t.admin.platformAnalytics, icon: BarChart3 },
    {
      href: '/admin/map-live-analytics',
      label: (t.admin as any).mapLiveAnalytics || 'Map Live Analytics',
      icon: MapPin,
    },
    {
      href: '/admin/ai-analytics',
      label: (t.admin as any).aiAnalytics || 'AI Analytics',
      icon: Sparkles,
    },
    {
      href: '/admin/calculator',
      label: 'Calculator Playground',
      icon: Calculator,
    },
    {
      href: '/admin/commercial-contracts',
      label: 'Commercial Contracts & Rules',
      icon: FileText,
    },
    { href: '/admin/payments', label: t.admin.paymentReviewQueue, icon: CreditCard },
    { href: '/admin/users', label: t.admin.userAccounts, icon: Users },
    { href: '/admin/coupons', label: t.admin.couponsDiscounts, icon: Tag },
    { href: '/admin/vendor-settlements', label: t.admin.vendorSettlements, icon: Store },
    { href: '/admin/payment-config', label: t.admin.paymentConfigs, icon: QrCode },
    { href: '/admin/system', label: t.admin.systemHealthLogs, icon: Activity },
    { href: '/admin/settings', label: t.admin.adminSettings, icon: Settings },
  ]

  // Get current page title for top bar
  const currentItem = navItems.find(
    (item) => item.href === pathname || (item.href === '/admin/dashboard' && pathname === '/admin')
  )
  const pageTitle = currentItem ? currentItem.label : 'Admin Console'

  return (
    <div className="min-h-screen bg-[#f8f9f7] dark:bg-[#090d0b] text-[#18201c] dark:text-[#f0f4f1] flex flex-col lg:flex-row transition-colors duration-200">
      {/* Mobile Overlay with Smooth Fade Transition */}
      <div
        onClick={() => setSidebarOpen(false)}
        className={`fixed inset-0 z-40 bg-black/70 backdrop-blur-md lg:hidden transition-opacity duration-300 ease-in-out ${
          sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Admin Full-Height Left Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col justify-between bg-white dark:bg-[#111714] text-[#18201c] dark:text-white transition-all duration-300 ease-in-out lg:fixed lg:inset-y-0 lg:left-0 lg:h-screen lg:z-40 border-r border-[#e2e8e3] dark:border-[#1e2722] shadow-xs ${
          sidebarOpen ? 'translate-x-0 shadow-2xl w-72' : '-translate-x-full lg:translate-x-0'
        } ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        <div
          className={`flex flex-col gap-5 transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'p-3' : 'p-4'}`}
        >
          {/* Logo & Header */}
          <div className="flex items-center justify-between border-b border-[#e2e8e3] dark:border-white/10 pb-4 pt-1">
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-2.5 group min-w-0"
              title={sidebarCollapsed ? 'crave. Admin' : undefined}
            >
              <span className="grid size-9 place-items-center rounded-xl bg-[#d9f447] text-[#121815] shadow-[0_0_20px_rgba(217,244,71,0.3)] shrink-0 transition-transform duration-300 group-hover:scale-105">
                <UtensilsCrossed className="size-5 fill-current" />
              </span>
              <div
                className={`flex items-center gap-1.5 transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
                  sidebarCollapsed
                    ? 'opacity-0 max-w-0 hidden lg:hidden'
                    : 'opacity-100 max-w-[160px]'
                }`}
              >
                <span className="text-lg font-extrabold tracking-tight text-[#18201c] dark:text-white leading-none">
                  crave<span className="text-[#86a018] dark:text-[#d9f447]">.</span>
                </span>
                <span className="rounded-md bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300 px-1.5 py-0.5 text-[9px] font-extrabold uppercase border border-purple-200 dark:border-purple-500/30">
                  Admin
                </span>
              </div>
            </Link>

            <button
              onClick={() => setSidebarOpen(false)}
              className="grid size-7 place-items-center rounded-lg bg-black/5 dark:bg-white/10 text-gray-700 dark:text-white lg:hidden transition hover:bg-black/10 dark:hover:bg-white/20"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1 overflow-y-auto max-h-[calc(100vh-170px)] pr-1 scrollbar-none">
            <p
              className={`px-3 text-[10px] font-bold uppercase tracking-wider text-[#607367] dark:text-white/40 mb-1 transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
                sidebarCollapsed ? 'opacity-0 max-h-0 mb-0 hidden' : 'opacity-100 max-h-6'
              }`}
            >
              {t.admin.managementControls}
            </p>
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive =
                pathname === item.href ||
                (item.href === '/admin/dashboard' && pathname === '/admin')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={sidebarCollapsed ? item.label : undefined}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center ${
                    sidebarCollapsed ? 'justify-center px-0 py-3' : 'gap-3 px-3.5 py-2.5'
                  } rounded-xl text-xs font-semibold transition-all duration-200 ease-in-out ${
                    isActive
                      ? 'bg-[#18201c] text-white dark:bg-[#d9f447] dark:text-[#121815] font-extrabold shadow-sm dark:shadow-[0_4px_16px_rgba(217,244,71,0.25)]'
                      : 'text-[#44554b] dark:text-white/70 hover:bg-[#ebf0ec] dark:hover:bg-white/10 hover:text-[#121815] dark:hover:text-white'
                  }`}
                >
                  <Icon
                    className={`size-4 shrink-0 transition-transform duration-200 ${isActive ? 'text-white dark:text-[#121815] scale-105' : 'text-[#5e8210] dark:text-[#d9f447]'}`}
                  />
                  <span
                    className={`truncate transition-all duration-200 ease-in-out whitespace-nowrap ${
                      sidebarCollapsed ? 'opacity-0 max-w-0 hidden' : 'opacity-100 max-w-[170px]'
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Sidebar Bottom Profile & Minimize Button */}
        <div className="border-t border-[#e2e8e3] dark:border-white/10 p-3.5 flex flex-col gap-2 transition-all duration-300 ease-in-out bg-[#f4f7f4] dark:bg-[#0e1310]">
          <div
            className={`flex items-center ${sidebarCollapsed ? 'justify-center p-2' : 'justify-between p-2.5'} rounded-xl bg-white dark:bg-white/5 border border-[#e2e8e3] dark:border-white/5 transition-all duration-300 ease-in-out`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className="grid size-8 place-items-center rounded-lg bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800 text-xs shrink-0"
                title={user?.name || 'Sara Vance'}
              >
                SV
              </span>
              <div
                className={`transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap min-w-0 flex-1 ${
                  sidebarCollapsed ? 'opacity-0 max-w-0 hidden' : 'opacity-100 max-w-[130px]'
                }`}
              >
                <p className="text-xs font-bold text-[#18201c] dark:text-white truncate">
                  {user?.name || 'Sara Vance'}
                </p>
                <p className="text-[10px] text-[#607367] dark:text-white/50 truncate">
                  Master Admin
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

          {/* Bottom Single Minimize Toggle Arrow Button */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand Sidebar' : 'Minimize Sidebar'}
            className={`hidden lg:flex items-center ${
              sidebarCollapsed ? 'justify-center py-2.5' : 'justify-between px-3.5 py-2.5'
            } rounded-xl border border-[#e2e8e3] dark:border-white/10 bg-white dark:bg-white/5 text-xs font-semibold text-[#44554b] dark:text-white/70 hover:bg-[#eef2ee] dark:hover:bg-white/10 hover:text-[#121815] dark:hover:text-white transition-all duration-300 ease-in-out`}
          >
            <span
              className={`transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
                sidebarCollapsed ? 'opacity-0 max-w-0 hidden' : 'opacity-100 max-w-[130px]'
              }`}
            >
              {t.admin.minimizeSidebar}
            </span>
            <span className="transition-transform duration-300 ease-in-out">
              {sidebarCollapsed ? (
                <ChevronRight className="size-4 text-[#5e8210] dark:text-[#d9f447]" />
              ) : (
                <ChevronLeft className="size-4 text-[#5e8210] dark:text-[#d9f447]" />
              )}
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content Body */}
      <div
        className={`flex-1 flex flex-col min-w-0 bg-[#f8f9f7] dark:bg-[#0b0f0d] transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}
      >
        {/* Top Header Bar for Admin */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#e2e8e3] dark:border-[#1e2722] bg-white/90 dark:bg-[#111714]/90 px-4 py-3.5 backdrop-blur-xl sm:px-6 lg:px-8 shadow-xs">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#5e8210] dark:text-[#d9f447]">
                {t.admin.commandCenter}
              </p>
              <h1 className="text-lg font-bold tracking-tight text-[#18201c] dark:text-white">
                {pageTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-[#18201c] dark:text-white bg-[#f0f4f1] dark:bg-white/5 border border-[#e2e8e3] dark:border-white/10 px-3 py-1.5 rounded-full">
              <ShieldCheck className="size-4 text-[#5e8210] dark:text-[#d9f447]" /> Master Admin
              Access
            </span>

            <ThemeToggle />

            <LanguageSwitcher variant="pill" />

            {/* Mobile Navigation Button */}
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation menu"
              className="grid size-9 place-items-center rounded-xl border border-[#e2e8e3] dark:border-[#202923] bg-white dark:bg-[#18201c] text-[#18201c] dark:text-white lg:hidden hover:bg-[#f0f4f1] dark:hover:bg-[#202923] active:scale-95 transition"
            >
              <Menu className="size-5" />
            </button>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="p-4 sm:p-6 lg:p-8 pb-safe flex-1 bg-[#f8f9f7] dark:bg-[#0b0f0d] text-[#18201c] dark:text-[#f0f4f1] transition-colors duration-200">
          {children}
        </main>
      </div>
    </div>
  )
}
