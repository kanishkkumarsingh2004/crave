'use client'

import { useDriver, getDriverPayoutDetails } from '@/lib/driver-context'
import {
  calculateCheckoutPricing,
  calculateRoadTravelDistanceKm,
  fetchOSRMDrivingDistanceKm,
} from '@/lib/distance-pricing'
import {
  ArrowRight,
  Bike,
  CheckCircle2,
  Clock3,
  DollarSign,
  KeyRound,
  LayoutGrid,
  MapPin,
  Navigation,
  PackageCheck,
  PhoneCall,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Table,
  TrendingUp,
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
  extraDistanceShare: number
  surgeBonus: number
  tip: number
  payout: number
  distanceKm: number
  distanceStr: string
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
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')

  const fetchLiveOrders = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/orders')
      const json = await res.json()
      if (json.success && Array.isArray(json.orders)) {
        const pending = json.orders.filter(
          (o: any) =>
            o.status !== 'delivered' &&
            o.status !== 'completed' &&
            o.status !== 'cancelled' &&
            (o.status === 'ready_for_pickup' ||
              o.status === 'ready' ||
              o.status === 'rider_assigned' ||
              o.status === 'picked_up' ||
              o.status === 'out_for_delivery')
        )

        const mapped: ManagedOrder[] = await Promise.all(
          pending.map(async (o: any) => {
            let itemsCount = 1
            try {
              const arr = typeof o.items === 'string' ? JSON.parse(o.items) : o.items
              if (Array.isArray(arr)) itemsCount = arr.length
            } catch (e) {}

            const restLat = o.restaurant_lat ? Number(o.restaurant_lat) : 12.9716
            const restLng = o.restaurant_lng ? Number(o.restaurant_lng) : 77.5946
            const destLat = o.customer_lat ? Number(o.customer_lat) : 12.9591
            const destLng = o.customer_lng ? Number(o.customer_lng) : 77.7041

            let roadKm = 2.4
            try {
              roadKm = await fetchOSRMDrivingDistanceKm(restLat, restLng, destLat, destLng)
            } catch {
              roadKm = calculateRoadTravelDistanceKm(restLat, restLng, destLat, destLng)
            }

            const { basePayout, surgeBonus, tip, totalDriverPayout } = getDriverPayoutDetails(o)

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
              totalAmount: Number(o.subtotal || o.total_amount || 250),
              basePayout,
              extraDistanceShare: 0,
              surgeBonus,
              tip,
              payout: totalDriverPayout,
              distanceKm: roadKm,
              distanceStr: `${roadKm.toFixed(1)} km`,
              otp: o.delivery_otp || '',
              createdAt: o.createdAt || o.created_at,
            }
          })
        )
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
      return (
        order.status === 'accepted' ||
        order.status === 'rider_assigned' ||
        order.status === 'picked_up' ||
        order.status === 'out_for_delivery' ||
        order.status === 'sent_to_vendor'
      )
    if (filter === 'preparing')
      return (
        order.status === 'preparing' || order.status === 'cooking' || order.status === 'packing'
      )
    if (filter === 'ready') return order.status === 'ready' || order.status === 'ready_for_pickup'
    return true
  })

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl border border-[#2d3b32] bg-[#1c2620] p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-white">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-[#d9f447] text-[#121815] font-extrabold shadow-md">
              <PackageCheck className="size-5" />
            </span>
            <h2 className="text-xl font-bold text-white">Accepted Orders Queue</h2>
          </div>
          <p className="text-xs text-[#a0ab9f] mt-1.5 leading-relaxed">
            Real-time OSRM road distance pricing, trip payouts, and customer OTP handoffs synced to
            platform theme.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={fetchLiveOrders}
            disabled={loading}
            className="rounded-full border border-[#374b3e] bg-[#25332a] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#2d3e33] transition flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <RefreshCw className={`size-3.5 text-[#d9f447] ${loading ? 'animate-spin' : ''}`} />
            Refresh Queue
          </button>
          <button
            onClick={triggerSimulatedOffer}
            className="rounded-full bg-[#d9f447] px-5 py-2.5 text-xs font-extrabold text-[#121815] hover:bg-[#c2dc3a] transition flex items-center gap-1.5 shadow-lg cursor-pointer"
          >
            <Sparkles className="size-3.5 text-[#121815]" />
            Find New Offer
          </button>
        </div>
      </div>

      {/* ACTIVE ACCEPTED TASK WORKFLOW CARD */}
      {activeTask ? (
        <div className="rounded-3xl border-2 border-emerald-500/60 bg-[#1c2620] p-6 shadow-2xl space-y-6 text-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2d3b32] pb-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-black text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" /> Active Trip in
                Progress
              </span>
              <h3 className="text-xl font-bold text-white mt-2">Order {activeTask.orderNumber}</h3>
            </div>
            <div className="text-right">
              <span className="text-xs text-[#a0ab9f] font-medium">Trip Driver Payout</span>
              <p className="text-2xl font-extrabold text-[#d9f447]">
                ₹{activeTask.payout + activeTask.tip}
              </p>
            </div>
          </div>

          {/* Workflow Progress Steps */}
          <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold uppercase tracking-wider">
            <div
              className={`p-2 rounded-xl border ${
                activeTask.step === 'assigned'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-[#121815] text-[#a0ab9f] border-[#25332a]'
              }`}
            >
              1. En Route Kitchen
            </div>
            <div
              className={`p-2 rounded-xl border ${
                activeTask.step === 'at_restaurant'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-[#121815] text-[#a0ab9f] border-[#25332a]'
              }`}
            >
              2. At Kitchen
            </div>
            <div
              className={`p-2 rounded-xl border ${
                activeTask.step === 'picked_up'
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                  : 'bg-[#121815] text-[#a0ab9f] border-[#25332a]'
              }`}
            >
              3. Out for Drop
            </div>
            <div
              className={`p-2 rounded-xl border ${
                activeTask.step === 'arrived_customer'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-[#121815] text-[#a0ab9f] border-[#25332a]'
              }`}
            >
              4. OTP Handshake
            </div>
          </div>

          {/* Location Details */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-[#121815] p-4 border border-amber-500/30 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                <MapPin className="size-3.5 text-amber-400" /> Kitchen Pickup Point
              </span>
              <h4 className="font-bold text-base text-white">{activeTask.restaurantName}</h4>
              <p className="text-xs text-[#a0ab9f]">{activeTask.restaurantAddress}</p>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${activeTask.restaurantLat || 12.6817},${activeTask.restaurantLng || 77.4729}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#d9f447] hover:underline pt-1"
              >
                <Navigation className="size-3.5" /> Navigate via Google Maps →
              </a>
            </div>

            <div className="rounded-2xl bg-[#121815] p-4 border border-blue-500/30 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1">
                <ShieldCheck className="size-3.5 text-blue-400" /> Customer Drop Point
              </span>
              <h4 className="font-bold text-base text-white">{activeTask.customerName}</h4>
              <p className="text-xs text-[#a0ab9f]">{activeTask.customerAddress}</p>
              {activeTask.customerPhone && (
                <a
                  href={`tel:${activeTask.customerPhone}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:underline pt-1"
                >
                  <PhoneCall className="size-3.5" /> Call Customer ({activeTask.customerPhone})
                </a>
              )}
            </div>
          </div>

          {/* Action Step Control */}
          <div className="pt-2 border-t border-[#2d3b32]">
            {activeTask.step !== 'arrived_customer' ? (
              <button
                type="button"
                onClick={advanceStep}
                className="w-full rounded-2xl bg-[#d9f447] py-3.5 text-xs font-extrabold text-[#121815] shadow-lg hover:bg-[#c2dc3a] transition flex items-center justify-center gap-2 cursor-pointer"
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
                className="space-y-3 rounded-2xl bg-[#121815] p-4 border border-amber-500/40"
              >
                <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <KeyRound className="size-4 text-amber-400" /> Enter Customer 6-Digit Delivery OTP
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="xxxxxx"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    className="flex-1 rounded-xl border border-[#2d3b32] bg-[#1c2620] p-3 font-mono text-center text-lg font-bold text-white outline-none tracking-widest focus:border-[#d9f447]"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-emerald-500 px-6 py-3 text-xs font-extrabold text-[#121815] shadow-md hover:bg-emerald-400 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="size-4" /> Verify OTP &amp; Complete
                  </button>
                </div>
                {otpError && <p className="text-xs font-bold text-rose-400">{otpError}</p>}
              </form>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-[#2d3b32] bg-[#1c2620] p-6 text-center text-xs text-[#a0ab9f] space-y-2">
          <Bike className="size-8 mx-auto text-[#d9f447]" />
          <p className="font-bold text-white text-sm">No Active Delivery Trip Currently Selected</p>
          <p>
            You are online and available. Select an accepted order below or click &quot;Find New
            Offer&quot;.
          </p>
        </div>
      )}

      {/* SYSTEM ORDERS QUEUE MANAGEMENT */}
      <div className="rounded-3xl border border-[#2d3b32] bg-[#1c2620] p-6 shadow-xl space-y-4 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2d3b32] pb-3">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-bold text-white">
              Live Orders Queue ({filteredOrders.length})
            </h3>

            {/* View Mode Toggle: Cards vs Table */}
            <div className="flex items-center bg-[#121815] p-1 rounded-xl border border-[#25332a]">
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'cards'
                    ? 'bg-[#d9f447] text-[#121815] font-bold shadow-xs'
                    : 'text-[#a0ab9f] hover:text-white'
                }`}
                title="Card View"
              >
                <LayoutGrid className="size-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'table'
                    ? 'bg-[#d9f447] text-[#121815] font-bold shadow-xs'
                    : 'text-[#a0ab9f] hover:text-white'
                }`}
                title="Theme Table View"
              >
                <Table className="size-4" />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-[#121815] p-1 rounded-xl border border-[#25332a]">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                filter === 'all' ? 'bg-[#d9f447] text-[#121815]' : 'text-[#a0ab9f] hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('accepted')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                filter === 'accepted'
                  ? 'bg-[#d9f447] text-[#121815]'
                  : 'text-[#a0ab9f] hover:text-white'
              }`}
            >
              Accepted
            </button>
            <button
              onClick={() => setFilter('preparing')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                filter === 'preparing'
                  ? 'bg-[#d9f447] text-[#121815]'
                  : 'text-[#a0ab9f] hover:text-white'
              }`}
            >
              Preparing
            </button>
            <button
              onClick={() => setFilter('ready')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                filter === 'ready'
                  ? 'bg-[#d9f447] text-[#121815]'
                  : 'text-[#a0ab9f] hover:text-white'
              }`}
            >
              Ready for Pickup
            </button>
          </div>
        </div>

        {filteredOrders.length > 0 ? (
          viewMode === 'cards' ? (
            /* CARDS GRID VIEW */
            <div className="space-y-3">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-2xl border border-[#25332a] p-4 hover:border-[#b5de28] transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#121815]"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#a0ab9f]">
                        {order.orderNumber}
                      </span>
                      <span className="rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2.5 py-0.5 text-[10px] font-extrabold uppercase">
                        {order.status}
                      </span>
                      <span className="rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold font-mono">
                        OSRM: {order.distanceStr}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-white">{order.restaurantName}</h4>
                    <p className="text-xs text-[#a0ab9f]">
                      To: {order.customerName} ({order.customerAddress})
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-right">
                      <span className="text-[10px] text-[#a0ab9f] font-bold uppercase tracking-wider">
                        Driver Trip Payout
                      </span>
                      <p className="text-base font-extrabold text-[#d9f447]">₹{order.payout}</p>
                      <p className="text-[10px] text-white/50 font-mono">
                        (Base ₹{order.basePayout} + Dist ₹{order.extraDistanceShare})
                      </p>
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
                          basePayout: order.basePayout + order.extraDistanceShare,
                          surgeBonus: order.surgeBonus,
                          tip: order.tip,
                          distance: order.distanceStr,
                          itemsCount: order.itemsCount || 1,
                          otp: order.otp || '123456',
                        })
                      }}
                      className="rounded-full bg-[#d9f447] px-4 py-2 text-xs font-extrabold text-[#121815] hover:bg-[#c2dc3a] transition flex items-center gap-1 shadow-md cursor-pointer"
                    >
                      Accept Drop <ArrowRight className="size-3.5 text-[#121815]" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* THEME DATA TABLE VIEW */
            <div className="overflow-x-auto rounded-2xl border border-[#2d3b32]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#18201c] text-[#d9f447] font-extrabold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3 border-b border-[#2d3b32]">Order ID</th>
                    <th className="px-4 py-3 border-b border-[#2d3b32]">Kitchen Pickup</th>
                    <th className="px-4 py-3 border-b border-[#2d3b32]">Customer Location</th>
                    <th className="px-4 py-3 text-center border-b border-[#2d3b32]">
                      OSRM Distance
                    </th>
                    <th className="px-4 py-3 text-right border-b border-[#2d3b32]">Food Total</th>
                    <th className="px-4 py-3 text-right border-b border-[#2d3b32]">
                      Driver Payout
                    </th>
                    <th className="px-4 py-3 text-center border-b border-[#2d3b32]">Status</th>
                    <th className="px-4 py-3 text-center border-b border-[#2d3b32]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#202923] bg-[#121815]">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-[#1a231d] transition">
                      <td className="px-4 py-3 font-mono font-bold text-white">
                        {order.orderNumber}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-white">{order.restaurantName}</div>
                        <div className="text-[10px] text-[#a0ab9f] line-clamp-1">
                          {order.restaurantAddress}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-white">{order.customerName}</div>
                        <div className="text-[10px] text-[#a0ab9f] line-clamp-1">
                          {order.customerAddress}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block font-mono text-[11px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-full">
                          {order.distanceStr}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-white">
                        ₹{order.totalAmount}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-extrabold text-[#d9f447] text-sm">₹{order.payout}</div>
                        <div className="text-[9px] text-[#a0ab9f] font-mono">
                          (Base ₹{order.basePayout} + Dist ₹{order.extraDistanceShare})
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2.5 py-0.5 text-[10px] font-extrabold uppercase">
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
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
                              basePayout: order.basePayout + order.extraDistanceShare,
                              surgeBonus: order.surgeBonus,
                              tip: order.tip,
                              distance: order.distanceStr,
                              itemsCount: order.itemsCount || 1,
                              otp: order.otp || '123456',
                            })
                          }}
                          className="rounded-full bg-[#d9f447] px-3 py-1.5 text-[11px] font-extrabold text-[#121815] hover:bg-[#c2dc3a] transition shadow-md inline-flex items-center gap-1 cursor-pointer"
                        >
                          Accept Drop <ArrowRight className="size-3 text-[#121815]" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="rounded-2xl border border-dashed border-[#2d3b32] bg-[#121815] p-6 text-center text-xs text-[#a0ab9f]">
            No live orders found matching filter criteria.
          </div>
        )}
      </div>
    </div>
  )
}
