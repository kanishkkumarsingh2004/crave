'use client'

import { supabase } from '@/lib/supabase'
import {
  ArrowUpRight,
  BarChart3,
  CreditCard,
  DollarSign,
  LayoutDashboard,
  Percent,
  QrCode,
  ShieldCheck,
  Store,
  Tag,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const ADMIN_SECTION_LINKS = [
  {
    href: '/vendor/crave-ep',
    label: 'craveXP Hub',
    description: 'Manage 10-min grocery inventory, cold-chain IoT, pickers & barcode dispatch.',
    icon: Zap,
  },
  {
    href: '/user/cravexp',
    label: 'craveXP Instamart Store',
    description: 'Browse live 10-minute grocery catalog & customer ordering experience.',
    icon: Store,
  },
  {
    href: '/admin/analytics',
    label: 'Platform Analytics',
    description: 'Review revenue, orders, and platform performance.',
    icon: BarChart3,
  },
  {
    href: '/admin/payments',
    label: 'Payment Review Queue',
    description: 'Verify payment references and payment status.',
    icon: CreditCard,
  },
  {
    href: '/admin/users',
    label: 'User Accounts',
    description: 'Manage customer, vendor, driver, and admin access.',
    icon: Users,
  },
  {
    href: '/admin/coupons',
    label: 'Coupons & Discounts',
    description: 'Manage promotions and campaign rules.',
    icon: Tag,
  },
  {
    href: '/admin/vendor-settlements',
    label: 'Vendor Settlements',
    description: 'Review payouts, sales, and commission splits.',
    icon: Store,
  },
  {
    href: '/admin/payment-config',
    label: 'Payment Configs',
    description: 'Manage UPI configuration and payment routing.',
    icon: QrCode,
  },
]

export default function AdminDashboardPage() {
  const [weeklyGross, setWeeklyGross] = useState(0)
  const [totalCommission, setTotalCommission] = useState(0)
  const [netVendorPay, setNetVendorPay] = useState(0)
  const [customerCount, setCustomerCount] = useState(0)
  const [vendorCount, setVendorCount] = useState(0)
  const [driverCount, setDriverCount] = useState(0)
  const [topRestaurants, setTopRestaurants] = useState<
    { name: string; grossSales: number; commissionRate: number }[]
  >([])

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const { data: settlements } = await supabase.from('vendor_settlements').select('*')
        if (settlements) {
          setWeeklyGross(settlements.reduce((sum, row) => sum + Number(row.gross_sales ?? 0), 0))
          setTotalCommission(
            settlements.reduce((sum, row) => sum + Number(row.commission_amount ?? 0), 0)
          )
          setNetVendorPay(settlements.reduce((sum, row) => sum + Number(row.net_payout ?? 0), 0))
        }

        const { data: restaurants } = await supabase.from('restaurants').select('*')
        if (restaurants) {
          setTopRestaurants(
            restaurants.slice(0, 4).map((restaurant) => ({
              name: restaurant.name ?? 'Restaurant',
              grossSales: Number(restaurant.gross_sales ?? 150000),
              commissionRate: Number(restaurant.commission_rate ?? 15),
            }))
          )
        }

        const { data: users } = await supabase.from('users').select('role')
        if (users) {
          setCustomerCount(users.filter((user) => user.role === 'customer').length)
          setVendorCount(users.filter((user) => user.role === 'vendor').length)
          setDriverCount(users.filter((user) => user.role === 'driver').length)
        }
      } catch (error) {
        console.error('Failed to load admin overview data:', error)
      }
    }

    loadDashboardData()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-[#e2e7dd] pb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#859d19]">
            Command center
          </p>
          <h2 className="mt-1 text-2xl font-bold text-[#18201c]">Platform Overview</h2>
        </div>
        <Link
          href="/admin/analytics"
          className="inline-flex items-center gap-2 rounded-full border border-[#dfe4dc] bg-white px-3 py-2 text-xs font-bold text-[#18201c] shadow-sm hover:bg-gray-50"
        >
          Open Analytics <ArrowUpRight className="size-3.5" />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Weekly Gross"
          value={`₹${weeklyGross.toLocaleString()}`}
          accent="purple"
          icon={<DollarSign className="size-4" />}
          note="Live Supabase data"
        />
        <SummaryCard
          title="Platform Commission"
          value={`₹${totalCommission.toLocaleString()}`}
          accent="emerald"
          icon={<Percent className="size-4" />}
          note="Settlement revenue"
        />
        <SummaryCard
          title="Net Vendor Pay"
          value={`₹${netVendorPay.toLocaleString()}`}
          accent="amber"
          icon={<Store className="size-4" />}
          note="Vendor settlements"
        />
        <SummaryCard
          title="Delivery Fleet"
          value={`${driverCount} drivers`}
          accent="blue"
          icon={<Zap className="size-4" />}
          note="Registered riders"
        />
      </div>

      {/* CRAVEXP LIVE OPERATIONS BANNER */}
      <div className="rounded-3xl border border-[#d9f447]/60 bg-gradient-to-r from-[#18201c] to-[#25322b] p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#d9f447]/20 border border-[#d9f447]/40 px-3 py-1 text-[10px] font-extrabold text-[#d9f447] uppercase tracking-wider">
            <Zap className="size-3.5 fill-[#d9f447]" /> craveXP Command Center
          </div>
          <h3 className="text-xl font-extrabold tracking-tight text-white">
            10-Minute Fleet &amp; IoT Cold-Chain Monitoring
          </h3>
          <p className="text-xs text-[#a3b3a9] leading-relaxed">
            4 active fulfillment hubs • 98.6% SLA speed compliance • Live picker staff leaderboard
            &amp; auto-replenishment active.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="rounded-2xl bg-white/10 backdrop-blur px-4 py-2.5 text-center border border-white/10">
            <p className="text-[10px] text-gray-300 font-bold uppercase">Avg Pick Time</p>
            <p className="text-base font-black text-[#d9f447]">1m 42s</p>
          </div>
          <div className="rounded-2xl bg-white/10 backdrop-blur px-4 py-2.5 text-center border border-white/10">
            <p className="text-[10px] text-gray-300 font-bold uppercase">Cold-Chain Temp</p>
            <p className="text-base font-black text-emerald-400">3.2°C Nominal</p>
          </div>
          <Link
            href="/vendor/crave-ep"
            className="rounded-full bg-[#d9f447] px-5 py-3 text-xs font-black text-[#121815] shadow-lg hover:bg-[#c2dc37] transition hover:scale-105 active:scale-95 flex items-center gap-1.5"
          >
            Manage craveXP Console <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3 border-b border-[#f0f3ec] pb-4">
            <div>
              <h3 className="text-lg font-bold text-[#18201c]">Management Modules</h3>
              <p className="text-xs text-[#737e77]">Each section has its own dedicated page.</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#f1f6d9] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#6a8014]">
              <LayoutDashboard className="size-3.5" /> Overview
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {ADMIN_SECTION_LINKS.map(({ href, label, description, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group rounded-2xl border border-[#e2e7dc] bg-[#f8f9f7] p-4 transition hover:-translate-y-0.5 hover:border-[#cdd7c4] hover:bg-white"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-xl bg-[#18201c] text-[#d9f447]">
                      <Icon className="size-4" />
                    </span>
                    <span className="text-sm font-bold text-[#18201c]">{label}</span>
                  </div>
                  <ArrowUpRight className="size-4 text-[#6a8014] transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
                <p className="mt-3 text-xs leading-relaxed text-[#737e77]">{description}</p>
              </Link>
            ))}
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#f0f3ec] pb-4">
              <div>
                <h3 className="text-base font-bold text-[#18201c]">Partner Restaurants</h3>
                <p className="text-xs text-[#737e77]">Live settlement snapshot</p>
              </div>
              <Link href="/admin/vendor-settlements" className="text-xs font-bold text-[#86a018]">
                View all
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {topRestaurants.length === 0 ? (
                <p className="text-sm text-gray-500">No restaurant data is available yet.</p>
              ) : (
                topRestaurants.map((restaurant, index) => {
                  const commission = Math.round(
                    (restaurant.grossSales * restaurant.commissionRate) / 100
                  )
                  return (
                    <div key={`${restaurant.name}-${index}`} className="rounded-2xl bg-gray-50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-bold text-[#18201c]">{restaurant.name}</span>
                        <span className="text-xs font-bold text-emerald-700">
                          ₹{restaurant.grossSales.toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-gray-500">
                        {restaurant.commissionRate}% cut · ₹{commission.toLocaleString()} commission
                      </p>
                    </div>
                  )
                })
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#f0f3ec] pb-4">
              <h3 className="text-base font-bold text-[#18201c]">User Distribution</h3>
              <Link href="/admin/users" className="text-xs font-bold text-[#86a018]">
                Manage users
              </Link>
            </div>
            <div className="mt-4 space-y-4">
              <RoleBar label="Customers" count={customerCount} color="emerald" />
              <RoleBar label="Vendors" count={vendorCount} color="amber" />
              <RoleBar label="Drivers" count={driverCount} color="blue" />
            </div>
          </section>

          <section className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#f0f3ec] pb-4">
              <h3 className="text-base font-bold text-[#18201c]">Quick Actions</h3>
              <ShieldCheck className="size-5 text-[#859d19]" />
            </div>
            <div className="mt-4 flex flex-col gap-3 text-sm">
              <Link
                href="/admin/users"
                className="rounded-2xl bg-[#f8f9f7] p-3 font-semibold text-[#18201c] hover:bg-[#eef2e9]"
              >
                Review user accounts
              </Link>
              <Link
                href="/admin/payments"
                className="rounded-2xl bg-[#f8f9f7] p-3 font-semibold text-[#18201c] hover:bg-[#eef2e9]"
              >
                Review payment references
              </Link>
              <Link
                href="/admin/settings"
                className="rounded-2xl bg-[#f8f9f7] p-3 font-semibold text-[#18201c] hover:bg-[#eef2e9]"
              >
                Update platform settings
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({
  title,
  value,
  accent,
  icon,
  note,
}: {
  title: string
  value: string
  accent: 'purple' | 'emerald' | 'amber' | 'blue'
  icon: React.ReactNode
  note: string
}) {
  const colors = {
    purple: 'bg-purple-100 text-purple-800',
    emerald: 'bg-emerald-100 text-emerald-800',
    amber: 'bg-amber-100 text-amber-800',
    blue: 'bg-blue-100 text-blue-800',
  }

  return (
    <div className="rounded-3xl border border-[#dfe4dc] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
          {title}
        </span>
        <span className={`grid size-9 place-items-center rounded-2xl ${colors[accent]}`}>
          {icon}
        </span>
      </div>
      <p className="mt-4 text-2xl font-bold text-[#18201c]">{value}</p>
      <p className="mt-2 flex items-center gap-1 text-xs font-bold text-emerald-600">
        <TrendingUp className="size-3.5" /> {note}
      </p>
    </div>
  )
}

function RoleBar({
  label,
  count,
  color,
}: {
  label: string
  count: number
  color: 'emerald' | 'amber' | 'blue'
}) {
  const colors = {
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    blue: 'bg-blue-500',
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs font-semibold text-gray-700">
        <span>{label}</span>
        <span>{count}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full ${colors[color]}`}
          style={{ width: count ? '100%' : '0%' }}
        />
      </div>
    </div>
  )
}
