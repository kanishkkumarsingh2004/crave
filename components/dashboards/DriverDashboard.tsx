'use client'

import React, { useState } from 'react'
import {
  Bike,
  CheckCircle2,
  Clock3,
  DollarSign,
  MapPin,
  Navigation,
  PhoneCall,
  Power,
  ShieldCheck,
  Star,
  Zap,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

interface DeliveryTask {
  id: string
  orderNumber: string
  restaurantName: string
  restaurantAddress: string
  customerName: string
  customerAddress: string
  customerPhone: string
  payout: number
  tip: number
  distance: string
  step: 'assigned' | 'at_restaurant' | 'picked_up' | 'delivered'
}

export default function DriverDashboard() {
  const { user } = useAuth()
  const [isOnline, setIsOnline] = useState(true)
  const [activeTask, setActiveTask] = useState<DeliveryTask>({
    id: 'task_102',
    orderNumber: '#DRP-9021',
    restaurantName: 'The Green Table',
    restaurantAddress: '100ft Rd, Indiranagar',
    customerName: 'Alex Rivera',
    customerAddress: 'Flat 402, Sunshine Apts, Domlur',
    customerPhone: '+91 98765 43210',
    payout: 85,
    tip: 30,
    distance: '3.2 km',
    step: 'assigned',
  })

  const [completedTrips, setCompletedTrips] = useState([
    { id: 'trip_1', order: '#DRP-8812', earnings: 75, tip: 20, time: '1:15 PM' },
    { id: 'trip_2', order: '#DRP-8790', earnings: 90, tip: 40, time: '12:30 PM' },
  ])

  function advanceStep() {
    if (activeTask.step === 'assigned') {
      setActiveTask((prev) => ({ ...prev, step: 'at_restaurant' }))
    } else if (activeTask.step === 'at_restaurant') {
      setActiveTask((prev) => ({ ...prev, step: 'picked_up' }))
    } else if (activeTask.step === 'picked_up') {
      setActiveTask((prev) => ({ ...prev, step: 'delivered' }))
      // Add payout to completed trips
      setCompletedTrips((prev) => [
        {
          id: `trip_${Date.now()}`,
          order: activeTask.orderNumber,
          earnings: activeTask.payout,
          tip: activeTask.tip,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        ...prev,
      ])
    }
  }

  const totalEarningsToday = completedTrips.reduce((acc, t) => acc + t.earnings + t.tip, 0) + (activeTask.step === 'delivered' ? 115 : 0)

  return (
    <div className="min-h-screen bg-[#f8f9f7] pb-24 text-[#18201c]">
      {/* Driver Top Banner */}
      <div className="border-b border-[#e5e9e1] bg-white px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="grid size-12 place-items-center rounded-2xl bg-blue-100 text-blue-800 font-bold">
              <Bike className="size-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-blue-900 border border-blue-200">
                  Driver Cockpit
                </span>
                <span className="text-xs text-[#737e77]">
                  Vehicle: <span className="font-semibold text-[#18201c]">{user?.vehicleType || 'Ather 450X EV'}</span>
                </span>
              </div>
              <h1 className="mt-0.5 text-2xl font-bold tracking-tight">
                {user?.name || 'Rajesh Kumar'} ⚡
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsOnline((prev) => !prev)}
              className={`flex items-center gap-2 rounded-full px-5 py-2 text-xs font-bold transition ${
                isOnline ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-white'
              }`}
            >
              <Power className="size-3.5" />
              Duty: {isOnline ? 'ONLINE (RECEIVING ORDERS)' : 'OFFLINE'}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1240px] px-4 pt-6 sm:px-6 lg:px-8">
        {/* Metric Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-[#e2e7dc] bg-white p-4">
            <p className="text-[11px] font-bold uppercase text-[#737e77]">Today's Earnings</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">₹{totalEarningsToday + 260}</p>
            <p className="mt-1 text-[11px] text-[#737e77]">Base pay + Tips</p>
          </div>
          <div className="rounded-2xl border border-[#e2e7dc] bg-white p-4">
            <p className="text-[11px] font-bold uppercase text-[#737e77]">Completed Drops</p>
            <p className="mt-1 text-2xl font-bold text-[#18201c]">{completedTrips.length + 3}</p>
            <p className="mt-1 text-[11px] text-[#737e77]">Today's total deliveries</p>
          </div>
          <div className="rounded-2xl border border-[#e2e7dc] bg-white p-4">
            <p className="text-[11px] font-bold uppercase text-[#737e77]">Distance Covered</p>
            <p className="mt-1 text-2xl font-bold text-blue-700">28.4 km</p>
            <p className="mt-1 text-[11px] text-[#737e77]">EV Battery: 76%</p>
          </div>
          <div className="rounded-2xl border border-[#e2e7dc] bg-white p-4">
            <p className="text-[11px] font-bold uppercase text-[#737e77]">Driver Rating</p>
            <p className="mt-1 text-2xl font-bold text-amber-600 flex items-center gap-1">
              <Star className="size-5 fill-amber-400 text-amber-400" /> 4.95
            </p>
            <p className="mt-1 text-[11px] text-[#737e77]">Based on 320 reviews</p>
          </div>
        </div>

        {/* Active Delivery Trip Card */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 rounded-3xl border border-blue-200 bg-white p-6 shadow-md">
            <div className="flex items-center justify-between border-b border-[#f0f3ec] pb-4">
              <div>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-[10px] font-bold text-blue-800 uppercase">
                  Active Trip Task
                </span>
                <h3 className="mt-2 text-xl font-bold text-[#18201c]">
                  Order {activeTask.orderNumber} ({activeTask.distance})
                </h3>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#737e77]">Estimated Payout</p>
                <p className="text-lg font-bold text-emerald-700">₹{activeTask.payout + activeTask.tip}</p>
              </div>
            </div>

            {/* Step Progress */}
            <div className="mt-6 flex flex-col gap-5">
              {/* Pickup location */}
              <div className={`rounded-2xl p-4 border transition ${
                activeTask.step === 'assigned' || activeTask.step === 'at_restaurant'
                  ? 'border-amber-300 bg-amber-50/50'
                  : 'border-gray-200 bg-gray-50 opacity-60'
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                      Step 1: Kitchen Pickup
                    </span>
                    <h4 className="font-bold text-base text-[#18201c] mt-0.5">{activeTask.restaurantName}</h4>
                    <p className="text-xs text-[#6e7771] flex items-center gap-1 mt-1">
                      <MapPin className="size-3.5 text-amber-600" /> {activeTask.restaurantAddress}
                    </p>
                  </div>
                  <button className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-900 flex items-center gap-1">
                    <Navigation className="size-3" /> Navigate
                  </button>
                </div>
              </div>

              {/* Customer dropoff location */}
              <div className={`rounded-2xl p-4 border transition ${
                activeTask.step === 'picked_up'
                  ? 'border-blue-300 bg-blue-50/50'
                  : 'border-gray-200 bg-gray-50 opacity-60'
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800">
                      Step 2: Customer Delivery Dropoff
                    </span>
                    <h4 className="font-bold text-base text-[#18201c] mt-0.5">{activeTask.customerName}</h4>
                    <p className="text-xs text-[#6e7771] flex items-center gap-1 mt-1">
                      <MapPin className="size-3.5 text-blue-600" /> {activeTask.customerAddress}
                    </p>
                  </div>
                  <button className="rounded-full border border-blue-300 bg-white px-3 py-1.5 text-xs font-bold text-blue-900 flex items-center gap-1">
                    <PhoneCall className="size-3" /> Call Customer
                  </button>
                </div>
              </div>

              {/* Action Button for Driver */}
              {activeTask.step !== 'delivered' ? (
                <button
                  onClick={advanceStep}
                  className="mt-2 w-full rounded-full bg-[#18201c] py-3 text-xs font-bold text-white transition hover:bg-[#323d36]"
                >
                  {activeTask.step === 'assigned' && 'Arrived at Kitchen'}
                  {activeTask.step === 'at_restaurant' && 'Confirm Picked up Order from Kitchen'}
                  {activeTask.step === 'picked_up' && 'Mark Delivered to Customer'}
                </button>
              ) : (
                <div className="rounded-2xl bg-emerald-100 p-4 text-center text-emerald-900 font-bold text-xs">
                  ✅ Trip Completed! Payout credited to your wallet.
                </div>
              )}
            </div>
          </div>

          {/* Route Map Simulation */}
          <div className="rounded-3xl border border-[#dfe4dc] bg-white p-5 flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-sm text-[#18201c]">Live Delivery Map</h4>
              <p className="text-xs text-[#737e77]">Bengaluru Central Zone Route</p>

              <div className="mt-4 relative h-64 w-full overflow-hidden rounded-2xl bg-[#e1e9d3] flex items-center justify-center">
                <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(#8fa71c 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                <div className="z-10 text-center">
                  <div className="mx-auto grid size-12 place-items-center rounded-full bg-[#d9f447] text-[#18201c] shadow-lg animate-bounce">
                    <Bike className="size-6" />
                  </div>
                  <span className="mt-2 inline-block rounded-full bg-[#18201c] px-3 py-1 text-[10px] font-bold text-white">
                    Moving to destination
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[#f0f3ec] text-xs text-[#737e77]">
              <span>Next Payout Payout Cycle: </span>
              <span className="font-bold text-[#18201c]">Tonight at 11:59 PM</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
