'use client'

import { useLanguage } from '@/lib/language-context'
import { useAdminStatsUpdates } from '@/lib/websocket'
import {
  ArrowUpRight,
  BarChart3,
  CreditCard,
  DollarSign,
  LayoutDashboard,
  PackageCheck,
  Percent,
  QrCode,
  Radio,
  ShieldCheck,
  Store,
  Tag,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function AdminDashboardPage() {
  const { t } = useLanguage()
  const [weeklyGross, setWeeklyGross] = useState(0)
  const [totalCommission, setTotalCommission] = useState(0)
  const [netVendorPay, setNetVendorPay] = useState(0)
  const [customerCount, setCustomerCount] = useState(0)
  const [vendorCount, setVendorCount] = useState(0)
  const [driverCount, setDriverCount] = useState(0)
  const [allTimeOrders, setAllTimeOrders] = useState(0)
  const [liveNotice, setLiveNotice] = useState<string | null>(null)
  const [topRestaurants, setTopRestaurants] = useState<
    { name: string; grossSales: number; commissionRate: number }[]
  >([])

  const loadDashboardData = async () => {
    try {
      const res = await fetch('/api/admin/stats', { cache: 'no-store' })
      const json = await res.json()
      if (json.success) {
        setWeeklyGross(json.stats.weeklyRevenue ?? 0)
        setTotalCommission(json.stats.totalCommission ?? 0)
        setNetVendorPay(json.stats.netVendorPay ?? 0)
        setCustomerCount(json.stats.customerCount ?? 0)
        setVendorCount(json.stats.vendorCount ?? 0)
        setDriverCount(json.stats.driverCount ?? 0)
        setAllTimeOrders(json.stats.orderCount ?? 0)
        if (json.restaurants && json.restaurants.length > 0) {
          setTopRestaurants(
            json.restaurants.slice(0, 4).map((restaurant: any) => ({
              name: restaurant.name ?? 'Restaurant',
              grossSales: Number(restaurant.gross_sales ?? 0),
              commissionRate: Number(restaurant.commission_rate ?? 15),
            }))
          )
        } else {
          setTopRestaurants([])
        }
      }
    } catch (error) {
      console.error('Failed to load admin overview data:', error)
    }
  }

  // Subscribe to Live Server WebSocket Broadcast Stream (Zero Refresh Real-Time Server Updates)
  useAdminStatsUpdates((data) => {
    if (!data) return

    if (data.type === 'user_signup') {
      const role = data.role || data.user?.role || 'user'
      setLiveNotice(
        `⚡ LIVE SERVER EVENT: New ${role} registered (${data.user?.name || 'User'}) — Admin count updated live!`
      )
    } else if (data.type === 'order_created') {
      setLiveNotice('⚡ LIVE SERVER EVENT: New order created — Order count updated live!')
    } else if (data.type === 'db_wiped') {
      setLiveNotice('⚡ LIVE SERVER EVENT: Database reset — Stats synced live!')
    }
    loadDashboardData()
  })

  useEffect(() => {
    loadDashboardData()
  }, [])

  const sectionLinks = [
    {
      href: '/vendor/crave-ep',
      label: t.admin.craveXpHub || 'craveXP Hub',
      description:
        t.admin.craveXpDesc ||
        'Manage 10-min grocery inventory, cold-chain IoT, pickers & barcode dispatch.',
      icon: Zap,
    },
    {
      href: '/user/cravexp',
      label: t.admin.craveXpStore || 'craveXP Instamart Store',
      description:
        t.admin.craveXpStoreDesc ||
        'Browse live 10-minute grocery catalog & customer ordering experience.',
      icon: Store,
    },
    {
      href: '/admin/analytics',
      label: t.admin.platformAnalytics || 'Platform Analytics',
      description: 'Review revenue, orders, and platform performance.',
      icon: BarChart3,
    },
    {
      href: '/admin/payments',
      label: t.admin.paymentReviewQueue || 'Payment Review Queue',
      description: 'Verify payment references and payment status.',
      icon: CreditCard,
    },
    {
      href: '/admin/users',
      label: t.admin.userAccounts || 'User Accounts',
      description: 'Manage customer, vendor, driver, and admin access.',
      icon: Users,
    },
    {
      href: '/admin/coupons',
      label: t.admin.couponsDiscounts || 'Coupons & Discounts',
      description: 'Manage promotions and campaign rules.',
      icon: Tag,
    },
    {
      href: '/admin/vendor-settlements',
      label: t.admin.vendorSettlements || 'Vendor Settlements',
      description: 'Review payouts, sales, and commission splits.',
      icon: Store,
    },
    {
      href: '/admin/payment-config',
      label: t.admin.paymentConfigs || 'Payment Configs',
      description: 'Manage UPI configuration and payment routing.',
      icon: QrCode,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Live Server WebSocket Event Banner */}
      {liveNotice && (
        <div className="rounded-2xl border border-emerald-500/50 bg-[#121815] p-4 text-white shadow-xl flex items-center justify-between animate-in fade-in duration-300">
          <div className="flex items-center gap-2.5">
            <span className="relative flex size-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-3 rounded-full bg-emerald-500" />
            </span>
            <p className="text-xs sm:text-sm font-extrabold text-emerald-300">{liveNotice}</p>
          </div>
          <button
            onClick={() => setLiveNotice(null)}
            className="text-xs font-bold text-gray-400 hover:text-white px-2 py-1 rounded bg-white/10"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Overview Cards - Fully Mobile Responsive 2-Column Grid on Small Mobile */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <SummaryCard
          title={t.admin.weeklyGross || 'Weekly Gross'}
          value={`₹${weeklyGross.toLocaleString()}`}
          accent="purple"
          icon={<DollarSign className="size-3.5 sm:size-4" />}
          note={t.admin.liveData || 'Live Supabase data'}
        />
        <SummaryCard
          title={t.admin.platformCommission || 'Platform Commission'}
          value={`₹${totalCommission.toLocaleString()}`}
          accent="emerald"
          icon={<Percent className="size-3.5 sm:size-4" />}
          note={t.admin.settlementRevenue || 'Settlement revenue'}
        />
        <SummaryCard
          title={t.admin.netVendorPay || 'Net Vendor Pay'}
          value={`₹${netVendorPay.toLocaleString()}`}
          accent="amber"
          icon={<Store className="size-3.5 sm:size-4" />}
          note={t.admin.vendorSettlementNote || 'Vendor settlements'}
        />
        <SummaryCard
          title={t.admin.deliveryFleet || 'Delivery Fleet'}
          value={`${driverCount} ${t.admin.drivers?.toLowerCase() || 'drivers'}`}
          accent="blue"
          icon={<Zap className="size-3.5 sm:size-4" />}
          note={t.admin.registeredRiders || 'Registered riders'}
        />
        <SummaryCard
          title={t.admin.totalCustomers || 'Total Customers'}
          value={`${customerCount} ${t.admin.customers?.toLowerCase() || 'active'}`}
          accent="indigo"
          icon={<Users className="size-3.5 sm:size-4" />}
          note={t.admin.registeredCustomers || 'Registered customers'}
        />
        <SummaryCard
          title={t.admin.totalOrders || 'All-Time Orders'}
          value={`${allTimeOrders.toLocaleString()}`}
          accent="violet"
          icon={<PackageCheck className="size-3.5 sm:size-4" />}
          note={t.admin.lifetimeOrders || 'Lifetime orders'}
        />
      </div>

      {/* CRAVEXP LIVE OPERATIONS BANNER */}
      <div className="rounded-3xl border border-[#d9f447]/60 bg-gradient-to-r from-[#18201c] to-[#25322b] p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#d9f447]/20 border border-[#d9f447]/40 px-3 py-1 text-[10px] font-extrabold text-[#d9f447] uppercase tracking-wider">
            <Zap className="size-3.5 fill-[#d9f447]" />{' '}
            {t.admin.cravexpCommandCenter || 'craveXP Command Center'}
          </div>
          <h3 className="text-xl font-extrabold tracking-tight text-white">
            {t.admin.cravexpFleetMonitoring || '10-Minute Fleet & IoT Cold-Chain Monitoring'}
          </h3>
          <p className="text-xs text-[#a3b3a9] leading-relaxed">
            {t.admin.cravexpDesc ||
              '4 active fulfillment hubs • 98.6% SLA speed compliance • Live picker staff leaderboard & auto-replenishment active.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="rounded-2xl bg-white/10 backdrop-blur px-4 py-2.5 text-center border border-white/10">
            <p className="text-[10px] text-gray-300 font-bold uppercase">
              {t.admin.avgPickTime || 'Avg Pick Time'}
            </p>
            <p className="text-base font-black text-[#d9f447]">1m 42s</p>
          </div>
          <div className="rounded-2xl bg-white/10 backdrop-blur px-4 py-2.5 text-center border border-white/10">
            <p className="text-[10px] text-gray-300 font-bold uppercase">
              {t.admin.coldChainTemp || 'Cold-Chain Temp'}
            </p>
            <p className="text-base font-black text-emerald-400">3.2°C Nominal</p>
          </div>
          <Link
            href="/vendor/crave-ep"
            className="rounded-full bg-[#d9f447] px-5 py-3 text-xs font-black text-[#121815] shadow-lg hover:bg-[#c2dc37] transition hover:scale-105 active:scale-95 flex items-center gap-1.5"
          >
            {t.admin.manageCravexpConsole || 'Manage craveXP Console'}{' '}
            <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3 border-b border-[#f0f3ec] dark:border-[#27342d] pb-4">
            <div>
              <h3 className="text-lg font-bold text-[#18201c] dark:text-white">
                {t.admin.managementModules || 'Management Modules'}
              </h3>
              <p className="text-xs text-[#737e77] dark:text-gray-400">
                {t.admin.managementModulesDesc || 'Each section has its own dedicated page.'}
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#f1f6d9] dark:bg-[#d9f447]/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#6a8014] dark:text-[#d9f447]">
              <LayoutDashboard className="size-3.5" /> {t.admin.overview || 'Overview'}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {sectionLinks.map(({ href, label, description, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group rounded-2xl border border-[#e2e7dc] dark:border-[#27342d] bg-[#f8f9f7] dark:bg-[#121815] p-4 transition hover:-translate-y-0.5 hover:border-[#cdd7c4] dark:hover:border-[#384a40] hover:bg-white dark:hover:bg-[#1a221d]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-xl bg-[#18201c] dark:bg-[#d9f447] text-[#d9f447] dark:text-[#121815]">
                      <Icon className="size-4" />
                    </span>
                    <span className="text-sm font-bold text-[#18201c] dark:text-white">
                      {label}
                    </span>
                  </div>
                  <ArrowUpRight className="size-4 text-[#6a8014] dark:text-[#d9f447] transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
                <p className="mt-3 text-xs leading-relaxed text-[#737e77] dark:text-gray-400">
                  {description}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#f0f3ec] dark:border-[#27342d] pb-4">
              <div>
                <h3 className="text-base font-bold text-[#18201c] dark:text-white">
                  {t.admin.partnerRestaurants || 'Partner Restaurants'}
                </h3>
                <p className="text-xs text-[#737e77] dark:text-gray-400">
                  {t.admin.liveSettlementSnapshot || 'Live settlement snapshot'}
                </p>
              </div>
              <Link
                href="/admin/vendor-settlements"
                className="text-xs font-bold text-[#86a018] dark:text-[#d9f447]"
              >
                {t.common.viewAll || 'View all'}
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {topRestaurants.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t.common.noData || 'No restaurant data is available yet.'}
                </p>
              ) : (
                topRestaurants.map((restaurant, index) => {
                  const commission = Math.round(
                    (restaurant.grossSales * restaurant.commissionRate) / 100
                  )
                  return (
                    <div
                      key={`${restaurant.name}-${index}`}
                      className="rounded-2xl bg-gray-50 dark:bg-[#121815] border border-transparent dark:border-[#27342d] p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-bold text-[#18201c] dark:text-white">
                          {restaurant.name}
                        </span>
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                          ₹{restaurant.grossSales.toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                        {restaurant.commissionRate}% cut · ₹{commission.toLocaleString()} commission
                      </p>
                    </div>
                  )
                })
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#f0f3ec] dark:border-[#27342d] pb-4">
              <h3 className="text-base font-bold text-[#18201c] dark:text-white">
                {t.admin.userDistribution || 'User Distribution'}
              </h3>
              <Link
                href="/admin/users"
                className="text-xs font-bold text-[#86a018] dark:text-[#d9f447]"
              >
                {t.admin.manageUsers || 'Manage users'}
              </Link>
            </div>
            <div className="mt-4 space-y-4">
              <RoleBar
                label={t.admin.customers || 'Customers'}
                count={customerCount}
                color="emerald"
              />
              <RoleBar label={t.admin.vendors || 'Vendors'} count={vendorCount} color="amber" />
              <RoleBar label={t.admin.drivers || 'Drivers'} count={driverCount} color="blue" />
            </div>
          </section>

          <section className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#f0f3ec] dark:border-[#27342d] pb-4">
              <h3 className="text-base font-bold text-[#18201c] dark:text-white">
                {t.admin.quickActions || 'Quick Actions'}
              </h3>
              <ShieldCheck className="size-5 text-[#859d19] dark:text-[#d9f447]" />
            </div>
            <div className="mt-4 flex flex-col gap-3 text-sm">
              <Link
                href="/admin/users"
                className="rounded-2xl bg-[#f8f9f7] dark:bg-[#121815] border border-transparent dark:border-[#27342d] p-3 font-semibold text-[#18201c] dark:text-white hover:bg-[#eef2e9] dark:hover:bg-[#1a221d]"
              >
                {t.admin.reviewUserAccounts || 'Review user accounts'}
              </Link>
              <Link
                href="/admin/payments"
                className="rounded-2xl bg-[#f8f9f7] dark:bg-[#121815] border border-transparent dark:border-[#27342d] p-3 font-semibold text-[#18201c] dark:text-white hover:bg-[#eef2e9] dark:hover:bg-[#1a221d]"
              >
                {t.admin.reviewPaymentReferences || 'Review payment references'}
              </Link>
              <Link
                href="/admin/settings"
                className="rounded-2xl bg-[#f8f9f7] dark:bg-[#121815] border border-transparent dark:border-[#27342d] p-3 font-semibold text-[#18201c] dark:text-white hover:bg-[#eef2e9] dark:hover:bg-[#1a221d]"
              >
                {t.admin.updatePlatformSettings || 'Update platform settings'}
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
  accent: 'purple' | 'emerald' | 'amber' | 'blue' | 'indigo' | 'violet'
  icon: React.ReactNode
  note: string
}) {
  const colors = {
    purple: 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300',
    emerald: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300',
    amber: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300',
    blue: 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300',
    indigo: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300',
    violet: 'bg-violet-100 dark:bg-violet-950/60 text-violet-800 dark:text-violet-300',
  }

  return (
    <div className="rounded-2xl sm:rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-3.5 sm:p-5 shadow-sm hover:shadow-md transition">
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">
          {title}
        </span>
        <span
          className={`grid size-7 sm:size-9 place-items-center rounded-xl sm:rounded-2xl ${colors[accent]} shrink-0`}
        >
          {icon}
        </span>
      </div>
      <p className="mt-2 sm:mt-4 text-base sm:text-2xl font-bold text-[#18201c] dark:text-white truncate">
        {value}
      </p>
      <p className="mt-1 flex items-center gap-1 text-[10px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400 truncate">
        <TrendingUp className="size-3 sm:size-3.5 shrink-0" />{' '}
        <span className="truncate">{note}</span>
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
      <div className="mb-1 flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-300">
        <span>{label}</span>
        <span>{count}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-[#121815]">
        <div
          className={`h-full rounded-full ${colors[color]}`}
          style={{ width: count ? '100%' : '0%' }}
        />
      </div>
    </div>
  )
}
