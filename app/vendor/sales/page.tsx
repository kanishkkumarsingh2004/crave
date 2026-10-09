'use client'

import VendorSidebar from '@/components/VendorSidebar'
import { useAuth } from '@/lib/auth-context'
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  DollarSign,
  Landmark,
  Percent,
  Search,
  TrendingUp,
  Wallet,
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

interface SettlementSummary {
  total_gross_sales: number
  total_commission: number
  total_net_payable: number
  total_settled_amount: number
  remaining_balance: number
}

export default function VendorSalesPage() {
  const { user, role, isLoading, logout } = useAuth()
  const router = useRouter()

  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [settlementsHistory, setSettlementsHistory] = useState<SettlementRecord[]>([])
  const [summaryData, setSummaryData] = useState<SettlementSummary | null>(null)
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
          setSummaryData(null)
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

        if (settlementData.summary) {
          setSummaryData(settlementData.summary)
        }

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
        setSummaryData(null)
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

  // Aggregate financial metrics from orders or settlements
  const ordersGross = orders.reduce((sum, o) => sum + Number(o.subtotal || o.total_amount || 0), 0)
  const settlementsGross = settlementsHistory.reduce((sum, s) => sum + Number(s.grossSales || 0), 0)
  const totalGrossSales = ordersGross > 0 ? ordersGross : settlementsGross

  const settlementsCommission = settlementsHistory.reduce(
    (sum, s) => sum + Number(s.commissionAmount || 0),
    0
  )
  const ordersCommission = orders.reduce(
    (sum, o) =>
      sum + Math.round((Number(o.subtotal || o.total_amount || 0) * commissionRate) / 100),
    0
  )
  const calculatedCommission = Math.round((totalGrossSales * commissionRate) / 100)
  const totalCommission =
    ordersGross > 0
      ? ordersCommission > 0
        ? ordersCommission
        : calculatedCommission
      : settlementsCommission > 0
        ? settlementsCommission
        : calculatedCommission

  const settlementsNet = settlementsHistory.reduce((sum, s) => sum + Number(s.netPayout || 0), 0)
  const ordersNet = ordersGross - totalCommission
  const totalNetEarnings =
    ordersGross > 0
      ? ordersNet
      : settlementsNet > 0
        ? settlementsNet
        : totalGrossSales - totalCommission

  // Calculate Settled Price (Disbursed Amount) & Remaining Settlement Price (Pending Balance)
  const totalSettledAmount =
    summaryData?.total_settled_amount ??
    settlementsHistory
      .filter((s) => s.status === 'paid' || s.status === 'settled')
      .reduce((sum, s) => sum + Number(s.netPayout || 0), 0)

  const remainingSettlementBalance = Math.max(0, totalNetEarnings - totalSettledAmount)

  const totalRecordCount = orders.length > 0 ? orders.length : settlementsHistory.length

  const filteredOrders = orders.filter(
    (o) =>
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.customer_name && o.customer_name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="min-h-screen bg-[#0a0f0d] text-white pb-28 lg:pb-16 lg:pl-64 custom-scrollbar overflow-x-hidden w-full max-w-full">
      <VendorSidebar />

      <div className="mx-auto max-w-[1240px] w-full px-3.5 pt-6 sm:px-6 lg:px-8 space-y-6 min-w-0 overflow-hidden">
        {/* Sales Overview Banner */}
        <div className="rounded-3xl border border-[#233027] bg-gradient-to-r from-[#141b17] via-[#111614] to-[#18231c] p-4 sm:p-6 shadow-xl w-full min-w-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between min-w-0">
            <div className="min-w-0">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#d9f447]">
                Restaurant Financial Analytics
              </span>
              <h2 className="mt-1 text-2xl sm:text-3xl font-black text-white truncate">
                Sales Revenue &amp; Settlements
              </h2>
              <p className="text-xs text-gray-400 mt-0.5 truncate">
                Financial performance for{' '}
                <strong className="text-white">{user?.restaurantName || 'Your restaurant'}</strong>
              </p>
            </div>
            <Link
              href="/vendor/settings"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#d9f447] px-5 py-2.5 text-xs font-black text-[#0d1310] shadow-md hover:bg-[#c8e434] active:scale-95 transition shrink-0 self-start sm:self-auto"
            >
              Manage Payout Bank Details <ArrowUpRight className="size-3.5 text-[#0d1310]" />
            </Link>
          </div>
        </div>

        {/* 5 Financial Summary KPI Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5 w-full min-w-0">
          {/* Card 1: Gross Sales */}
          <div className="rounded-2xl sm:rounded-3xl border border-[#222e27] bg-[#121815] p-3.5 sm:p-4 shadow-lg hover:border-[#d9f447]/40 transition-all min-w-0 overflow-hidden">
            <div className="flex items-center justify-between gap-1 min-w-0">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 truncate">
                Gross Sales
              </span>
              <div className="grid size-7 sm:size-8 place-items-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
                <DollarSign className="size-3.5" />
              </div>
            </div>
            <p className="mt-2.5 text-lg sm:text-2xl font-black tracking-tight text-white truncate">
              ₹{totalGrossSales.toLocaleString()}
            </p>
            <p className="text-[10px] text-gray-400 mt-1 truncate">
              Across {totalRecordCount} {orders.length > 0 ? 'orders' : 'records'}
            </p>
          </div>

          {/* Card 2: Platform Cut */}
          <div className="rounded-2xl sm:rounded-3xl border border-[#222e27] bg-[#121815] p-3.5 sm:p-4 shadow-lg hover:border-[#d9f447]/40 transition-all min-w-0 overflow-hidden">
            <div className="flex items-center justify-between gap-1 min-w-0">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 truncate">
                Platform Cut ({commissionRate}%)
              </span>
              <div className="grid size-7 sm:size-8 place-items-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                <Percent className="size-3.5" />
              </div>
            </div>
            <p className="mt-2.5 text-lg sm:text-2xl font-black tracking-tight text-amber-400 truncate">
              -₹{totalCommission.toLocaleString()}
            </p>
            <p className="text-[10px] text-gray-400 mt-1 truncate">Commission cut</p>
          </div>

          {/* Card 3: Net Vendor Payout */}
          <div className="rounded-2xl sm:rounded-3xl border border-[#222e27] bg-[#121815] p-3.5 sm:p-4 shadow-lg hover:border-[#d9f447]/40 transition-all min-w-0 overflow-hidden">
            <div className="flex items-center justify-between gap-1 min-w-0">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 truncate">
                Net Vendor Payout
              </span>
              <div className="grid size-7 sm:size-8 place-items-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                <TrendingUp className="size-3.5" />
              </div>
            </div>
            <p className="mt-2.5 text-lg sm:text-2xl font-black tracking-tight text-blue-400 truncate">
              ₹{totalNetEarnings.toLocaleString()}
            </p>
            <p className="text-[10px] text-gray-400 mt-1 truncate">Total net earnings</p>
          </div>

          {/* NEW Card 4: Settled Price (Disbursed Payout) */}
          <div className="rounded-2xl sm:rounded-3xl border border-emerald-500/30 bg-[#121815] p-3.5 sm:p-4 shadow-lg hover:border-emerald-400/60 transition-all min-w-0 overflow-hidden">
            <div className="flex items-center justify-between gap-1 min-w-0">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 truncate">
                Settled Price
              </span>
              <div className="grid size-7 sm:size-8 place-items-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                <CheckCircle2 className="size-3.5" />
              </div>
            </div>
            <p className="mt-2.5 text-lg sm:text-2xl font-black tracking-tight text-[#d9f447] truncate">
              ₹{totalSettledAmount.toLocaleString()}
            </p>
            <p className="text-[10px] text-emerald-400 font-semibold mt-1 truncate">
              Transferred to bank
            </p>
          </div>

          {/* NEW Card 5: Remaining Settlement Price (Pending Balance) */}
          <div className="rounded-2xl sm:rounded-3xl border border-amber-500/30 bg-[#121815] p-3.5 sm:p-4 shadow-lg hover:border-amber-400/60 transition-all min-w-0 overflow-hidden col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between gap-1 min-w-0">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 truncate">
                Remaining Settlement Price
              </span>
              <div className="grid size-7 sm:size-8 place-items-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                <Clock3 className="size-3.5" />
              </div>
            </div>
            <p className="mt-2.5 text-lg sm:text-2xl font-black tracking-tight text-amber-400 truncate">
              ₹{remainingSettlementBalance.toLocaleString()}
            </p>
            <p className="text-[10px] text-amber-300/80 mt-1 truncate">Awaiting payout release</p>
          </div>
        </div>
      </div>
    </div>
  )
}
