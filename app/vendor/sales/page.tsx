'use client'

import VendorSidebar from '@/components/VendorSidebar'
import { useAuth } from '@/lib/auth-context'
import { ArrowUpRight, Clock3, DollarSign, Percent, Search, TrendingUp } from 'lucide-react'
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
        const resResp = await fetch(`/api/restaurants?ownerId=${encodeURIComponent(user.id)}`)
        const resData = await resResp.json()
        const restaurant = resData.restaurants?.[0]
        if (!restaurant) {
          setRestaurantId(null)
          setOrders([])
          setSettlementsHistory([])
          return
        }

        setRestaurantId(restaurant.id)
        setCommissionRate(Number(restaurant.commission_rate ?? 0))

        const [orderResp, settlementResp] = await Promise.all([
          fetch(`/api/orders?vendorId=${encodeURIComponent(restaurant.id)}`),
          fetch(`/api/admin/settlements?vendorId=${encodeURIComponent(restaurant.id)}`),
        ])

        const orderData = await orderResp.json()
        const settlementData = await settlementResp.json()

        const ordersList = orderData.orders ?? []
        setOrders(ordersList)

        const rawSettlements = settlementData.settlements ?? []
        setSettlementsHistory(
          rawSettlements.map((settlement: any) => ({
            id: settlement.id,
            period:
              settlement.period_start && settlement.period_end
                ? `${typeof settlement.period_start === 'string' ? settlement.period_start.split('T')[0] : settlement.period_start} – ${typeof settlement.period_end === 'string' ? settlement.period_end.split('T')[0] : settlement.period_end}`
                : settlement.payout_date
                  ? typeof settlement.payout_date === 'string'
                    ? settlement.payout_date.split('T')[0]
                    : settlement.payout_date
                  : '',
            grossSales: Number(settlement.gross_sales ?? 0),
            commissionRate: Number(settlement.commission_rate ?? 0),
            commissionAmount: Number(settlement.commission_amount ?? 0),
            netPayout: Number(settlement.net_payout ?? 0),
            status: settlement.status ?? '',
            payoutDate: settlement.payout_date
              ? typeof settlement.payout_date === 'string'
                ? settlement.payout_date.split('T')[0]
                : settlement.payout_date
              : '',
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
      <div className="min-h-screen bg-[#0a0f0d] flex items-center justify-center p-4">
        <div className="size-8 border-4 border-[#d9f447] border-t-transparent rounded-full animate-spin" />
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
    <div className="min-h-screen bg-[#0a0f0d] text-white pb-16 lg:pl-64 custom-scrollbar">
      <VendorSidebar />

      <div className="mx-auto max-w-[1240px] px-4 pt-6 sm:px-6 lg:px-8 space-y-6">
        {/* Sales Overview Banner */}
        <div className="rounded-3xl border border-[#233027] bg-gradient-to-r from-[#141b17] via-[#111614] to-[#18231c] p-6 shadow-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#d9f447]">
                Restaurant Financial Analytics
              </span>
              <h2 className="mt-1 text-2xl sm:text-3xl font-black text-white">
                Sales Revenue &amp; Settlements
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Financial performance for{' '}
                <strong className="text-white">{user?.restaurantName || 'Your restaurant'}</strong>
              </p>
            </div>
            <Link
              href="/vendor/settings"
              className="inline-flex items-center gap-2 rounded-full bg-[#d9f447] px-6 py-3 text-xs font-black text-[#0d1310] shadow-md hover:bg-[#c8e434] active:scale-95 transition"
            >
              Manage Payout Bank Details <ArrowUpRight className="size-3.5 text-[#0d1310]" />
            </Link>
          </div>
        </div>

        {/* 4 Financial KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-[#222e27] bg-[#121815] p-5 shadow-lg hover:border-[#d9f447]/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                Gross Sales
              </span>
              <div className="grid size-9 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <DollarSign className="size-4" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-black tracking-tight text-white">₹{totalGrossSales}</p>
            <p className="text-[11px] text-gray-400 mt-1">
              Total revenue across {orders.length} orders
            </p>
          </div>

          <div className="rounded-3xl border border-[#222e27] bg-[#121815] p-5 shadow-lg hover:border-[#d9f447]/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                Platform Commission ({commissionRate}%)
              </span>
              <div className="grid size-9 place-items-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Percent className="size-4" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-black tracking-tight text-amber-400">
              -₹{totalCommission}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">
              Rate loaded from the restaurant profile
            </p>
          </div>

          <div className="rounded-3xl border border-[#222e27] bg-[#121815] p-5 shadow-lg hover:border-[#d9f447]/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                Net Vendor Payout
              </span>
              <div className="grid size-9 place-items-center rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <TrendingUp className="size-4" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-black tracking-tight text-[#d9f447]">
              ₹{totalNetEarnings}
            </p>
            <p className="text-[11px] text-emerald-400 font-semibold mt-1">
              Transferrable to bank account
            </p>
          </div>

          <div className="rounded-3xl border border-[#222e27] bg-[#121815] p-5 shadow-lg hover:border-[#d9f447]/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                Settlement Schedule
              </span>
              <div className="grid size-9 place-items-center rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Clock3 className="size-4" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-black tracking-tight text-white">
              {
                orders.filter(
                  (order) => order.status === 'completed' || order.status === 'delivered'
                ).length
              }
            </p>
            <p className="text-[11px] text-gray-400 mt-1">Completed orders in database</p>
          </div>
        </div>

        {/* Weekly Settlement Transfers Table */}
        <div className="rounded-3xl border border-[#222e27] bg-[#121815] p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#202b24] pb-4">
            <div>
              <h3 className="text-lg font-black text-white">Weekly Bank Settlements History</h3>
              <p className="text-xs text-gray-400">
                Payout records transferred to your registered bank account
              </p>
            </div>
            <span className="rounded-full bg-[#1c2620] border border-[#28372e] px-3 py-1 text-[10px] font-bold text-gray-300">
              {settlementsHistory.length} records
            </span>
          </div>

          <div className="overflow-x-auto no-scrollbar rounded-2xl border border-[#222e27]">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="border-b border-[#222e27] text-[10px] uppercase tracking-wider text-gray-400 font-extrabold bg-[#18201c]">
                <tr>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Gross Sales</th>
                  <th className="py-3 px-4">Commission</th>
                  <th className="py-3 px-4">Net Payout</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Bank Ref UTR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222e27] bg-[#171f1b]">
                {settlementsHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400 bg-[#121815]">
                      No settlement records are stored for this restaurant.
                    </td>
                  </tr>
                ) : (
                  settlementsHistory.map((s) => (
                    <tr key={s.id} className="hover:bg-[#1c2620] transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white">{s.period || '—'}</td>
                      <td className="py-3.5 px-4 font-semibold text-gray-300">₹{s.grossSales}</td>
                      <td className="py-3.5 px-4 text-rose-400 font-semibold">
                        -₹{s.commissionAmount}
                      </td>
                      <td className="py-3.5 px-4 font-black text-[#d9f447]">₹{s.netPayout}</td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#1c2620] border border-[#28372e] px-2.5 py-0.5 text-[10px] font-bold text-gray-300">
                          {s.status || 'Status unavailable'}
                          {s.payoutDate ? ` · ${s.payoutDate}` : ''}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-gray-400">
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
        <div className="rounded-3xl border border-[#222e27] bg-[#121815] p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#202b24] pb-4">
            <div>
              <h3 className="text-lg font-black text-white">Individual Customer Orders</h3>
              <p className="text-xs text-gray-400">Breakdown of orders and earnings</p>
            </div>

            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3.5 top-2.5 size-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search order ID or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-full border border-[#233228] bg-[#141c17] py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 outline-none focus:border-[#d9f447]"
              />
            </div>
          </div>

          <div className="overflow-x-auto no-scrollbar rounded-2xl border border-[#222e27]">
            {filteredOrders.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400 bg-[#121815]">
                No orders match your search query.
              </div>
            ) : (
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="border-b border-[#222e27] text-[10px] uppercase tracking-wider text-gray-400 font-extrabold bg-[#18201c]">
                  <tr>
                    <th className="py-3 px-4">Order ID</th>
                    <th className="py-3 px-4">Customer Name</th>
                    <th className="py-3 px-4">Date &amp; Time</th>
                    <th className="py-3 px-4">Order Amount</th>
                    <th className="py-3 px-4">Net Share</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222e27] bg-[#171f1b]">
                  {filteredOrders.map((o) => {
                    const gross = Number(o.subtotal || 0)
                    const net = Math.round(gross * (1 - commissionRate / 100))
                    return (
                      <tr key={o.id} className="hover:bg-[#1c2620] transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-gray-300">#{o.id}</td>
                        <td className="py-3.5 px-4 font-extrabold text-white">
                          {o.customer_name || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-gray-400">
                          {o.created_at
                            ? new Date(o.created_at).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-white">₹{gross}</td>
                        <td className="py-3.5 px-4 font-black text-[#d9f447]">₹{net}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                              o.status === 'completed' ||
                              o.status === 'delivered' ||
                              o.status === 'ready'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
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
