'use client'

import Link from 'next/link'
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  CreditCard,
  DollarSign,
  LayoutDashboard,
  QrCode,
  Settings,
  ShieldCheck,
  Store,
  Tag,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react'

const KPI_ITEMS = [
  {
    label: 'Total Network Sales',
    value: '₹4,28,900',
    change: '+24% growth this week',
    icon: DollarSign,
    tint: 'bg-purple-100 text-purple-800',
    text: 'text-[#18201c]',
    changeColor: 'text-emerald-600',
  },
  {
    label: 'Active Registered Users',
    value: '12,480',
    change: 'Across 4 ecosystem roles',
    icon: Users,
    tint: 'bg-blue-100 text-blue-800',
    text: 'text-[#18201c]',
    changeColor: 'text-[#737e77]',
  },
  {
    label: 'Verified Kitchens',
    value: '340 Partners',
    change: '2 awaiting approval',
    icon: Store,
    tint: 'bg-amber-100 text-amber-800',
    text: 'text-amber-700',
    changeColor: 'text-[#737e77]',
  },
  {
    label: 'Delivery Fleet',
    value: '185 Active',
    change: '94% fleet health',
    icon: Zap,
    tint: 'bg-emerald-100 text-emerald-800',
    text: 'text-emerald-700',
    changeColor: 'text-[#737e77]',
  },
]

const ADMIN_SECTION_LINKS = [
  {
    href: '/admin/analytics',
    label: 'Platform Analytics',
    description: 'View gross sales, orders, city performance, and campaign impact.',
    icon: BarChart3,
  },
  {
    href: '/admin/users',
    label: 'User Accounts',
    description: 'Manage customers, vendors, drivers, and admin access.',
    icon: Users,
  },
  {
    href: '/admin/payments',
    label: 'Payment Review Queue',
    description: 'Verify payment references and release vendor settlement approvals.',
    icon: CreditCard,
  },
  {
    href: '/admin/coupons',
    label: 'Coupons & Discounts',
    description: 'Launch promos, loyalty offers, and vendor campaign rules.',
    icon: Tag,
  },
  {
    href: '/admin/vendor-settlements',
    label: 'Vendor Settlements',
    description: 'Review vendor payouts, gross sales, and commission splits.',
    icon: Store,
  },
  {
    href: '/admin/payment-config',
    label: 'Payment Configs (UPI)',
    description: 'Manage UPI configuration and payment routing rules.',
    icon: QrCode,
  },
  {
    href: '/admin/system',
    label: 'System Health Logs',
    description: 'Monitor API uptime, security checks, and live service health.',
    icon: Activity,
  },
  {
    href: '/admin/settings',
    label: 'Admin Settings',
    description: 'Update platform rules, fees, permissions, and security policies.',
    icon: Settings,
  },
]

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
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
        {KPI_ITEMS.map(({ label, value, change, icon: Icon, tint, text, changeColor }) => (
          <div
            key={label}
            className="rounded-3xl border border-[#e2e7dc] bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#737e77]">
                {label}
              </span>
              <span className={`grid size-8 place-items-center rounded-xl ${tint}`}>
                <Icon className="size-4" />
              </span>
            </div>
            <p className={`mt-3 text-3xl font-bold ${text}`}>{value}</p>
            <p className={`mt-1 flex items-center gap-1 text-xs ${changeColor}`}>
              <TrendingUp className="size-3.5" /> {change}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3 border-b border-[#f0f3ec] pb-4">
            <div>
              <h3 className="text-lg font-bold text-[#18201c]">Management Modules</h3>
              <p className="text-xs text-[#737e77]">Each section now has its own dedicated page.</p>
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
        </div>

        <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#f0f3ec] pb-4">
            <h3 className="text-lg font-bold text-[#18201c]">Quick Actions</h3>
            <ShieldCheck className="size-5 text-[#859d19]" />
          </div>

          <div className="mt-4 flex flex-col gap-3 text-sm">
            <Link href="/admin/users" className="rounded-2xl bg-[#f8f9f7] p-3 font-semibold text-[#18201c] hover:bg-[#eef2e9]">
              Add or review user accounts
            </Link>
            <Link href="/admin/payments" className="rounded-2xl bg-[#f8f9f7] p-3 font-semibold text-[#18201c] hover:bg-[#eef2e9]">
              Review pending payment references
            </Link>
            <Link href="/admin/settings" className="rounded-2xl bg-[#f8f9f7] p-3 font-semibold text-[#18201c] hover:bg-[#eef2e9]">
              Update platform settings
            </Link>
            <Link href="/admin/system" className="rounded-2xl bg-[#f8f9f7] p-3 font-semibold text-[#18201c] hover:bg-[#eef2e9]">
              Check live system health
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
