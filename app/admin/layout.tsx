'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Activity,
  ArrowLeft,
  ChevronDown,
  CreditCard,
  Globe,
  LayoutDashboard,
  LogOut,
  Menu,
  QrCode,
  Settings,
  ShieldCheck,
  Store,
  Users,
  UtensilsCrossed,
  X,
  Zap,
} from 'lucide-react'
import { useAuth, UserRole } from '@/lib/auth-context'
import { roleDetails } from '@/components/Navbar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, role, loginAsRole, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showRoleMenu, setShowRoleMenu] = useState(false)

  useEffect(() => {
    if (user && role !== 'admin') {
      const redirectPath = role === 'customer' ? '/user/dashboard' : `/${role}/dashboard`
      router.replace(redirectPath)
    }
  }, [user, role, router])

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f8f9f7] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Authentication Required</p>
          <p className="mt-2 text-sm font-semibold">Checking admin permissions...</p>
        </div>
      </div>
    )
  }

  if (role !== 'admin') {
    return null
  }

  const navItems = [
    { href: '/admin/dashboard', label: 'Platform Overview', icon: LayoutDashboard },
    { href: '/admin/vendor-settlements', label: 'Vendor Settlements', icon: Store },
    { href: '/admin/users', label: 'User Accounts', icon: Users },
    { href: '/admin/payments', label: 'Payment Review Queue', icon: CreditCard },
    { href: '/admin/payment-config', label: 'Payment Configs (UPI)', icon: QrCode },
    { href: '/admin/system', label: 'System Health Logs', icon: Activity },
    { href: '/admin/settings', label: 'Admin Settings', icon: Settings },
  ]

  // Get current page title for top bar
  const currentItem = navItems.find(
    (item) => item.href === pathname || (item.href === '/admin/dashboard' && pathname === '/admin')
  )
  const pageTitle = currentItem ? currentItem.label : 'Admin Console'

  return (
    <div className="min-h-screen bg-[#f8f9f7] text-[#18201c] flex">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-[#121815]/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Admin Full-Height Left Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col justify-between border-r border-[#202923] bg-[#121815] text-white transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col gap-6 p-4">
          {/* Logo & Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4 pt-1">
            <Link href="/admin/dashboard" className="flex items-center gap-2.5 group">
              <span className="grid size-9 place-items-center rounded-xl bg-[#d9f447] text-[#121815] shadow-[0_4px_16px_rgba(217,244,71,0.35)]">
                <UtensilsCrossed className="size-5 fill-current" />
              </span>
              <div>
                <span className="text-lg font-bold tracking-tight text-white leading-none">
                  crave<span className="text-[#d9f447]">.</span>
                </span>
                <span className="ml-1.5 rounded-md bg-purple-500/20 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-purple-300 border border-purple-500/30">
                  Admin
                </span>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="grid size-7 place-items-center rounded-lg bg-white/10 text-white lg:hidden"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">
              Management & Controls
            </p>
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || (item.href === '/admin/dashboard' && pathname === '/admin')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                    isActive
                      ? 'bg-[#d9f447] text-[#121815] font-bold shadow-md'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className={`size-4 ${isActive ? 'text-[#121815]' : 'text-[#d9f447]'}`} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Sidebar Bottom Profile */}
        <div className="border-t border-white/10 p-3.5 flex flex-col gap-2">
          {/* Quick Perspective Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu((v) => !v)}
              className="flex w-full items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-[11px] font-semibold text-white/80 hover:bg-white/10 transition"
            >
              <span className="flex items-center gap-2">
                <ShieldCheck className="size-3.5 text-[#d9f447]" /> Switch Role View
              </span>
              <ChevronDown className="size-3 text-white/50" />
            </button>

            {showRoleMenu && (
              <div className="absolute bottom-11 left-0 z-50 w-full rounded-xl border border-white/15 bg-[#1a221d] p-1.5 shadow-2xl">
                {(Object.keys(roleDetails) as UserRole[]).map((rKey) => {
                  const info = roleDetails[rKey]
                  const targetUrl = rKey === 'customer' ? '/user/dashboard' : `/${rKey}/dashboard`
                  return (
                    <button
                      key={rKey}
                      onClick={async () => {
                        await loginAsRole(rKey)
                        setShowRoleMenu(false)
                        router.push(targetUrl)
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[11px] font-semibold text-white/80 hover:bg-white/10 hover:text-white"
                    >
                      <span className={`grid size-5 place-items-center rounded ${info.bg}`}>
                        <info.icon className={`size-3 ${info.color}`} />
                      </span>
                      <span className="capitalize">{info.title}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-xl bg-white/5 p-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="grid size-8 place-items-center rounded-lg bg-purple-950 text-purple-300 font-bold border border-purple-800 text-xs">
                SV
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">{user?.name || 'Sara Vance'}</p>
                <p className="text-[10px] text-white/50 truncate">Master Admin</p>
              </div>
            </div>
            <button
              onClick={() => logout()}
              title="Sign Out"
              className="grid size-7 place-items-center rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white transition shrink-0"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Body */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar for Admin */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#e3e8de] bg-white/90 px-4 py-3.5 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="grid size-9 place-items-center rounded-xl border border-[#dfe4dc] bg-white lg:hidden"
            >
              <Menu className="size-5 text-[#18201c]" />
            </button>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#859d19]">
                Admin Command Center
              </p>
              <h1 className="text-lg font-bold tracking-tight text-[#18201c]">
                {pageTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3.5 py-1 text-xs font-bold text-purple-900">
              <ShieldCheck className="size-3.5 text-purple-700" /> Passcode: {user?.adminCode || 'CRAVE-SYS-8890'}
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8 flex-1">{children}</main>
      </div>
    </div>
  )
}
