'use client'

import VendorSidebar from '@/components/VendorSidebar'
import { useAuth } from '@/lib/auth-context'
import { apiFetch } from '@/lib/client/api-fetch'
import { ArrowUpRight } from 'lucide-react'
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
  const { user, role, isLoading } = useAuth()
  const router = useRouter()

  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [settlementsHistory, setSettlementsHistory] = useState<SettlementRecord[]>([])
  const [summaryData, setSummaryData] = useState<SettlementSummary | null>(null)
  const [commissionRate, setCommissionRate] = useState(0)

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
          setOrders([])
          setSettlementsHistory([])
          setSummaryData(null)
          return
        }

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
        setOrders([])
        setSettlementsHistory([])
        setSummaryData(null)
      }
    }
    loadSalesOrders()
  }, [user?.id])

  if (isLoading || !user || (role !== 'vendor' && role !== 'restaurant_vendor')) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-[#0a0f0d] flex items-center justify-center p-4">
        <div className="size-8 border-4 border-[#d9f447] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fafbfa] dark:bg-[#0a0f0d] text-[#121815] dark:text-white pb-28 lg:pb-16 lg:pl-64 custom-scrollbar overflow-x-hidden w-full max-w-full transition-colors duration-200">
      <VendorSidebar />

      <div className="mx-auto max-w-[1240px] w-full px-3.5 pt-6 sm:px-6 lg:px-8 space-y-6 min-w-0 overflow-hidden">
        {/* Sales Overview Banner */}
        <div className="rounded-3xl border border-stone-200 dark:border-[#233027] bg-white dark:bg-gradient-to-r dark:from-[#141b17] dark:via-[#111614] dark:to-[#18231c] p-4 sm:p-6 shadow-sm dark:shadow-xl w-full min-w-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between min-w-0">
            <div className="min-w-0">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#86a018] dark:text-[#d9f447]">
                Restaurant Financial Analytics
              </span>
              <h2 className="mt-1 text-2xl sm:text-3xl font-black text-[#121815] dark:text-white truncate">
                Sales Revenue &amp; Settlements
              </h2>
              <p className="text-xs text-stone-500 dark:text-gray-400 mt-0.5 truncate">
                Financial performance for{' '}
                <strong className="text-stone-800 dark:text-white">
                  {user?.restaurantName || 'Your restaurant'}
                </strong>
              </p>
            </div>
            <Link
              href="/vendor/settings"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#d9f447] px-5 py-2.5 text-xs font-black text-[#0d1310] shadow-md hover:bg-[#c8e434] active:scale-95 transition shrink-0 self-start sm:self-auto cursor-pointer"
            >
              Manage Payout Bank Details <ArrowUpRight className="size-3.5 text-[#0d1310]" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
