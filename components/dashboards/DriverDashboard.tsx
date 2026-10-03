'use client'

import React, { useState, useEffect } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Bike,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Compass,
  DollarSign,
  Edit3,
  FileText,
  Fuel,
  History,
  LogOut,
  MapPin,
  Menu,
  MessageSquare,
  Navigation,
  PhoneCall,
  Power,
  Radio,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  User,
  Wallet,
  X,
  Zap,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

const Mapcn = dynamic(() => import('@/components/ui/mapcn'), { ssr: false })

interface BroadcastOrderOffer {
  id: string
  orderNumber: string
  restaurantName: string
  restaurantAddress: string
  customerName: string
  customerAddress: string
  basePayout: number
  surgeBonus: number
  tip: number
  distance: string
  itemsCount: number
}

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

interface CompletedTripItem {
  id: string
  order: string
  restaurant: string
  customer: string
  baseEarnings: number
  surge: number
  tip: number
  total: number
  time: string
  rating: number
  distance: string
}

export default function DriverDashboard() {
  const { user, logout } = useAuth()
  const [isOnline, setIsOnline] = useState(true)
  const [activeTab, setActiveTab] = useState<'active-trip' | 'history' | 'wallet' | 'incentives' | 'profile'>('active-trip')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    const handleToggle = () => setSidebarOpen((v) => !v)
    window.addEventListener('toggle-mobile-sidebar', handleToggle)
    return () => window.removeEventListener('toggle-mobile-sidebar', handleToggle)
  }, [])

  // Broadcast Offer Radar Alert Modal
  const [broadcastOffer, setBroadcastOffer] = useState<BroadcastOrderOffer | null>(null)
  const [offerTimer, setOfferTimer] = useState(15)

  // Active Task Step Progress
  const [activeTask, setActiveTask] = useState<DeliveryTask | null>(null)

  // Completed Trips List
  const [completedTrips, setCompletedTrips] = useState<CompletedTripItem[]>([])

  useEffect(() => {
    async function loadDriverData() {
      try {
        const { data: dbOrders } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
        if (dbOrders && dbOrders.length > 0) {
          const activeOrd = dbOrders.find((o) => o.status === 'preparing' || o.status === 'ready' || o.status === 'new')
          if (activeOrd) {
            setActiveTask({
              id: activeOrd.id,
              orderNumber: activeOrd.id,
              restaurantName: activeOrd.restaurant_name,
              restaurantAddress: 'Koramangala 5th Block, Bengaluru',
              customerName: activeOrd.customer_name,
              customerAddress: activeOrd.customer_address,
              customerPhone: activeOrd.customer_phone || '+91 98765 43210',
              payout: 85,
              tip: 30,
              distance: '3.2 km',
              step: activeOrd.status === 'ready' ? 'picked_up' : 'assigned',
            })
          }
          const doneOrds = dbOrders.filter((o) => o.status === 'completed')
          const mappedDone: CompletedTripItem[] = doneOrds.map((o) => ({
            id: o.id,
            order: o.id,
            restaurant: o.restaurant_name,
            customer: o.customer_name,
            baseEarnings: 65,
            surge: 20,
            tip: 30,
            total: 115,
            time: 'Today',
            rating: 5.0,
            distance: '3.5 km',
          }))
          setCompletedTrips(mappedDone)
        }
      } catch (err) {
        console.error('Failed to load driver orders from Supabase:', err)
      }
    }
    loadDriverData()
  }, [])

  // Wallet State
  const [cashoutModalOpen, setCashoutModalOpen] = useState(false)
  const [cashoutAmount, setCashoutAmount] = useState('0')
  const [cashoutSuccess, setCashoutSuccess] = useState('')
  const [payoutLogs, setPayoutLogs] = useState<Array<{ id: string; amount: number; date: string; status: string }>>([])

  // Quick SMS Drawer
  const [smsDrawerOpen, setSmsDrawerOpen] = useState(false)
  const [sentSmsMsg, setSentSmsMsg] = useState('')

  // Emergency SOS Modal
  const [sosModalOpen, setSosModalOpen] = useState(false)

  // Offer Countdown Effect
  useEffect(() => {
    if (!broadcastOffer) return
    if (offerTimer <= 0) {
      setBroadcastOffer(null)
      return
    }
    const interval = setInterval(() => {
      setOfferTimer((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [broadcastOffer, offerTimer])

  function acceptBroadcastOffer() {
    if (!broadcastOffer) return
    setActiveTask({
      id: `task_${Date.now()}`,
      orderNumber: broadcastOffer.orderNumber,
      restaurantName: broadcastOffer.restaurantName,
      restaurantAddress: broadcastOffer.restaurantAddress,
      customerName: broadcastOffer.customerName,
      customerAddress: broadcastOffer.customerAddress,
      customerPhone: '+91 98765 00000',
      payout: broadcastOffer.basePayout + broadcastOffer.surgeBonus,
      tip: broadcastOffer.tip,
      distance: broadcastOffer.distance,
      step: 'assigned',
    })
    setBroadcastOffer(null)
    setActiveTab('active-trip')
  }

  function advanceStep() {
    if (!activeTask) return
    if (activeTask.step === 'assigned') {
      setActiveTask((prev) => (prev ? { ...prev, step: 'at_restaurant' } : null))
    } else if (activeTask.step === 'at_restaurant') {
      setActiveTask((prev) => (prev ? { ...prev, step: 'picked_up' } : null))
    } else if (activeTask.step === 'picked_up') {
      const currentTask = activeTask
      setActiveTask((prev) => (prev ? { ...prev, step: 'delivered' } : null))
      const newTrip: CompletedTripItem = {
        id: `trip_${Date.now()}`,
        order: currentTask.orderNumber,
        restaurant: currentTask.restaurantName,
        customer: currentTask.customerName,
        baseEarnings: Math.round(currentTask.payout * 0.7),
        surge: Math.round(currentTask.payout * 0.3),
        tip: currentTask.tip,
        total: currentTask.payout + currentTask.tip,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        rating: 5,
        distance: currentTask.distance,
      }
      setCompletedTrips((prev) => [newTrip, ...prev])
    }
  }

  function handleInstantCashout() {
    if (!cashoutAmount || parseFloat(cashoutAmount) <= 0) return
    const amt = parseFloat(cashoutAmount)
    setCashoutSuccess(`₹${amt} successfully transferred to your UPI VPA!`)
    setPayoutLogs((prev) => [
      {
        id: `tx_${Date.now()}`,
        amount: amt,
        date: 'Just Now',
        status: 'Transferred to rajesh.kumar@okicici',
      },
      ...prev,
    ])
    setTimeout(() => {
      setCashoutSuccess('')
      setCashoutModalOpen(false)
    }, 2000)
  }

  function sendQuickSms(templateText: string) {
    if (!activeTask) return
    setSentSmsMsg(`SMS Sent to ${activeTask.customerName}: "${templateText}"`)
    setTimeout(() => {
      setSentSmsMsg('')
      setSmsDrawerOpen(false)
    }, 2500)
  }

  function triggerSimulatedOffer() {
    setOfferTimer(15)
    setBroadcastOffer({
      id: `off_${Date.now()}`,
      orderNumber: `#DRP-${Math.floor(1000 + Math.random() * 9000)}`,
      restaurantName: 'Subway Fresh',
      restaurantAddress: 'CMH Road, Indiranagar',
      customerName: 'Ananya Roy',
      customerAddress: 'Sobha Crimson, HAL 2nd Stage',
      basePayout: 95,
      surgeBonus: 40,
      tip: 50,
      distance: '2.8 km',
      itemsCount: 2,
    })
  }

  const totalEarningsToday = completedTrips.reduce((acc, t) => acc + t.total, 0)

  const navItems = [
    { id: 'active-trip', label: 'Active Delivery Task', icon: Bike, badge: activeTask && activeTask.step !== 'delivered' ? 'Active' : null },
    { id: 'history', label: 'Trip History Log', icon: History, badge: completedTrips.length.toString() },
    { id: 'wallet', label: 'Wallet & Earnings', icon: Wallet, badge: `₹${totalEarningsToday}` },
    { id: 'incentives', label: 'Quests & Surge', icon: Target, badge: '+₹200' },
    { id: 'profile', label: 'Vehicle & Profile', icon: User, badge: '4.95★' },
  ]

  return (
    <div className="flex min-h-screen bg-[#f8f9f7] text-[#18201c]">
      {/* Mobile Overlay with Smooth Fade Transition */}
      <div
        onClick={() => setSidebarOpen(false)}
        className={`fixed inset-0 z-40 bg-[#121815]/60 backdrop-blur-sm lg:hidden transition-opacity duration-300 ease-in-out ${
          sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Driver Sidebar Navigation (Matching Admin Theme & Colors) */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex flex-col justify-between bg-[#121815] text-white transition-all duration-300 ease-in-out will-change-[width,transform] lg:sticky lg:top-[65px] lg:h-[calc(100vh-65px)] lg:left-0 lg:right-auto lg:border-r border-[#202923] ${
          sidebarOpen ? 'translate-x-0 shadow-2xl w-64 border-l border-[#202923]' : 'translate-x-full lg:translate-x-0 lg:shadow-none'
        } ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        <div className="flex flex-col justify-between h-full min-h-0">
          <div className={`flex flex-col gap-5 overflow-y-auto transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'p-2.5' : 'p-4'}`}>
            {/* Sidebar Top Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 pt-1">
              <div className="flex items-center gap-3 min-w-0" title={sidebarCollapsed ? (user?.name || 'Rajesh Kumar') : undefined}>
                <span className="grid size-9 place-items-center rounded-xl bg-[#d9f447] text-[#121815] shadow-[0_4px_16px_rgba(217,244,71,0.35)] font-bold shrink-0">
                  <Bike className="size-5" />
                </span>
                <div className={`transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap min-w-0 ${
                  sidebarCollapsed ? 'opacity-0 max-w-0 hidden' : 'opacity-100 max-w-[160px]'
                }`}>
                  <h2 className="text-base font-bold tracking-tight text-white truncate">
                    {user?.name || 'Rajesh Kumar'}
                  </h2>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#d9f447]">Driver Cockpit</p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="grid size-7 place-items-center rounded-lg bg-white/10 text-white lg:hidden hover:bg-white/20 transition"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Duty Online/Offline Switch */}
            <button
              onClick={() => setIsOnline((prev) => !prev)}
              title={sidebarCollapsed ? (isOnline ? 'Duty Online' : 'Duty Offline') : undefined}
              className={`flex items-center ${
                sidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2.5'
              } rounded-xl text-xs font-bold transition shadow-sm ${
                isOnline ? 'bg-emerald-500 text-[#121815]' : 'bg-gray-800 text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <Power className="size-4 shrink-0" />
                <span className={`transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
                  sidebarCollapsed ? 'opacity-0 max-w-0 hidden' : 'opacity-100 max-w-[120px]'
                }`}>
                  Duty Status
                </span>
              </span>
              <span className={`uppercase text-[10px] tracking-wider font-extrabold transition-all duration-300 ease-in-out ${
                sidebarCollapsed ? 'hidden' : 'block'
              }`}>
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
            </button>

            {/* Nav Items */}
            <nav className="flex flex-col gap-1">
              <p className={`px-3 text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1 transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
                sidebarCollapsed ? 'opacity-0 max-h-0 mb-0 hidden' : 'opacity-100 max-h-6'
              }`}>
                Driver Navigation
              </p>
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = activeTab === item.id
                return (
                  <button
                    key={item.id}
                    title={sidebarCollapsed ? item.label : undefined}
                    onClick={() => {
                      setActiveTab(item.id as any)
                      setSidebarOpen(false)
                    }}
                    className={`flex items-center ${
                      sidebarCollapsed ? 'justify-center px-0 py-3' : 'justify-between px-3.5 py-2.5'
                    } rounded-xl text-xs font-semibold transition-all duration-300 ease-in-out ${
                      isActive
                        ? 'bg-[#d9f447] text-[#121815] font-bold shadow-md'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className={`size-4 shrink-0 transition-transform duration-300 ${isActive ? 'text-[#121815] scale-105' : 'text-[#d9f447]'}`} />
                      <span className={`truncate transition-all duration-300 ease-in-out whitespace-nowrap ${
                        sidebarCollapsed ? 'opacity-0 max-w-0 hidden' : 'opacity-100 max-w-[150px]'
                      }`}>
                        {item.label}
                      </span>
                    </div>
                    {item.badge && !sidebarCollapsed && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-bold shrink-0 ${
                          isActive ? 'bg-[#121815] text-white' : 'bg-white/15 text-[#d9f447]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Sidebar Footer & Single Bottom Minimize Toggle Button */}
          <div className="border-t border-white/10 p-3 flex flex-col gap-2 shrink-0 transition-all duration-300 ease-in-out bg-[#121815]">
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center p-2' : 'justify-between p-2.5'} rounded-xl bg-white/5 transition-all duration-300 ease-in-out`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="grid size-8 place-items-center rounded-lg bg-blue-950 text-blue-300 font-bold border border-blue-800 text-xs shrink-0" title={user?.name || 'Rajesh Kumar'}>
                  RK
                </span>
                <div className={`transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap min-w-0 flex-1 ${
                  sidebarCollapsed ? 'opacity-0 max-w-0 hidden' : 'opacity-100 max-w-[130px]'
                }`}>
                  <p className="text-xs font-bold text-white truncate">{user?.name || 'Rajesh Kumar'}</p>
                  <p className="text-[10px] text-white/50 truncate">KA 01 EV 9821</p>
                </div>
              </div>
              <button
                onClick={() => logout()}
                title="Sign Out"
                className={`grid size-7 place-items-center rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white transition-all duration-300 shrink-0 ${
                  sidebarCollapsed ? 'hidden' : 'block'
                }`}
              >
                <LogOut className="size-3.5" />
              </button>
            </div>

            {/* Bottom Single Minimize Toggle Arrow Button */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? 'Expand Sidebar' : 'Minimize Sidebar'}
              className={`hidden lg:flex items-center ${
                sidebarCollapsed ? 'justify-center py-2.5' : 'justify-between px-3.5 py-2.5'
              } rounded-xl border border-white/10 bg-white/5 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-all duration-300 ease-in-out`}
            >
              {!sidebarCollapsed && <span>Minimize Sidebar</span>}
              <span className="transition-transform duration-300 ease-in-out shrink-0">
                {sidebarCollapsed ? (
                  <ChevronRight className="size-4 text-[#d9f447]" />
                ) : (
                  <ChevronLeft className="size-4 text-[#d9f447]" />
                )}
              </span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar for Driver */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#e3e8de] bg-white/90 px-5 py-4 backdrop-blur-md lg:px-8">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#18201c] capitalize flex items-center gap-2">
              Driver Cockpit — {activeTab.replace('-', ' ')}
            </h1>
            <p className="text-xs text-[#737e77]">
              Vehicle: <span className="font-semibold text-[#18201c]">{user?.vehicleType || 'Ather 450X EV (KA 01 EV 9821)'}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* SOS Emergency Button */}
            <button
              onClick={() => setSosModalOpen(true)}
              className="flex items-center gap-1.5 rounded-full bg-rose-100 px-3.5 py-1.5 text-xs font-bold text-rose-800 border border-rose-300 hover:bg-rose-200 transition"
            >
              <ShieldAlert className="size-4 text-rose-600" />
              <span>SOS Help</span>
            </button>

            {/* Test Simulation Radar Trigger */}
            <button
              onClick={triggerSimulatedOffer}
              className="hidden sm:flex items-center gap-1.5 rounded-full bg-amber-100 px-3.5 py-1.5 text-xs font-bold text-amber-900 border border-amber-300 hover:bg-amber-200 transition"
              title="Test Delivery Radar"
            >
              <Radio className="size-4 text-amber-700 animate-pulse" />
              <span>Radar Demo</span>
            </button>

          </div>
        </header>

        {/* Driver Dashboard Body */}
        <div className="p-5 lg:p-8 flex-1">
          {/* KPI Stat Cards */}
          <div className="mb-6 sm:mb-8 grid gap-3 grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl sm:rounded-3xl border border-[#e2e7dc] bg-white p-3.5 sm:p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="flex items-center justify-between gap-1">
                  <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#737e77] truncate">Today's Earnings</p>
                  <span className="grid size-7 sm:size-9 place-items-center rounded-xl bg-emerald-100 text-emerald-800 font-bold shrink-0">
                    <DollarSign className="size-3.5 sm:size-5" />
                  </span>
                </div>
                <p className="mt-1 sm:mt-2 text-xl sm:text-3xl font-extrabold text-emerald-700">₹{totalEarningsToday}</p>
              </div>
              <button
                onClick={() => setCashoutModalOpen(true)}
                className="mt-2 text-[11px] sm:text-xs font-bold text-blue-700 hover:underline flex items-center gap-1"
              >
                <Wallet className="size-3 sm:size-3.5" /> Instant Cashout
              </button>
            </div>

            <div className="rounded-2xl sm:rounded-3xl border border-[#e2e7dc] bg-white p-3.5 sm:p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="flex items-center justify-between gap-1">
                  <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#737e77] truncate">Completed Drops</p>
                  <span className="grid size-7 sm:size-9 place-items-center rounded-xl bg-blue-100 text-blue-800 font-bold shrink-0">
                    <CheckCircle2 className="size-3.5 sm:size-5" />
                  </span>
                </div>
                <p className="mt-1 sm:mt-2 text-xl sm:text-3xl font-extrabold text-[#18201c]">{completedTrips.length}</p>
              </div>
              <p className="mt-2 text-[11px] sm:text-xs text-emerald-600 font-semibold truncate">100% On-time score</p>
            </div>

            <div className="rounded-2xl sm:rounded-3xl border border-[#e2e7dc] bg-white p-3.5 sm:p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="flex items-center justify-between gap-1">
                  <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#737e77] truncate">EV Battery</p>
                  <span className="grid size-7 sm:size-9 place-items-center rounded-xl bg-blue-100 text-blue-700 font-bold shrink-0">
                    <Zap className="size-3.5 sm:size-5 fill-blue-600" />
                  </span>
                </div>
                <p className="mt-1 sm:mt-2 text-xl sm:text-3xl font-extrabold text-blue-700">76%</p>
              </div>
              <p className="mt-2 text-[11px] sm:text-xs text-[#737e77] font-medium truncate">Est. range: ~64 km</p>
            </div>

            <div className="rounded-2xl sm:rounded-3xl border border-[#e2e7dc] bg-white p-3.5 sm:p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="flex items-center justify-between gap-1">
                  <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#737e77] truncate">Driver Rating</p>
                  <span className="grid size-7 sm:size-9 place-items-center rounded-xl bg-amber-100 text-amber-800 font-bold shrink-0">
                    <Star className="size-3.5 sm:size-5 fill-amber-400 text-amber-400" />
                  </span>
                </div>
                <p className="mt-1 sm:mt-2 text-xl sm:text-3xl font-extrabold text-amber-600">4.95</p>
              </div>
              <p className="mt-2 text-[11px] sm:text-xs text-[#737e77] font-medium truncate">Gold Tier Driver</p>
            </div>
          </div>

          {/* TAB 1: ACTIVE TRIP & NAVIGATION */}
          {activeTab === 'active-trip' && (
            activeTask ? (
              <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2 rounded-3xl border border-blue-200 bg-white p-4 sm:p-6 shadow-md">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f0f3ec] pb-3 sm:pb-4">
                    <div className="min-w-0 flex-1">
                      <span className="inline-block rounded-full bg-blue-100 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[9px] sm:text-[10px] font-extrabold text-blue-800 uppercase tracking-wider">
                        Active Task
                      </span>
                      <h3 className="mt-1 text-base sm:text-xl font-bold text-[#18201c] truncate">
                        Order {activeTask.orderNumber} ({activeTask.distance})
                      </h3>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] sm:text-xs text-[#737e77] font-semibold">Trip Payout</p>
                      <p className="text-base sm:text-xl font-extrabold text-emerald-700">₹{activeTask.payout + activeTask.tip}</p>
                    </div>
                  </div>

                  {/* Step Progress Visualizer */}
                  <div className="mt-6 flex flex-col gap-5">
                    {/* Step 1: Restaurant Pickup */}
                    <div
                      className={`rounded-2xl p-4 border transition ${
                        activeTask.step === 'assigned' || activeTask.step === 'at_restaurant'
                          ? 'border-amber-400 bg-amber-50/70 shadow-sm'
                          : 'border-gray-200 bg-gray-50 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900">
                            Step 1: Kitchen Pickup Location
                          </span>
                          <h4 className="font-bold text-base text-[#18201c] mt-0.5">{activeTask.restaurantName}</h4>
                          <p className="text-xs text-[#6e7771] flex items-center gap-1 mt-1">
                            <MapPin className="size-3.5 text-amber-600" /> {activeTask.restaurantAddress}
                          </p>
                        </div>
                        <a
                          href={`https://maps.google.com/?q=${encodeURIComponent(activeTask.restaurantAddress)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-amber-400 bg-white px-3.5 py-1.5 text-xs font-bold text-amber-900 flex items-center gap-1 shadow-sm hover:bg-amber-50"
                        >
                          <Navigation className="size-3 text-amber-700" /> GPS Map
                        </a>
                      </div>
                    </div>

                    {/* Step 2: Customer Dropoff */}
                    <div
                      className={`rounded-2xl p-4 border transition ${
                        activeTask.step === 'picked_up'
                          ? 'border-blue-400 bg-blue-50/70 shadow-sm'
                          : 'border-gray-200 bg-gray-50 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900">
                            Step 2: Customer Doorbell Dropoff
                          </span>
                          <h4 className="font-bold text-base text-[#18201c] mt-0.5">{activeTask.customerName}</h4>
                          <p className="text-xs text-[#6e7771] flex items-center gap-1 mt-1">
                            <MapPin className="size-3.5 text-blue-600" /> {activeTask.customerAddress}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSmsDrawerOpen(true)}
                            className="rounded-full border border-blue-300 bg-white px-3 py-1.5 text-xs font-bold text-blue-900 flex items-center gap-1 shadow-sm hover:bg-blue-50"
                          >
                            <MessageSquare className="size-3 text-blue-600" /> SMS
                          </button>
                          <a
                            href={`tel:${activeTask.customerPhone}`}
                            className="rounded-full bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white flex items-center gap-1 shadow-sm hover:bg-blue-700"
                          >
                            <PhoneCall className="size-3" /> Call
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Advance Action Button */}
                    {activeTask.step !== 'delivered' ? (
                      <button
                        onClick={advanceStep}
                        className="mt-2 w-full rounded-full bg-[#18201c] py-3 text-xs font-bold text-white shadow-md transition hover:bg-[#323d36]"
                      >
                        {activeTask.step === 'assigned' && 'Arrived at Restaurant Kitchen'}
                        {activeTask.step === 'at_restaurant' && 'Confirm Picked up Order Bag from Counter'}
                        {activeTask.step === 'picked_up' && 'Mark Delivered to Customer'}
                      </button>
                    ) : (
                      <div className="rounded-2xl bg-emerald-100 p-4 text-center text-emerald-900 font-bold text-xs flex items-center justify-center gap-2">
                        <CheckCircle2 className="size-5 text-emerald-600" />
                        Trip Completed! Payout credited to your wallet balance.
                      </div>
                    )}
                  </div>
                </div>

                {/* Route Map Simulation Card */}
                <div className="rounded-3xl border border-[#dfe4dc] bg-white p-5 flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-bold text-sm text-[#18201c]">Live Delivery Route</h4>
                        <p className="text-xs text-[#737e77]">Indiranagar &amp; Koramangala Radar</p>
                      </div>
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        <span className="size-2 rounded-full bg-emerald-500 animate-ping" /> GPS Live
                      </span>
                    </div>

                    <Mapcn
                      pickupCoords={[12.9784, 77.6408]}
                      dropoffCoords={[12.9352, 77.6245]}
                      driverCoords={[12.9580, 77.6320]}
                      restaurantName={activeTask.restaurantName || 'FreshBite Kitchen (Indiranagar)'}
                      customerAddress={activeTask.customerAddress || 'Koramangala 4th Block'}
                    />
                  </div>

                  <div className="mt-4 pt-4 border-t border-[#f0f3ec] text-xs text-[#737e77] flex justify-between items-center">
                    <span>Next Automatic Cashout:</span>
                    <span className="font-bold text-[#18201c]">Tonight at 11:59 PM</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-[#dfe4dc] bg-white p-12 text-center shadow-sm">
                <Bike className="mx-auto size-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-bold text-[#18201c]">No Active Delivery Task</h3>
                <p className="mt-1 text-sm text-[#737e77]">You are online and ready to receive incoming orders.</p>
                <button
                  onClick={triggerSimulatedOffer}
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#18201c] px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-[#323d36]"
                >
                  <Sparkles className="size-4 text-[#d9f447]" /> Test Radar Order Broadcast
                </button>
              </div>
            )
          )}

          {/* TAB 2: TRIP HISTORY LOG */}
          {activeTab === 'history' && (
            <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#f0f3ec] pb-4">
                <div>
                  <h3 className="text-xl font-bold text-[#18201c]">Completed Delivery History</h3>
                  <p className="text-xs text-gray-500">Detailed logs of all drops, payouts, and customer ratings.</p>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                  {completedTrips.length} Total Deliveries Completed Today
                </span>
              </div>

              <div className="mt-6 flex flex-col gap-4">
                {completedTrips.map((trip) => (
                  <div key={trip.id} className="rounded-2xl border border-gray-200 p-4 bg-white hover:border-gray-300 transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="grid size-10 place-items-center rounded-2xl bg-emerald-100 text-emerald-800 font-bold shrink-0">
                        <Check className="size-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#18201c]">{trip.order}</span>
                          <span className="text-[10px] text-gray-500 font-mono">{trip.time}</span>
                          <span className="flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                            <Star className="size-3 fill-amber-400 text-amber-400" /> {trip.rating}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-gray-800 mt-1">
                          {trip.restaurant} ➔ {trip.customer}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5">Distance: {trip.distance}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 text-xs">
                      <div className="text-right">
                        <p className="text-[10px] text-gray-500 font-bold uppercase">Breakdown</p>
                        <p className="text-gray-600">Base ₹{trip.baseEarnings} + Surge ₹{trip.surge} + Tip ₹{trip.tip}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-gray-500 font-bold uppercase">Total Earned</p>
                        <p className="text-lg font-bold text-emerald-700">₹{trip.total}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: WALLET & EARNINGS */}
          {activeTab === 'wallet' && (
            <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#f0f3ec] pb-5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900 bg-blue-100 px-2.5 py-0.5 rounded-md">
                    Instant Bank Transfer
                  </span>
                  <h3 className="text-xl font-bold text-[#18201c] mt-1">Driver Wallet Balance</h3>
                  <p className="text-xs text-[#737e77]">Withdraw your earnings directly to your registered UPI ID or Bank Account.</p>
                </div>

                <button
                  onClick={() => setCashoutModalOpen(true)}
                  className="flex items-center justify-center gap-2 rounded-full bg-[#18201c] px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-[#323d36] transition"
                >
                  <Wallet className="size-4 text-[#d9f447]" /> Cashout Balance
                </button>
              </div>

              {/* Payout History Log */}
              <div className="mt-6">
                <h4 className="text-sm font-bold text-[#18201c] mb-3">Withdrawal &amp; Cashout Log</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px]">
                        <th className="py-2.5 px-3">Transaction ID</th>
                        <th className="py-2.5 px-3">Amount</th>
                        <th className="py-2.5 px-3">Date &amp; Time</th>
                        <th className="py-2.5 px-3">Transfer Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {payoutLogs.map((p) => (
                        <tr key={p.id}>
                          <td className="py-3 px-3 font-mono font-bold">{p.id}</td>
                          <td className="py-3 px-3 font-bold text-emerald-700">₹{p.amount.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-3 text-gray-600">{p.date}</td>
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                              <Check className="size-3" /> {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: QUESTS & INCENTIVES */}
          {activeTab === 'incentives' && (
            <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
              <h3 className="text-xl font-bold text-[#18201c]">Daily Quests &amp; Surge Incentives</h3>
              <p className="text-xs text-gray-500 mt-0.5">Complete milestone delivery targets to unlock cash bonuses.</p>

              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                <div className="rounded-3xl border border-amber-300 bg-gradient-to-br from-amber-500 to-amber-600 p-6 text-white shadow-md">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full text-amber-100">
                    Daily Peak Surge Quest
                  </span>
                  <h4 className="text-xl font-bold mt-2">Complete 5 Drops Today = ₹200 Bonus</h4>
                  <p className="text-xs text-amber-100 mt-1">3 of 5 completed. Finish 2 more drops to win!</p>
                  
                  <div className="mt-4 bg-white/20 rounded-full h-3 p-0.5 w-full">
                    <div className="bg-white h-full rounded-full w-3/5" />
                  </div>
                </div>

                <div className="rounded-3xl border border-purple-300 bg-gradient-to-br from-purple-600 to-indigo-700 p-6 text-white shadow-md">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full text-purple-100">
                    Weekly Gold Milestone
                  </span>
                  <h4 className="text-xl font-bold mt-2">50 Deliveries = ₹1,500 Cash Bonus</h4>
                  <p className="text-xs text-purple-100 mt-1">34 of 50 completed. Valid till Sunday midnight.</p>

                  <div className="mt-4 bg-white/20 rounded-full h-3 p-0.5 w-full">
                    <div className="bg-white h-full rounded-full w-[68%]" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: VEHICLE & PROFILE SETTINGS */}
          {activeTab === 'profile' && (
            <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm max-w-2xl">
              <h3 className="text-xl font-bold text-[#18201c]">Driver Profile &amp; EV Telemetry</h3>
              <p className="text-xs text-gray-500 mt-0.5">Manage your driver account, vehicle specs, and safety verification.</p>

              <div className="mt-6 flex flex-col gap-4 text-xs">
                <div className="rounded-2xl bg-gray-50 p-4 border border-gray-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-gray-500">Driver License Verification</span>
                    <p className="font-bold text-[#18201c] mt-0.5">DL-042026-98124 (Verified ✅)</p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">Active Driver</span>
                </div>

                <div>
                  <label className="font-bold text-[#18201c]">Full Name</label>
                  <input type="text" defaultValue={user?.name || 'Rajesh Kumar'} className="mt-1 w-full rounded-xl border border-gray-300 p-2.5 outline-none font-bold" />
                </div>
                <div>
                  <label className="font-bold text-[#18201c]">Vehicle Type &amp; Model</label>
                  <input type="text" defaultValue={user?.vehicleType || 'Ather 450X EV Scooter'} className="mt-1 w-full rounded-xl border border-gray-300 p-2.5 outline-none font-medium" />
                </div>
                <div>
                  <label className="font-bold text-[#18201c]">License Plate Number</label>
                  <input type="text" defaultValue={user?.licensePlate || 'KA 01 EV 9821'} className="mt-1 w-full rounded-xl border border-gray-300 p-2.5 outline-none font-mono font-bold" />
                </div>

                <button className="mt-2 rounded-full bg-[#18201c] py-3 text-xs font-bold text-white shadow-md hover:bg-[#323d36]">
                  Save Profile Settings
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Broadcast Order Offer Modal (Radar Popup Alert) */}
      {broadcastOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18201c]/60 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border-2 border-emerald-500">
            <div className="flex items-center justify-between border-b border-[#f0f3ec] pb-3">
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold uppercase text-emerald-900">
                <Radio className="size-3.5 text-emerald-600 animate-pulse" /> New Delivery Offer!
              </span>
              <span className="grid size-9 place-items-center rounded-full bg-amber-400 text-[#18201c] font-black text-sm shadow-md">
                {offerTimer}s
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[#18201c]">{broadcastOffer.orderNumber}</h3>
                  <p className="text-xs text-gray-500">{broadcastOffer.distance} total distance</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500">Earnings</span>
                  <p className="text-2xl font-bold text-emerald-700">
                    ₹{broadcastOffer.basePayout + broadcastOffer.surgeBonus + broadcastOffer.tip}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-emerald-50/60 p-3.5 border border-emerald-200 text-xs flex flex-col gap-2">
                <div>
                  <span className="font-bold text-amber-900 uppercase text-[9px]">Pickup:</span>
                  <p className="font-bold text-[#18201c]">{broadcastOffer.restaurantName}</p>
                  <p className="text-[#6e7771] text-[11px]">{broadcastOffer.restaurantAddress}</p>
                </div>
                <div className="pt-2 border-t border-emerald-200/60">
                  <span className="font-bold text-blue-900 uppercase text-[9px]">Dropoff:</span>
                  <p className="font-bold text-[#18201c]">{broadcastOffer.customerName}</p>
                  <p className="text-[#6e7771] text-[11px]">{broadcastOffer.customerAddress}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                onClick={() => setBroadcastOffer(null)}
                className="rounded-full border border-gray-300 py-3 text-xs font-bold text-gray-700 hover:bg-gray-100"
              >
                Decline Offer
              </button>
              <button
                onClick={acceptBroadcastOffer}
                className="rounded-full bg-emerald-600 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-700"
              >
                Accept Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Driver Instant Wallet Cashout Modal */}
      {cashoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18201c]/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-lg text-[#18201c]">Driver Wallet Cashout</h3>
                <p className="text-xs text-gray-500">Withdraw earnings instantly to your registered UPI ID.</p>
              </div>
              <button
                onClick={() => setCashoutModalOpen(false)}
                className="grid size-8 place-items-center rounded-full bg-gray-100 hover:bg-gray-200"
              >
                <X className="size-4" />
              </button>
            </div>

            {cashoutSuccess ? (
              <div className="my-6 rounded-2xl bg-emerald-100 p-4 text-center text-emerald-900 font-bold text-xs flex flex-col items-center gap-2">
                <CheckCircle2 className="size-8 text-emerald-600 animate-bounce" />
                {cashoutSuccess}
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-4">
                <div className="rounded-2xl bg-blue-50 p-4 border border-blue-200">
                  <span className="text-[10px] font-bold uppercase text-blue-800">Available Wallet Balance</span>
                  <p className="text-3xl font-bold text-[#18201c] mt-0.5">₹1,480</p>
                </div>

                <div>
                  <label className="text-xs font-bold">Cashout Amount (₹)</label>
                  <input
                    type="number"
                    value={cashoutAmount}
                    onChange={(e) => setCashoutAmount(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 p-2.5 text-sm font-bold outline-none"
                  />
                </div>

                <div className="rounded-xl border border-gray-200 p-3 text-xs flex items-center justify-between bg-gray-50">
                  <span className="text-gray-600">Destination VPA</span>
                  <span className="font-bold text-[#18201c]">rajesh.kumar@okicici</span>
                </div>

                <button
                  onClick={handleInstantCashout}
                  className="mt-2 w-full rounded-full bg-emerald-600 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition"
                >
                  Withdraw Funds Now
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick SMS Shortcuts Modal */}
      {smsDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18201c]/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-[#18201c]">Quick SMS Templates</h3>
                <p className="text-xs text-gray-500">Send instant updates to {activeTask?.customerName || 'Customer'}</p>
              </div>
              <button
                onClick={() => setSmsDrawerOpen(false)}
                className="grid size-8 place-items-center rounded-full bg-gray-100 hover:bg-gray-200"
              >
                <X className="size-4" />
              </button>
            </div>

            {sentSmsMsg ? (
              <div className="my-6 rounded-2xl bg-emerald-100 p-4 text-center text-emerald-900 font-bold text-xs">
                {sentSmsMsg}
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-2.5">
                {[
                  'I have arrived at your building gate / entrance!',
                  'Please share the 4-digit Delivery OTP to receive your parcel.',
                  'I am delayed by 3 mins due to traffic congestion.',
                  'Your order has been placed near your doorstep.',
                ].map((msgText, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendQuickSms(msgText)}
                    className="rounded-2xl border border-gray-200 p-3 text-left text-xs font-semibold text-[#18201c] hover:bg-blue-50 hover:border-blue-300 transition"
                  >
                    "{msgText}"
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SOS Emergency Modal */}
      {sosModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18201c]/60 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border-2 border-rose-500">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <span className="flex items-center gap-1.5 text-rose-700 font-bold text-sm">
                <ShieldAlert className="size-5 text-rose-600" /> Driver SOS &amp; Emergency Center
              </span>
              <button
                onClick={() => setSosModalOpen(false)}
                className="grid size-8 place-items-center rounded-full bg-gray-100 hover:bg-gray-200"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="mt-3 text-xs text-gray-600">
              Need immediate safety assistance? Triggering SOS will notify the 24/7 Safety Command Team and share your live GPS coordinates.
            </p>

            <div className="mt-4 flex flex-col gap-3">
              <a
                href="tel:112"
                className="flex items-center justify-center gap-2 rounded-full bg-rose-600 py-3 text-xs font-bold text-white shadow-md hover:bg-rose-700"
              >
                <PhoneCall className="size-4" /> Call Police Emergency (112)
              </a>
              <button
                onClick={() => {
                  alert('24/7 Safety Team has received your GPS location signal!')
                  setSosModalOpen(false)
                }}
                className="rounded-full border border-rose-300 bg-rose-50 py-3 text-xs font-bold text-rose-800 hover:bg-rose-100"
              >
                Alert Crave Safety Support
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
