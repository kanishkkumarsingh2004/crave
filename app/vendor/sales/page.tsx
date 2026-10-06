'use client'

import VendorSidebar from '@/components/VendorSidebar'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import {
  ArrowUpRight,
  Clock3,
  DollarSign,
  Percent,
  Search,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface OrderRecord {
  id: string
  customer_name: string
  created_at: string
  subtotal: number
  total_amount: number
  status: string
  items: string
}

interface SettlementRecord {
  id: string
  period: string
  grossSales: number
  commissionRate: number
  commissionAmount: number
  netPayout: number
  status: string
  payoutDate: string
  transactionRef: string
}

export default function VendorSalesPage() {
  const { user, role, isLoading, logout } = useAuth()
  const router = useRouter()

  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [settlementsHistory, setSettlementsHistory] = useState<SettlementRecord[]>([])
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [commissionRate, setCommissionRate] = useState(0)
  const [salesError, setSalesError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.replace('/login')
    } else if (role !== 'vendor' && role !== 'restaurant_vendor') {
      router.replace(
        role === 'user' || role === 'customer'
          ? '/user/dashboard'
          : role === 'cravexp_store_vendor'
            ? '/vendor/crave-ep'
            : role === 'rider' || role === 'driver'
              ? '/driver/dashboard'
              : '/dashboard'
      )
    }
  }, [user, role, isLoading, router])

  useEffect(() => {
    async function loadSalesOrders() {
      if (!user?.id) return
      try {
        const { data: restaurant, error: restaurantError } = await supabase
          .from('restaurants')
          .select('id, commission_rate')
          .eq('owner_id', user.id)
          .maybeSingle()
        if (restaurantError) throw restaurantError
        if (!restaurant) {
          setRestaurantId(null)
          setOrders([])
          setSettlementsHistory([])
          return
        }

        setRestaurantId(restaurant.id)
        setCommissionRate(Number(restaurant.commission_rate ?? 0))
        const [orderResult, settlementResult] = await Promise.all([
          supabase
            .from('orders')
            .select('*')
            .eq('restaurant_id', restaurant.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('vendor_settlements')
            .select('*')
            .eq('restaurant_id', restaurant.id)
            .order('payout_date', { ascending: false }),
        ])
        if (orderResult.error) throw orderResult.error
        if (settlementResult.error) throw settlementResult.error

        setOrders((orderResult.data as any) ?? [])
        setSettlementsHistory(
          (settlementResult.data ?? []).map((settlement: any) => ({
            id: settlement.id,
            period:
              settlement.period_start && settlement.period_end
                ? `${settlement.period_start} – ${settlement.period_end}`
                : (settlement.payout_date ?? ''),
            grossSales: Number(settlement.gross_sales ?? 0),
            commissionRate: Number(settlement.commission_rate ?? 0),
            commissionAmount: Number(settlement.commission_amount ?? 0),
            netPayout: Number(settlement.net_payout ?? 0),
            status: settlement.status ?? '',
            payoutDate: settlement.payout_date ?? '',
            transactionRef: settlement.transaction_ref ?? '',
          }))
        )
      } catch (err) {
        console.error('Failed to load orders for sales:', err)
        setSalesError('Sales records could not be loaded from the database.')
        setOrders([])
        setSettlementsHistory([])
      }
    }
    loadSalesOrders()
  }, [user?.id])

  if (isLoading || !user || (role !== 'vendor' && role !== 'restaurant_vendor')) {
    return (
      <div className="min-h-screen bg-[#f8f9f7] flex items-center justify-center p-4">
        <div className="size-8 border-4 border-[#86a018] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const totalGrossSales = orders.reduce((sum, o) => sum + Number(o.subtotal || 0), 0)
  const totalCommission = Math.round((totalGrossSales * commissionRate) / 100)
  const totalNetEarnings = totalGrossSales - totalCommission

  const filteredOrders = orders.filter(
    (o) =>
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.customer_name && o.customer_name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="min-h-screen bg-[#f8f9f7] text-[#18201c] pb-16 lg:pl-64">
      <VendorSidebar />

      <div className="mx-auto max-w-[1240px] px-4 pt-6 sm:px-6 lg:px-8 space-y-6">
        {/* Sales Overview Banner */}
        <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#86a018]">
                Restaurant Financial Analytics
              </span>
              <h2 className="mt-1 text-2xl font-bold text-[#18201c]">
                Sales Revenue &amp; Settlements
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Financial performance for{' '}
                <strong className="text-[#18201c]">
                  {user?.restaurantName || 'Your restaurant'}
                </strong>
              </p>
            </div>
            <Link
              href="/vendor/settings"
              className="inline-flex items-center gap-2 rounded-full bg-[#18201c] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#323d36] transition"
            >
              Manage Payout Bank Details <ArrowUpRight className="size-3.5 text-[#d9f447]" />
            </Link>
          </div>
        </div>

        {/* 4 Financial KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Gross Sales
              </span>
              <div className="grid size-9 place-items-center rounded-2xl bg-emerald-50 text-emerald-800">
                <DollarSign className="size-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-[#18201c]">₹{totalGrossSales}</p>
            <p className="text-[11px] text-gray-500 mt-1">
              Total revenue across {orders.length} orders
            </p>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Platform Commission ({commissionRate}%)
              </span>
              <div className="grid size-9 place-items-center rounded-2xl bg-amber-50 text-amber-800">
                <Percent className="size-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-amber-900">-₹{totalCommission}</p>
            <p className="text-[11px] text-gray-500 mt-1">
              Rate loaded from the restaurant profile
            </p>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Net Vendor Payout
              </span>
              <div className="grid size-9 place-items-center rounded-2xl bg-blue-50 text-blue-800">
                <TrendingUp className="size-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-emerald-700">₹{totalNetEarnings}</p>
            <p className="text-[11px] text-emerald-700 font-semibold mt-1">
              Transferrable to bank account
            </p>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Settlement Schedule
              </span>
              <div className="grid size-9 place-items-center rounded-2xl bg-purple-50 text-purple-800">
                <Clock3 className="size-4" />
              </div>
            </div>
            <p className="mt-3 text-lg font-bold text-[#18201c]">
              {orders.filter((order) => order.status === 'completed').length}
            </p>
            <p className="text-[11px] text-gray-500 mt-1">Completed orders in database</p>
          </div>
        </div>

        {/* Weekly Settlement Transfers Table */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
            <div>
              <h3 className="text-lg font-bold text-[#18201c]">Weekly Bank Settlements History</h3>
              <p className="text-xs text-gray-500">
                Payout records transferred to your registered bank account
              </p>
            </div>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-[10px] font-bold text-gray-700">
              {settlementsHistory.length} records
            </span>
          </div>

          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-200 text-[10px] uppercase tracking-wider text-gray-400 font-bold bg-gray-50/50">
                <tr>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Gross Sales</th>
                  <th className="py-3 px-4">Commission</th>
                  <th className="py-3 px-4">Net Payout</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Bank Ref UTR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {settlementsHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      No settlement records are stored for this restaurant.
                    </td>
                  </tr>
                ) : (
                  settlementsHistory.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50/60 transition">
                      <td className="py-3.5 px-4 font-bold text-[#18201c]">{s.period || '—'}</td>
                      <td className="py-3.5 px-4 font-semibold text-gray-700">₹{s.grossSales}</td>
                      <td className="py-3.5 px-4 text-rose-600 font-semibold">
                        -₹{s.commissionAmount}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-700">₹{s.netPayout}</td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-bold text-gray-800">
                          {s.status || 'Status unavailable'}
                          {s.payoutDate ? ` · ${s.payoutDate}` : ''}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-gray-500">
                        {s.transactionRef || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Individual Order Transactions Table */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4 mb-4">
            <div>
              <h3 className="text-lg font-bold text-[#18201c]">Individual Customer Orders</h3>
              <p className="text-xs text-gray-500">Breakdown of orders and earnings</p>
            </div>

            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-2.5 size-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search order ID or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2 pl-9 pr-3 text-xs outline-none focus:border-[#86a018]"
              />
            </div>
          </div>

          <div className="overflow-x-auto no-scrollbar">
            {filteredOrders.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500 border border-dashed border-gray-200 rounded-2xl">
                No orders match your search query.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="border-b border-gray-200 text-[10px] uppercase tracking-wider text-gray-400 font-bold bg-gray-50/50">
                  <tr>
                    <th className="py-3 px-4">Order ID</th>
                    <th className="py-3 px-4">Customer Name</th>
                    <th className="py-3 px-4">Date &amp; Time</th>
                    <th className="py-3 px-4">Order Amount</th>
                    <th className="py-3 px-4">Net Share</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {filteredOrders.map((o) => {
                    const gross = Number(o.subtotal || 0)
                    const net = Math.round(gross * (1 - commissionRate / 100))
                    return (
                      <tr key={o.id} className="hover:bg-gray-50/60 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#18201c]">#{o.id}</td>
                        <td className="py-3.5 px-4 font-semibold text-[#18201c]">
                          {o.customer_name || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-gray-500">
                          {o.created_at
                            ? new Date(o.created_at).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[#18201c]">₹{gross}</td>
                        <td className="py-3.5 px-4 font-bold text-emerald-700">₹{net}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                              o.status === 'completed' || o.status === 'ready'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
