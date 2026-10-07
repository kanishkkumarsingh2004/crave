'use client'

import { useDriver } from '@/lib/driver-context'
import {
  ArrowRight,
  Bike,
  CheckCircle2,
  Clock3,
  KeyRound,
  MapPin,
  Navigation,
  PackageCheck,
  PhoneCall,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface ManagedOrder {
  id: string
  orderNumber: string
  restaurantName: string
  restaurantAddress: string
  customerName: string
  customerAddress: string
  customerPhone?: string
  status: string
  itemsCount: number
  totalAmount: number
  basePayout: number
  surgeBonus: number
  tip: number
  payout: number
  distance: string
  otp?: string
  createdAt?: string
}

export default function DriverAcceptedOrdersPage() {
  const {
    isOnline,
    activeTask,
    advanceStep,
    completeDelivery,
    acceptBroadcastOffer,
    triggerSimulatedOffer,
    setBroadcastOffer,
    setOfferTimer,
  } = useDriver()

  const [otpInput, setOtpInput] = useState('')
  const [otpError, setOtpError] = useState('')
  const [liveOrders, setLiveOrders] = useState<ManagedOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'accepted' | 'preparing' | 'ready'>('all')

  const fetchLiveOrders = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/orders')
      const json = await res.json()
      if (json.success && Array.isArray(json.orders)) {
        const mapped: ManagedOrder[] = json.orders
          .filter(
            (o: any) =>
              o.status !== 'delivered' && o.status !== 'completed' && o.status !== 'cancelled'
          )
          .map((o: any) => {
            let itemsCount = 1
            try {
              const arr = typeof o.items === 'string' ? JSON.parse(o.items) : o.items
              if (Array.isArray(arr)) itemsCount = arr.length
            } catch (e) {}

            const foodTotal = Number(o.total_amount || 250)
            const tip = Number(o.tip || 0)
            let driverPayout = Number(o.driver_payout || 0)

            if (!driverPayout && o.items) {
              try {
                const arr = typeof o.items === 'string' ? JSON.parse(o.items) : o.items
                if (Array.isArray(arr) && arr[0]?.billing_breakdown?.driver_payout != null) {
                  driverPayout = Number(arr[0].billing_breakdown.driver_payout)
                }
              } catch (e) {}
            }

            if (!driverPayout) {
              const deliveryFee = Number(o.delivery_fee) || 30
              driverPayout = Math.round(deliveryFee * 0.8) + tip
              if (driverPayout <= 0) driverPayout = 24
            }

            return {
              id: o.id,
              orderNumber: `#${o.id.slice(0, 8)}`,
              restaurantName: o.restaurant_name || 'Crave Kitchen',
              restaurantAddress: o.customer_address
                ? `Kitchen near ${o.customer_address}`
                : 'Koramangala 5th Block, Bengaluru',
              customerName: o.customer_name || 'Customer',
              customerAddress: o.customer_address || 'Indiranagar 100ft Rd',
              customerPhone: o.customer_phone,
              status: o.status || 'new',
              itemsCount,
              totalAmount: foodTotal,
              basePayout: driverPayout,
              surgeBonus: 0,
              tip,
              payout: driverPayout,
              distance: '2.4 km',
              otp: o.delivery_otp || '',
              createdAt: o.createdAt || o.created_at,
            }
          })
        setLiveOrders(mapped)
      }
    } catch (err) {
      console.error('Failed to fetch orders for driver management:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLiveOrders()
  }, [])

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const result = completeDelivery(otpInput)
    if (!result.success) {
      setOtpError(result.message)
    } else {
      setOtpError('')
      setOtpInput('')
      fetchLiveOrders()
    }
  }

  const filteredOrders = liveOrders.filter((order) => {
    if (filter === 'accepted')
      return order.status === 'accepted' || order.status === 'sent_to_vendor'
    if (filter === 'preparing') return order.status === 'preparing' || order.status === 'cooking'
    if (filter === 'ready') return order.status === 'ready' || order.status === 'ready_for_pickup'
    return true
  })

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-[#d9f447] text-[#121815] font-bold">
              <PackageCheck className="size-4" />
            </span>
            <h2 className="text-xl font-bold text-[#18201c]">Accepted Orders Queue</h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Manage your active delivery workflow, track kitchen pickups, and process customer
            6-digit OTP handoffs.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchLiveOrders}
            disabled={loading}
            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition flex items-center gap-1.5 shadow-xs"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Queue
          </button>
          <button
            onClick={triggerSimulatedOffer}
            className="rounded-full bg-[#121815] px-4 py-2 text-xs font-bold text-white hover:bg-black transition flex items-center gap-1.5 shadow-xs"
          >
            <Sparkles className="size-3.5 text-[#d9f447]" />
            Find New Offer
          </button>
        </div>
      </div>

      {/* ACTIVE ACCEPTED TASK WORKFLOW CARD */}
      {activeTask ? (
        <div className="rounded-3xl border-2 border-emerald-500 bg-white p-6 shadow-lg space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-900 uppercase tracking-wider">
                <span className="size-2 rounded-full bg-emerald-600 animate-pulse" /> Active Trip in
                Progress
              </span>
              <h3 className="text-xl font-bold text-[#18201c] mt-2">
                Order {activeTask.orderNumber}
              </h3>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-500 font-medium">Trip Driver Payout</span>
              <p className="text-2xl font-extrabold text-emerald-700">
                ₹{activeTask.payout + activeTask.tip}
              </p>
            </div>
          </div>

          {/* Workflow Progress Steps */}
          <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold uppercase tracking-wider">
            <div
              className={`p-2 rounded-xl border ${
                activeTask.step === 'assigned'
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-gray-100 text-gray-400 border-gray-200'
              }`}
            >
              1. En Route Kitchen
            </div>
            <div
              className={`p-2 rounded-xl border ${
                activeTask.step === 'at_restaurant'
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-gray-100 text-gray-400 border-gray-200'
              }`}
            >
              2. At Kitchen
            </div>
            <div
              className={`p-2 rounded-xl border ${
                activeTask.step === 'picked_up'
                  ? 'bg-blue-100 text-blue-900 border-blue-300'
                  : 'bg-gray-100 text-gray-400 border-gray-200'
              }`}
            >
              3. Out for Drop
            </div>
            <div
              className={`p-2 rounded-xl border ${
                activeTask.step === 'arrived_customer'
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  : 'bg-gray-100 text-gray-400 border-gray-200'
              }`}
            >
              4. OTP Handshake
            </div>
          </div>

          {/* Location Details */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-amber-50/80 p-4 border border-amber-200/80 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1">
                <MapPin className="size-3.5 text-amber-600" /> Kitchen Pickup Point
              </span>
              <h4 className="font-bold text-base text-[#18201c]">{activeTask.restaurantName}</h4>
              <p className="text-xs text-gray-600">{activeTask.restaurantAddress}</p>
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(activeTask.restaurantAddress)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 hover:underline pt-1"
              >
                <Navigation className="size-3.5" /> Navigate via Google Maps →
              </a>
            </div>

            <div className="rounded-2xl bg-blue-50/80 p-4 border border-blue-200/80 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1">
                <ShieldCheck className="size-3.5 text-blue-600" /> Customer Drop Point
              </span>
              <h4 className="font-bold text-base text-[#18201c]">{activeTask.customerName}</h4>
              <p className="text-xs text-gray-600">{activeTask.customerAddress}</p>
              {activeTask.customerPhone && (
                <a
                  href={`tel:${activeTask.customerPhone}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-900 hover:underline pt-1"
                >
                  <PhoneCall className="size-3.5" /> Call Customer ({activeTask.customerPhone})
                </a>
              )}
            </div>
          </div>

          {/* Action Step Control */}
          <div className="pt-2 border-t border-gray-100">
            {activeTask.step !== 'arrived_customer' ? (
              <button
                type="button"
                onClick={advanceStep}
                className="w-full rounded-2xl bg-[#121815] py-3.5 text-xs font-bold text-white shadow-md hover:bg-black transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {activeTask.step === 'assigned'
                  ? 'Confirm Arrived at Kitchen →'
                  : activeTask.step === 'at_restaurant'
                    ? 'Confirm Order Picked Up →'
                    : 'Arrived at Customer Location →'}
              </button>
            ) : (
              <form
                onSubmit={handleOtpSubmit}
                className="space-y-3 rounded-2xl bg-amber-50 p-4 border border-amber-300"
              >
                <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <KeyRound className="size-4 text-amber-600" /> Enter Customer 6-Digit Delivery OTP
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6-digit OTP"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    className="flex-1 rounded-xl border border-amber-300 bg-white p-3 font-mono text-center text-lg font-bold outline-none tracking-widest shadow-xs"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-emerald-600 px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="size-4" /> Verify OTP &amp; Complete
                  </button>
                </div>
                {otpError && <p className="text-xs font-bold text-rose-700">{otpError}</p>}
              </form>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-6 text-center text-xs text-gray-500 space-y-2">
          <Bike className="size-8 mx-auto text-gray-400" />
          <p className="font-bold text-[#18201c]">No Active Delivery Trip Currently Selected</p>
          <p>
            You are online and available. Select an accepted order below or click &quot;Find New
            Offer&quot;.
          </p>
        </div>
      )}

      {/* SYSTEM ORDERS QUEUE MANAGEMENT */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <h3 className="text-base font-bold text-[#18201c]">
            Live Orders Queue ({filteredOrders.length})
          </h3>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                filter === 'all'
                  ? 'bg-white text-[#18201c] shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('accepted')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                filter === 'accepted'
                  ? 'bg-white text-[#18201c] shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Accepted
            </button>
            <button
              onClick={() => setFilter('preparing')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                filter === 'preparing'
                  ? 'bg-white text-[#18201c] shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Preparing
            </button>
            <button
              onClick={() => setFilter('ready')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                filter === 'ready'
                  ? 'bg-white text-[#18201c] shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Ready for Pickup
            </button>
          </div>
        </div>

        {filteredOrders.length > 0 ? (
          <div className="space-y-3">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="rounded-2xl border border-gray-200 p-4 hover:border-gray-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-gray-500">
                      {order.orderNumber}
                    </span>
                    <span className="rounded-full bg-blue-100 text-blue-800 px-2.5 py-0.5 text-[10px] font-extrabold uppercase">
                      {order.status}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-[#18201c]">{order.restaurantName}</h4>
                  <p className="text-xs text-gray-500">
                    To: {order.customerName} ({order.customerAddress})
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <div className="text-right">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                      Actual Driver Earning
                    </span>
                    <p className="text-base font-extrabold text-emerald-700">₹{order.payout}</p>
                  </div>
                  <button
                    onClick={() => {
                      setOfferTimer(25)
                      setBroadcastOffer({
                        id: order.id,
                        orderNumber: order.orderNumber,
                        restaurantName: order.restaurantName,
                        restaurantAddress: order.restaurantAddress,
                        customerName: order.customerName,
                        customerAddress: order.customerAddress,
                        basePayout: order.basePayout,
                        surgeBonus: order.surgeBonus,
                        tip: order.tip,
                        distance: order.distance || '2.4 km',
                        itemsCount: order.itemsCount || 1,
                        otp: order.otp || '123456',
                      })
                    }}
                    className="rounded-full bg-[#121815] px-4 py-2 text-xs font-bold text-white hover:bg-black transition flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    Accept Drop <ArrowRight className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-xs text-gray-500">
            No live orders found matching filter criteria.
          </div>
        )}
      </div>
    </div>
  )
}
