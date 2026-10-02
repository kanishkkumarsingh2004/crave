'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Bike,
  ChevronDown,
  LogOut,
  Menu,
  ShieldCheck,
  ShoppingBag,
  Store,
  User,
  Zap,
  X,
  LayoutDashboard,
} from 'lucide-react'
import { useAuth, UserRole } from '@/lib/auth-context'

export const roleDetails: Record<UserRole, { title: string; badge: string; color: string; bg: string; icon: React.ElementType }> = {
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
  const { user, role, loginAsRole, logout } = useAuth()
  const [showRoleDropdown, setShowRoleDropdown] = useState(false)
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const CurrentRoleIcon = roleDetails[role]?.icon || ShoppingBag
  const currentDashboardLink = role === 'customer' ? '/user/dashboard' : `/${role}/dashboard`

  return (
    <header className="sticky top-0 z-50 border-b border-[#e5e9e1] bg-white/90 backdrop-blur-md">
      <nav className="mx-auto flex max-w-[1240px] items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-[#d9f447] text-[#18201c] shadow-[0_4px_16px_rgba(217,244,71,0.4)]">
              <Zap className="size-5 fill-current" />
            </span>
            <span className="text-xl font-bold tracking-tight text-[#18201c]">
              drop<span className="text-[#869c18]">.</span>
            </span>
          </Link>

          {/* Role selector pill */}
          <div className="relative hidden md:block">
            <button
              onClick={() => setShowRoleDropdown((v) => !v)}
              className="flex items-center gap-2 rounded-full border border-[#dfe4dc] bg-[#f8f9f7] px-3.5 py-1.5 text-xs font-semibold text-[#18201c] transition hover:bg-[#edf2e6]"
            >
              <CurrentRoleIcon className="size-3.5 text-[#738814]" />
              <span>{roleDetails[role]?.badge}</span>
              <ChevronDown className="size-3 text-[#78827c]" />
            </button>

            {showRoleDropdown && (
              <div className="absolute left-0 top-11 z-50 w-60 rounded-2xl border border-[#e2e6df] bg-white p-2 shadow-2xl">
                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#88928a]">
                  Switch Demo Perspective
                </div>
                {(Object.keys(roleDetails) as UserRole[]).map((rKey) => {
                  const info = roleDetails[rKey]
                  const IconComponent = info.icon
                  const isSelected = role === rKey
                  const targetUrl = rKey === 'customer' ? '/user/dashboard' : `/${rKey}/dashboard`
                  return (
                    <button
                      key={rKey}
                      onClick={async () => {
                        await loginAsRole(rKey)
                        setShowRoleDropdown(false)
                        router.push(targetUrl)
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition ${
                        isSelected ? 'bg-[#f0f5db] text-[#18201c] font-bold' : 'hover:bg-[#f5f7f2] text-[#4d5651]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`grid size-7 place-items-center rounded-lg ${info.bg}`}>
                          <IconComponent className={`size-3.5 ${info.color}`} />
                        </span>
                        <div className="text-left">
                          <p className="font-semibold text-xs leading-none">{info.title}</p>
                          <p className="text-[10px] text-[#7d8781] mt-0.5">{info.badge}</p>
                        </div>
                      </div>
                      {isSelected && <span className="size-2 rounded-full bg-[#8fa71c]" />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Center navigation links */}
        <div className="hidden items-center gap-6 text-xs font-semibold text-[#5a655f] lg:flex">
          <Link href="/" className={`transition hover:text-[#18201c] ${pathname === '/' ? 'text-[#18201c] font-bold' : ''}`}>
            Explore
          </Link>
          <Link href={currentDashboardLink} className={`flex items-center gap-1.5 transition hover:text-[#18201c] ${pathname.includes('dashboard') ? 'text-[#18201c] font-bold' : ''}`}>
            <LayoutDashboard className="size-3.5 text-[#859d19]" />
            Dashboard ({roleDetails[role]?.title})
          </Link>
          <Link href="/login" className={`transition hover:text-[#18201c] ${pathname === '/login' ? 'text-[#18201c] font-bold' : ''}`}>
            Login
          </Link>
          <Link href="/signup" className={`transition hover:text-[#18201c] ${pathname === '/signup' ? 'text-[#18201c] font-bold' : ''}`}>
            Sign Up
          </Link>
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
                  <img src={user.avatar} alt={user.name} className="size-7 rounded-full object-cover" />
                ) : (
                  <span className="grid size-7 place-items-center rounded-full bg-[#d9f447] text-xs font-bold text-[#18201c]">
                    {user.name.charAt(0)}
                  </span>
                )}
                <div className="hidden text-left sm:block">
                  <p className="text-xs font-bold leading-none text-[#18201c]">{user.name}</p>
                  <p className="mt-0.5 text-[10px] font-medium capitalize text-[#75817a]">{user.role}</p>
                </div>
                <ChevronDown className="size-3.5 text-[#88928a]" />
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 top-11 z-50 w-56 rounded-2xl border border-[#e2e6df] bg-white p-2 shadow-2xl">
                  <div className="border-b border-[#eff2ed] px-3 py-2.5">
                    <p className="text-xs font-bold text-[#18201c]">{user.name}</p>
                    <p className="text-[11px] text-[#78827c] truncate">{user.email}</p>
                    <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${roleDetails[user.role]?.bg} ${roleDetails[user.role]?.color}`}>
                      {user.role} Account
                    </span>
                  </div>

                  <Link
                    href={currentDashboardLink}
                    onClick={() => setShowUserDropdown(false)}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#2d3732] hover:bg-[#f3f6ee] mt-1"
                  >
                    <LayoutDashboard className="size-4 text-[#7d9518]" />
                    Go to Dashboard
                  </Link>

                  <button
                    onClick={async () => {
                      await logout()
                      setShowUserDropdown(false)
                      router.push('/login')
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
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

          {/* Mobile menu button */}
          <button
            onClick={() => setShowMobileMenu((v) => !v)}
            className="grid size-9 place-items-center rounded-full border border-[#dfe4dc] bg-white lg:hidden"
            aria-label="Toggle menu"
          >
            {showMobileMenu ? <X className="size-4 text-[#18201c]" /> : <Menu className="size-4 text-[#18201c]" />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {showMobileMenu && (
        <div className="border-t border-[#e2e6de] bg-white px-5 py-4 lg:hidden">
          <div className="flex flex-col gap-3 text-xs font-semibold">
            <p className="text-[10px] uppercase tracking-wider text-[#8a958e]">Select Role Mode</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(roleDetails) as UserRole[]).map((rKey) => {
                const targetUrl = rKey === 'customer' ? '/user/dashboard' : `/${rKey}/dashboard`
                return (
                  <button
                    key={rKey}
                    onClick={async () => {
                      await loginAsRole(rKey)
                      setShowMobileMenu(false)
                      router.push(targetUrl)
                    }}
                    className={`flex items-center gap-2 rounded-xl border p-2 text-[11px] font-semibold ${
                      role === rKey ? 'border-[#d9f447] bg-[#f2f8da]' : 'border-[#e5e9e1] bg-[#f8f9f7]'
                    }`}
                  >
                    <span className="capitalize">{rKey}</span>
                  </button>
                )
              })}
            </div>

            <hr className="my-1 border-[#edf0ea]" />

            <Link href="/" onClick={() => setShowMobileMenu(false)} className="py-1 text-[#18201c]">
              Home / Explore
            </Link>
            <Link href={currentDashboardLink} onClick={() => setShowMobileMenu(false)} className="py-1 text-[#18201c] flex items-center justify-between">
              <span>Dashboard</span>
              <span className="rounded-full bg-[#f0f5db] px-2 py-0.5 text-[10px] text-[#718714] capitalize">{role}</span>
            </Link>
            <Link href="/login" onClick={() => setShowMobileMenu(false)} className="py-1 text-[#18201c]">
              Login
            </Link>
            <Link href="/signup" onClick={() => setShowMobileMenu(false)} className="py-1 text-[#18201c]">
              Sign Up
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
