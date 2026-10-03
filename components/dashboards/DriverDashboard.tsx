'use client'

import { useAuth } from '@/lib/auth-context'
import {
  Bike,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  DollarSign,
  History,
  LogOut,
  MapPin,
  Menu,
  MessageSquare,
  Navigation,
  PhoneCall,
  Plus,
  Power,
  QrCode,
  Radio,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  User,
  Wallet,
  X,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'

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
  step: 'assigned' | 'at_restaurant' | 'picked_up' | 'arrived_customer'
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
  distance: string
}

export default function DriverDashboard() {
  const { user, logout } = useAuth()
  const [isOnline, setIsOnline] = useState(true)
  const [activeTab, setActiveTab] = useState<
    'map' | 'history' | 'wallet' | 'incentives' | 'profile' | 'settings'
  >('map')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Driver UPI IDs & Payout Settings State
  const [savedUpiList, setSavedUpiList] = useState([
    {
      id: 'upi_1',
      vpa: 'rajesh.kumar@okicici',
      bankName: 'ICICI Bank Ltd',
      isPrimary: true,
      isVerified: true,
    },
    {
      id: 'upi_2',
      vpa: '9876543210@paytm',
      bankName: 'Paytm Payments Bank',
      isPrimary: false,
      isVerified: true,
    },
  ])
  const [newUpiVpa, setNewUpiVpa] = useState('')
  const [newUpiProvider, setNewUpiProvider] = useState('Google Pay / PhonePe UPI')
  const [upiSaveSuccess, setUpiSaveSuccess] = useState('')

  function handleAddUpiId(e: React.FormEvent) {
    e.preventDefault()
    if (!newUpiVpa || !newUpiVpa.includes('@')) {
      alert('Please enter a valid UPI VPA ID (e.g. name@okicici or 9876543210@paytm)')
      return
    }
    const newEntry = {
      id: `upi_${Date.now()}`,
      vpa: newUpiVpa.trim(),
      bankName: newUpiProvider,
      isPrimary: savedUpiList.length === 0,
      isVerified: true,
    }
    setSavedUpiList((prev) => [...prev, newEntry])
    setNewUpiVpa('')
    setUpiSaveSuccess('New UPI VPA ID added & NPCI-verified successfully!')
    setTimeout(() => setUpiSaveSuccess(''), 3000)
  }

  function setPrimaryUpi(id: string) {
    setSavedUpiList((prev) =>
      prev.map((item) => ({
        ...item,
        isPrimary: item.id === id,
      }))
    )
  }

  function deleteUpiId(id: string) {
    setSavedUpiList((prev) => prev.filter((item) => item.id !== id))
  }

  // Real Mobile/Browser Device GPS Location State
  const [driverGpsCoords, setDriverGpsCoords] = useState<[number, number] | null>(null)
  const [gpsStatus, setGpsStatus] = useState<
    'idle' | 'acquiring' | 'connected' | 'denied' | 'error'
  >('idle')
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null)
  const [lastGpsUpdate, setLastGpsUpdate] = useState<string>('')

  useEffect(() => {
    const handleToggle = () => setSidebarOpen((v) => !v)
    window.addEventListener('toggle-mobile-sidebar', handleToggle)
    return () => window.removeEventListener('toggle-mobile-sidebar', handleToggle)
  }, [])

  // Geolocation Watcher Effect: tracks real mobile phone GPS location dynamically when Driver is Online
  useEffect(() => {
    if (!isOnline) {
      setGpsStatus('idle')
      return
    }

    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setGpsStatus('error')
      return
    }

    setGpsStatus('acquiring')

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        const accuracy = position.coords.accuracy
        setDriverGpsCoords([lat, lng])
        setGpsAccuracy(Math.round(accuracy))
        setGpsStatus('connected')
        setLastGpsUpdate(
          new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        )
      },
      (error) => {
        console.warn('Mobile GPS error / permission denied:', error.message)
        if (error.code === error.PERMISSION_DENIED) {
          setGpsStatus('denied')
        } else {
          setGpsStatus('error')
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [isOnline])

  // Explicit Mobile GPS Request Trigger
  function requestMobileGps() {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      alert('Geolocation is not supported on this browser or mobile device.')
      return
    }
    setGpsStatus('acquiring')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        setDriverGpsCoords([lat, lng])
        setGpsAccuracy(Math.round(position.coords.accuracy))
        setGpsStatus('connected')
        setLastGpsUpdate(
          new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        )
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsStatus('denied')
          alert(
            'Location permission was denied. Please allow location access in your browser or phone settings.'
          )
        } else {
          setGpsStatus('error')
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // Fallback Bangalore Coordinates if Mobile GPS is not granted or still acquiring
  const defaultCoords: [number, number] = [12.958, 77.632]
  const effectiveDriverCoords = driverGpsCoords || defaultCoords

  // Broadcast Offer Radar Alert Popup (null by default when searching)
  const [broadcastOffer, setBroadcastOffer] = useState<BroadcastOrderOffer | null>(null)
  const [offerTimer, setOfferTimer] = useState(15)

  // Active Task Step Progress (null by default when searching)
  const [activeTask, setActiveTask] = useState<DeliveryTask | null>(null)

  // PIN / OTP Delivery Verification State
  const [otpInput, setOtpInput] = useState('4921')

  // Delivery Completed Summary Modal
  const [completedSummaryModal, setCompletedSummaryModal] = useState<CompletedTripItem | null>(null)

  // Kitchen Delay Modal
  const [delayModalOpen, setDelayModalOpen] = useState(false)

  // Completed Trips List
  const [completedTrips, setCompletedTrips] = useState<CompletedTripItem[]>([
    {
      id: 'trip_1',
      order: '#DRP-8812',
      restaurant: 'The Green Table',
      customer: 'Priya Sharma',
      baseEarnings: 65,
      surge: 20,
      tip: 30,
      total: 115,
      time: '1:15 PM',
      distance: '2.8 km',
    },
    {
      id: 'trip_2',
      order: '#DRP-8790',
      restaurant: 'Momo House & Asian Grill',
      customer: 'Karan Patel',
      baseEarnings: 75,
      surge: 15,
      tip: 40,
      total: 130,
      time: '12:30 PM',
      distance: '3.4 km',
    },
    {
      id: 'trip_3',
      order: '#DRP-8640',
      restaurant: 'Casa Napoli Pizza',
      customer: 'Rohan Mehta',
      baseEarnings: 80,
      surge: 30,
      tip: 25,
      total: 135,
      time: '11:45 AM',
      distance: '4.1 km',
    },
  ])

  // Wallet State
  const [cashoutModalOpen, setCashoutModalOpen] = useState(false)
  const [cashoutAmount, setCashoutAmount] = useState('1480')
  const [cashoutSuccess, setCashoutSuccess] = useState('')
  const [payoutLogs, setPayoutLogs] = useState([
    {
      id: 'tx_901',
      amount: 1250,
      date: 'Yesterday, 11:59 PM',
      status: 'Transferred to rajesh.kumar@okicici',
    },
    {
      id: 'tx_899',
      amount: 1680,
      date: 'Oct 01, 2026',
      status: 'Transferred to rajesh.kumar@okicici',
    },
  ])

  // Quick SMS Drawer
  const [smsDrawerOpen, setSmsDrawerOpen] = useState(false)
  const [sentSmsMsg, setSentSmsMsg] = useState('')

  // Emergency SOS Modal
  const [sosModalOpen, setSosModalOpen] = useState(false)

  // Offer Countdown Timer Effect
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
      customerPhone: '+91 98765 43210',
      payout: broadcastOffer.basePayout + broadcastOffer.surgeBonus,
      tip: broadcastOffer.tip,
      distance: broadcastOffer.distance,
      step: 'assigned',
    })
    setBroadcastOffer(null)
    setActiveTab('map')
  }

  function advanceStep() {
    if (!activeTask) return
    if (activeTask.step === 'assigned') {
      setActiveTask((prev) => (prev ? { ...prev, step: 'at_restaurant' } : null))
    } else if (activeTask.step === 'at_restaurant') {
      setActiveTask((prev) => (prev ? { ...prev, step: 'picked_up' } : null))
    } else if (activeTask.step === 'picked_up') {
      setActiveTask((prev) => (prev ? { ...prev, step: 'arrived_customer' } : null))
    }
  }

  function completeDelivery() {
    if (!activeTask) return
    const newTrip: CompletedTripItem = {
      id: `trip_${Date.now()}`,
      order: activeTask.orderNumber,
      restaurant: activeTask.restaurantName,
      customer: activeTask.customerName,
      baseEarnings: Math.round(activeTask.payout * 0.7),
      surge: Math.round(activeTask.payout * 0.3),
      tip: activeTask.tip,
      total: activeTask.payout + activeTask.tip,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      distance: activeTask.distance,
    }

    setCompletedTrips((prev) => [newTrip, ...prev])
    setCompletedSummaryModal(newTrip)
    setActiveTask(null)
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
    setSentSmsMsg(`SMS Sent to customer: "${templateText}"`)
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
    {
      id: 'map',
      label: 'Active Delivery Task',
      icon: Bike,
      badge: activeTask ? 'Active' : isOnline ? 'Searching' : 'Offline',
    },
    {
      id: 'history',
      label: 'Trip History Log',
      icon: History,
      badge: completedTrips.length.toString(),
    },
    { id: 'wallet', label: 'Wallet & Earnings', icon: Wallet, badge: `₹${totalEarningsToday}` },
    { id: 'incentives', label: 'Quests & Surge', icon: Target, badge: '+₹200' },
    { id: 'profile', label: 'Vehicle & Profile', icon: User, badge: 'Vehicle' },
    { id: 'settings', label: 'UPI Payout Settings', icon: Settings, badge: 'UPI' },
  ]

  return (
    <div className="flex min-h-screen bg-[#f8f9f7] text-[#18201c]">
      {/* Mobile Drawer Backdrop */}
      <div
        onClick={() => setSidebarOpen(false)}
        className={`fixed inset-0 z-40 bg-[#121815]/60 backdrop-blur-sm lg:hidden transition-opacity duration-300 ease-in-out ${
          sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* DESKTOP DARK STICKY SIDEBAR (EXACTLY MATCHING ADMIN SIDEBAR LAYOUT & FULL HEIGHT) */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex flex-col justify-between bg-[#121815] text-white transition-all duration-300 ease-in-out will-change-[width,transform] lg:sticky lg:top-0 lg:h-screen lg:left-0 lg:right-auto lg:border-r lg:border-[#202923] lg:translate-x-0 overflow-hidden ${
          sidebarOpen
            ? 'translate-x-0 shadow-2xl w-64 border-l border-[#202923]'
            : 'translate-x-full lg:shadow-none'
        } ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        <div className="flex flex-col justify-between h-full min-h-0 overflow-hidden">
          <div
            className={`flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto no-scrollbar transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'p-2.5' : 'p-4'}`}
          >
            {/* Sidebar Top Header (Matching Admin Brand Logo) */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 pt-1">
              <div
                className="flex items-center gap-2.5 group min-w-0"
                title={sidebarCollapsed ? 'crave. Driver' : undefined}
              >
                <span className="grid size-9 place-items-center rounded-xl bg-[#d9f447] text-[#121815] shadow-[0_4px_16px_rgba(217,244,71,0.35)] shrink-0 transition-transform duration-300 group-hover:scale-105">
                  <Bike className="size-5" />
                </span>
                <div
                  className={`flex items-center gap-1.5 transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
                    sidebarCollapsed
                      ? 'opacity-0 max-w-0 hidden lg:hidden'
                      : 'opacity-100 max-w-[160px]'
                  }`}
                >
                  <span className="text-lg font-bold tracking-tight text-white leading-none">
                    crave<span className="text-[#d9f447]">.</span>
                  </span>
                  <span className="rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-emerald-300 border border-emerald-500/30">
                    Driver
                  </span>
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
                <span
                  className={`transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
                    sidebarCollapsed ? 'opacity-0 max-w-0 hidden' : 'opacity-100 max-w-[120px]'
                  }`}
                >
                  Duty Status
                </span>
              </span>
              <span
                className={`uppercase text-[10px] tracking-wider font-extrabold transition-all duration-300 ease-in-out ${
                  sidebarCollapsed ? 'hidden' : 'block'
                }`}
              >
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
            </button>

            {/* Nav Items */}
            <nav className="flex flex-col gap-1">
              <p
                className={`px-3 text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1 transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
                  sidebarCollapsed ? 'opacity-0 max-h-0 mb-0 hidden' : 'opacity-100 max-h-6'
                }`}
              >
                Driver Controls
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
                      sidebarCollapsed
                        ? 'justify-center px-0 py-2.5'
                        : 'justify-between px-3.5 py-2.5'
                    } rounded-xl text-xs font-semibold transition-all duration-300 ease-in-out ${
                      isActive
                        ? 'bg-[#d9f447] text-[#121815] font-bold shadow-md'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={`size-4 shrink-0 transition-transform duration-300 ${isActive ? 'text-[#121815] scale-105' : 'text-[#d9f447]'}`}
                      />
                      <span
                        className={`truncate transition-all duration-300 ease-in-out whitespace-nowrap ${
                          sidebarCollapsed
                            ? 'opacity-0 max-w-0 hidden'
                            : 'opacity-100 max-w-[150px]'
                        }`}
                      >
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

          {/* Sidebar Footer & Single Minimize Toggle Arrow Button (Matching Admin) */}
          <div className="border-t border-white/10 p-3.5 flex flex-col gap-2 shrink-0 bg-[#121815]">
            <div
              className={`flex items-center ${sidebarCollapsed ? 'justify-center p-2' : 'justify-between p-2.5'} rounded-xl bg-white/5 transition-all duration-300 ease-in-out`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="grid size-8 place-items-center rounded-lg bg-blue-950 text-blue-300 font-bold border border-blue-800 text-xs shrink-0"
                  title={user?.name || 'Rajesh Kumar'}
                >
                  RK
                </span>
                <div
                  className={`transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap min-w-0 flex-1 ${
                    sidebarCollapsed ? 'opacity-0 max-w-0 hidden' : 'opacity-100 max-w-[130px]'
                  }`}
                >
                  <p className="text-xs font-bold text-white truncate">
                    {user?.name || 'Rajesh Kumar'}
                  </p>
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

            {/* Minimize Toggle Arrow Button */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? 'Expand Sidebar' : 'Minimize Sidebar'}
              className={`hidden lg:flex items-center ${
                sidebarCollapsed ? 'justify-center py-2.5' : 'justify-between px-3.5 py-2.5'
              } rounded-xl border border-white/10 bg-white/5 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-all duration-300 ease-in-out shrink-0`}
            >
              <span
                className={`transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
                  sidebarCollapsed ? 'opacity-0 max-w-0 hidden' : 'opacity-100 max-w-[130px]'
                }`}
              >
                Minimize Sidebar
              </span>
              <span className="transition-transform duration-300 ease-in-out">
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

      {/* MAIN CONTENT AREA (PC & MOBILE RESPONSIVE) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Sub-Header Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#e3e8de] bg-white/90 px-4 py-3.5 sm:px-6 lg:px-8 backdrop-blur-md">
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[#18201c] capitalize flex items-center gap-2">
              Driver Cockpit — {activeTab.replace('-', ' ')}
            </h1>
            <p className="text-xs text-[#737e77]">
              Vehicle:{' '}
              <span className="font-semibold text-[#18201c]">
                {user?.vehicleType || 'Electric Scooter (Ather 450X)'}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Test Simulation Radar Trigger */}
            <button
              onClick={triggerSimulatedOffer}
              className="hidden sm:flex items-center gap-1.5 rounded-full bg-amber-100 px-3.5 py-1.5 text-xs font-bold text-amber-900 border border-amber-300 hover:bg-amber-200 transition"
              title="Test Delivery Radar"
            >
              <Radio className="size-4 text-amber-700 animate-pulse" />
              <span>Radar Demo</span>
            </button>

            {/* Mobile Hamburger Menu Button */}
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open mobile navigation drawer"
              className="grid size-9 place-items-center rounded-xl border border-[#dfe4dc] bg-white shadow-xs lg:hidden hover:bg-gray-50 active:scale-95 transition"
            >
              <Menu className="size-5 text-[#18201c]" />
            </button>
          </div>
        </header>

        {/* Dashboard Body Content */}
        <div className="p-4 sm:p-6 lg:p-8 flex-1 flex flex-col justify-between">
          <div>
            {/* Top 4 KPI Overview Cards */}
            <div className="mb-6 sm:mb-8 grid gap-3 grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl sm:rounded-3xl border border-[#e2e7dc] bg-white p-3.5 sm:p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition">
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#737e77] truncate">
                      Today's Earnings
                    </p>
                    <span className="grid size-7 sm:size-9 place-items-center rounded-xl bg-emerald-100 text-emerald-800 font-bold shrink-0">
                      <DollarSign className="size-3.5 sm:size-5" />
                    </span>
                  </div>
                  <p className="mt-1 sm:mt-2 text-xl sm:text-3xl font-extrabold text-emerald-700">
                    ₹{totalEarningsToday}
                  </p>
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
                    <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#737e77] truncate">
                      Completed Drops
                    </p>
                    <span className="grid size-7 sm:size-9 place-items-center rounded-xl bg-blue-100 text-blue-800 font-bold shrink-0">
                      <CheckCircle2 className="size-3.5 sm:size-5" />
                    </span>
                  </div>
                  <p className="mt-1 sm:mt-2 text-xl sm:text-3xl font-extrabold text-[#18201c]">
                    {completedTrips.length}
                  </p>
                </div>
                <p className="mt-2 text-[11px] sm:text-xs text-emerald-600 font-semibold truncate">
                  100% On-time score
                </p>
              </div>

              <div className="rounded-2xl sm:rounded-3xl border border-[#e2e7dc] bg-white p-3.5 sm:p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition">
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#737e77] truncate">
                      Active Duty Time
                    </p>
                    <span className="grid size-7 sm:size-9 place-items-center rounded-xl bg-blue-100 text-blue-800 font-bold shrink-0">
                      <Clock3 className="size-3.5 sm:size-5" />
                    </span>
                  </div>
                  <p className="mt-1 sm:mt-2 text-xl sm:text-3xl font-extrabold text-[#18201c]">
                    4.5 hrs
                  </p>
                </div>
                <p className="mt-2 text-[11px] sm:text-xs text-blue-600 font-semibold truncate">
                  Online &amp; Accepting Drops
                </p>
              </div>

              <div className="rounded-2xl sm:rounded-3xl border border-[#e2e7dc] bg-white p-3.5 sm:p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition">
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#737e77] truncate">
                      Avg Delivery Pace
                    </p>
                    <span className="grid size-7 sm:size-9 place-items-center rounded-xl bg-[#f0f5db] text-[#718714] font-bold shrink-0">
                      <TrendingUp className="size-3.5 sm:size-5" />
                    </span>
                  </div>
                  <p className="mt-1 sm:mt-2 text-xl sm:text-3xl font-extrabold text-[#18201c]">
                    18 mins
                  </p>
                </div>
                <p className="mt-2 text-[11px] sm:text-xs text-emerald-600 font-medium truncate">
                  Optimal route efficiency
                </p>
              </div>
            </div>

            {/* TAB 1: ACTIVE TRIP & WORKFLOW JOURNEY */}
            {activeTab === 'map' && (
              <div className="max-w-4xl mx-auto flex flex-col gap-6">
                {/* STATE A: DRIVER OFFLINE */}
                {!isOnline && (
                  <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-md text-center flex flex-col items-center justify-center min-h-[320px]">
                    <div className="size-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 mb-4">
                      <Power className="size-8" />
                    </div>
                    <h3 className="text-xl font-bold text-[#18201c]">You're Currently Offline</h3>
                    <p className="text-xs text-[#737e77] max-w-sm mt-1.5">
                      Turn your duty status ON to start receiving high-payout food delivery orders
                      in your zone.
                    </p>
                    <button
                      onClick={() => setIsOnline(true)}
                      className="mt-6 rounded-full bg-emerald-600 px-8 py-3 text-xs font-bold text-white shadow-lg hover:bg-emerald-700 transition"
                    >
                      Go Online &amp; Start Looking for Orders
                    </button>
                  </div>
                )}

                {/* STATE B: DRIVER ONLINE & SEARCHING FOR ORDERS (activeTask === null) */}
                {isOnline && !activeTask && (
                  <div className="rounded-3xl border border-[#d9f447] bg-[#121815] p-8 shadow-xl text-white flex flex-col items-center justify-center min-h-[340px] text-center relative overflow-hidden">
                    {/* Pulsing Background Rings */}
                    <div className="absolute size-64 rounded-full border border-[#d9f447]/20 animate-ping" />
                    <div className="absolute size-48 rounded-full border border-[#d9f447]/30 animate-pulse" />

                    <div className="relative z-10 flex flex-col items-center">
                      <div className="size-16 rounded-full bg-[#d9f447] text-[#121815] grid place-items-center shadow-lg mb-4 animate-bounce">
                        <Radio className="size-8" />
                      </div>
                      <span className="rounded-full bg-[#d9f447]/20 px-3 py-1 text-[10px] font-extrabold uppercase text-[#d9f447] border border-[#d9f447]/40 tracking-wider">
                        Radar Active • Searching Orders
                      </span>
                      <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-white">
                        Looking for nearby delivery orders...
                      </h3>
                      <p className="mt-1.5 text-xs text-white/70 max-w-md">
                        Scanning kitchen queues in Indiranagar &amp; Koramangala. Stay online to
                        receive instant delivery broadcast offers.
                      </p>

                      <div className="mt-6 flex flex-wrap items-center gap-3 justify-center">
                        <button
                          onClick={triggerSimulatedOffer}
                          className="rounded-full bg-[#d9f447] px-6 py-3 text-xs font-extrabold text-[#121815] shadow-lg hover:bg-[#c2dc3a] transition flex items-center gap-2"
                        >
                          <Sparkles className="size-4" /> Simulate Incoming Order Request
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* STATE C: ACTIVE ORDER WORKFLOW STEP PROGRESS (activeTask !== null) */}
                {isOnline && activeTask && (
                  <div className="rounded-3xl border border-blue-200 bg-white p-4 sm:p-6 shadow-md">
                    {/* Active Order Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f0f3ec] pb-3 sm:pb-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-block rounded-full bg-blue-100 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[9px] sm:text-[10px] font-extrabold text-blue-800 uppercase tracking-wider">
                            Active Task Workflow
                          </span>
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            {activeTask.step === 'assigned' && 'Step 1: Going to Pickup'}
                            {activeTask.step === 'at_restaurant' && 'Step 2: Arrived at Kitchen'}
                            {activeTask.step === 'picked_up' && 'Step 3: En Route to Drop-off'}
                            {activeTask.step === 'arrived_customer' && 'Step 4: Customer Handoff'}
                          </span>
                        </div>
                        <h3 className="mt-1 text-base sm:text-xl font-bold text-[#18201c] truncate">
                          Order {activeTask.orderNumber} ({activeTask.distance})
                        </h3>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] sm:text-xs text-[#737e77] font-semibold">
                          Trip Payout
                        </p>
                        <p className="text-base sm:text-xl font-extrabold text-emerald-700">
                          ₹{activeTask.payout + activeTask.tip}
                        </p>
                      </div>
                    </div>

                    {/* Step Visualizer Card Content */}
                    <div className="mt-6 flex flex-col gap-5">
                      {/* Step 1 & 2: Restaurant Pickup Section */}
                      <div
                        className={`rounded-2xl p-4 border transition ${
                          activeTask.step === 'assigned' || activeTask.step === 'at_restaurant'
                            ? 'border-amber-400 bg-amber-50/70 shadow-sm'
                            : 'border-gray-200 bg-gray-50 opacity-60'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1">
                              <MapPin className="size-3 text-amber-600" /> Kitchen Pickup Location
                            </span>
                            <h4 className="font-bold text-base text-[#18201c] mt-0.5">
                              {activeTask.restaurantName}
                            </h4>
                            <p className="text-xs text-[#6e7771] mt-0.5">
                              {activeTask.restaurantAddress}
                            </p>
                          </div>
                          <a
                            href={`https://maps.google.com/?q=${encodeURIComponent(activeTask.restaurantAddress)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0 self-start rounded-full border border-amber-400 bg-white px-3.5 py-1.5 text-xs font-bold text-amber-900 flex items-center gap-1 shadow-sm hover:bg-amber-50"
                          >
                            <Navigation className="size-3 text-amber-700" /> GPS Map
                          </a>
                        </div>

                        {/* Step 2 specific actions */}
                        {activeTask.step === 'at_restaurant' && (
                          <div className="mt-3 pt-3 border-t border-amber-200/60 flex items-center justify-between text-xs">
                            <span className="font-semibold text-amber-900 flex items-center gap-1">
                              <Clock3 className="size-3.5" /> Order is being prepared in kitchen
                            </span>
                            <button
                              onClick={() => setDelayModalOpen(true)}
                              className="text-[11px] font-bold text-rose-700 hover:underline"
                            >
                              Report Order Delay
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Step 3 & 4: Customer Drop-off Section */}
                      <div
                        className={`rounded-2xl p-4 border transition ${
                          activeTask.step === 'picked_up' || activeTask.step === 'arrived_customer'
                            ? 'border-blue-400 bg-blue-50/70 shadow-sm'
                            : 'border-gray-200 bg-gray-50 opacity-60'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1">
                              <User className="size-3 text-blue-600" /> Customer Delivery Doorstep
                            </span>
                            <h4 className="font-bold text-base text-[#18201c] mt-0.5">
                              {activeTask.customerName}
                            </h4>
                            <p className="text-xs text-[#6e7771] mt-0.5">
                              {activeTask.customerAddress}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
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

                        {/* Step 4 PIN OTP Verification Form */}
                        {activeTask.step === 'arrived_customer' && (
                          <div className="mt-4 pt-3 border-t border-blue-200 bg-white p-3.5 rounded-xl border">
                            <label className="block text-xs font-bold text-[#18201c] mb-1">
                              Ask Customer for 4-Digit Delivery PIN:
                            </label>
                            <div className="flex items-center gap-3">
                              <input
                                type="text"
                                maxLength={4}
                                value={otpInput}
                                onChange={(e) => setOtpInput(e.target.value)}
                                className="w-32 rounded-xl border border-blue-300 px-3 py-2 text-center text-base font-extrabold tracking-widest outline-none focus:border-blue-600"
                                placeholder="4921"
                              />
                              <span className="text-xs text-gray-500 font-medium">
                                Default PIN: 4921
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Primary Workflow CTA Action Button */}
                      {activeTask.step === 'assigned' && (
                        <button
                          onClick={advanceStep}
                          className="mt-2 w-full rounded-full bg-[#18201c] py-3.5 text-xs font-bold text-white shadow-md transition hover:bg-[#323d36] flex items-center justify-center gap-2"
                        >
                          <Navigation className="size-4 text-[#d9f447]" /> Navigate to Pickup
                          Kitchen
                        </button>
                      )}

                      {activeTask.step === 'at_restaurant' && (
                        <button
                          onClick={advanceStep}
                          className="mt-2 w-full rounded-full bg-amber-600 py-3.5 text-xs font-bold text-white shadow-md transition hover:bg-amber-700 flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 className="size-4 text-white" /> Confirm Pickup &amp;
                          Collect Bag
                        </button>
                      )}

                      {activeTask.step === 'picked_up' && (
                        <button
                          onClick={advanceStep}
                          className="mt-2 w-full rounded-full bg-blue-600 py-3.5 text-xs font-bold text-white shadow-md transition hover:bg-blue-700 flex items-center justify-center gap-2"
                        >
                          <Navigation className="size-4 text-white" /> Arrived at Customer Doorstep
                        </button>
                      )}

                      {activeTask.step === 'arrived_customer' && (
                        <button
                          onClick={completeDelivery}
                          className="mt-2 w-full rounded-full bg-emerald-600 py-3.5 text-xs font-bold text-white shadow-md transition hover:bg-emerald-700 flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 className="size-4 text-white" /> Verify PIN &amp; Complete
                          Delivery
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: TRIP HISTORY LOG */}
            {activeTab === 'history' && (
              <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#f0f3ec] pb-4">
                  <div>
                    <h3 className="text-xl font-bold text-[#18201c]">Completed Delivery History</h3>
                    <p className="text-xs text-gray-500">
                      Detailed logs of all completed drops and payouts.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                    {completedTrips.length} Total Deliveries Completed Today
                  </span>
                </div>

                <div className="mt-6 flex flex-col gap-4">
                  {completedTrips.map((trip) => (
                    <div
                      key={trip.id}
                      className="rounded-2xl border border-gray-200 p-4 bg-white hover:border-gray-300 transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-4">
                        <div className="grid size-10 place-items-center rounded-2xl bg-emerald-100 text-emerald-800 font-bold shrink-0">
                          <Check className="size-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#18201c]">{trip.order}</span>
                            <span className="text-[10px] text-gray-500 font-mono">{trip.time}</span>
                          </div>
                          <p className="text-xs font-semibold text-gray-800 mt-1">
                            {trip.restaurant} ➔ {trip.customer}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            Distance: {trip.distance}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 text-xs">
                        <div className="text-right">
                          <p className="text-[10px] text-gray-500 font-bold uppercase">Breakdown</p>
                          <p className="text-[11px] text-gray-600">
                            Base ₹{trip.baseEarnings} + Surge ₹{trip.surge} + Tip ₹{trip.tip}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-emerald-700 font-bold uppercase">
                            Total Earned
                          </p>
                          <p className="text-base font-extrabold text-emerald-700">₹{trip.total}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: WALLET & EARNINGS */}
            {activeTab === 'wallet' && (
              <div className="flex flex-col gap-6">
                <div className="rounded-3xl border border-[#dfe4dc] bg-[#121815] p-6 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#d9f447]">
                      Available Wallet Balance
                    </p>
                    <h2 className="text-4xl font-extrabold mt-1 text-white">₹1,480.00</h2>
                    <p className="text-xs text-white/60 mt-1">
                      Direct Bank / UPI VPA Instant Transfer Available
                    </p>
                  </div>
                  <button
                    onClick={() => setCashoutModalOpen(true)}
                    className="rounded-full bg-[#d9f447] px-6 py-3 text-xs font-extrabold text-[#121815] shadow-md hover:bg-[#c2dc3a] transition shrink-0"
                  >
                    Request Instant Payout
                  </button>
                </div>

                <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-[#18201c] mb-4">
                    Payout Transaction History
                  </h3>
                  <div className="flex flex-col gap-3">
                    {payoutLogs.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 border border-gray-100 text-xs"
                      >
                        <div>
                          <p className="font-bold text-[#18201c]">{tx.status}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{tx.date}</p>
                        </div>
                        <span className="font-extrabold text-emerald-700 text-sm">
                          ₹{tx.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: QUESTS & SURGE */}
            {activeTab === 'incentives' && (
              <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm flex flex-col gap-6">
                <div>
                  <h3 className="text-xl font-bold text-[#18201c]">
                    Daily Quests & Surge Incentives
                  </h3>
                  <p className="text-xs text-gray-500">
                    Complete delivery milestones today to unlock instant cash bonuses.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                    <span className="text-[10px] font-bold uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                      Quest 1
                    </span>
                    <h4 className="font-bold text-sm text-[#18201c] mt-2">
                      Complete 5 Drops before 3 PM
                    </h4>
                    <p className="text-xs text-gray-600 mt-1">
                      Reward: Extra ₹150 flat surge bonus
                    </p>
                    <div className="mt-3 flex items-center justify-between text-xs font-bold text-emerald-800">
                      <span>Progress: 3 / 5 drops</span>
                      <span>60%</span>
                    </div>
                    <div className="mt-1.5 h-2 w-full bg-emerald-200 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-600 w-3/5 rounded-full" />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-4">
                    <span className="text-[10px] font-bold uppercase text-purple-800 bg-purple-100 px-2 py-0.5 rounded-md">
                      Quest 2
                    </span>
                    <h4 className="font-bold text-sm text-[#18201c] mt-2">
                      Peak Hour Streak (7 PM - 10 PM)
                    </h4>
                    <p className="text-xs text-gray-600 mt-1">Reward: ₹50 extra bonus per drop</p>
                    <span className="mt-3 inline-block text-xs font-bold text-purple-700">
                      Starts tonight at 7:00 PM
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: PROFILE & VEHICLE */}
            {activeTab === 'profile' && (
              <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm flex flex-col gap-6">
                <div>
                  <h3 className="text-xl font-bold text-[#18201c]">
                    Driver Profile & Vehicle Specs
                  </h3>
                  <p className="text-xs text-gray-500">
                    Registered delivery partner vehicle details and documents.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-gray-200 p-4 bg-gray-50 text-xs flex flex-col gap-2">
                    <p className="font-bold text-gray-700 text-xs uppercase">Vehicle Info</p>
                    <p className="font-semibold text-sm text-[#18201c]">Ather 450X EV Scooter</p>
                    <p className="text-gray-600">Reg No: KA 01 EV 9821</p>
                    <p className="text-gray-600">Type: Commercial EV Two-Wheeler</p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-4 bg-gray-50 text-xs flex flex-col gap-2">
                    <p className="font-bold text-gray-700 text-xs uppercase">Partner Status</p>
                    <p className="font-semibold text-sm text-emerald-700">Active Verified Driver</p>
                    <p className="text-gray-600">Zone: Indiranagar & Koramangala, Bangalore</p>
                    <p className="text-gray-600">KYC Status: Verified</p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: UPI PAYOUT & SETTINGS */}
            {activeTab === 'settings' && (
              <div className="flex flex-col gap-6">
                {/* Header Banner */}
                <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#f0f3ec] pb-4">
                    <div>
                      <h3 className="text-xl font-bold text-[#18201c] flex items-center gap-2">
                        <QrCode className="size-6 text-emerald-600" /> UPI Payout & Bank Account
                        Setup
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        Configure NPCI-verified UPI IDs for 1-click instant earnings settlement.
                      </p>
                    </div>
                    <span className="mt-2 sm:mt-0 text-xs font-extrabold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-300 flex items-center gap-1">
                      <ShieldCheck className="size-4 text-emerald-700" /> NPCI Instant Transfer
                      Active
                    </span>
                  </div>

                  {upiSaveSuccess && (
                    <div className="mt-4 rounded-2xl bg-emerald-500 text-[#121815] p-3.5 text-xs font-bold shadow-md border border-emerald-400 animate-in fade-in">
                      {upiSaveSuccess}
                    </div>
                  )}

                  {/* Add New UPI ID Form */}
                  <form
                    onSubmit={handleAddUpiId}
                    className="mt-6 flex flex-col gap-4 rounded-2xl bg-[#f8f9f7] p-4 border border-[#e5e9e1]"
                  >
                    <h4 className="font-bold text-sm text-[#18201c] flex items-center gap-1.5">
                      <Plus className="size-4 text-emerald-600" /> Register New UPI VPA ID
                    </h4>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Enter UPI ID / VPA Handle:
                        </label>
                        <input
                          type="text"
                          required
                          value={newUpiVpa}
                          onChange={(e) => setNewUpiVpa(e.target.value)}
                          placeholder="e.g. rajesh.kumar@okicici or 9876543210@paytm"
                          className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs font-bold text-[#18201c] outline-none focus:border-emerald-600 shadow-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          UPI Provider / Payment App:
                        </label>
                        <select
                          value={newUpiProvider}
                          onChange={(e) => setNewUpiProvider(e.target.value)}
                          className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs font-bold text-[#18201c] outline-none focus:border-emerald-600 shadow-xs"
                        >
                          <option value="Google Pay / PhonePe UPI">
                            Google Pay / PhonePe (GPay / YBL)
                          </option>
                          <option value="Paytm Payments Bank">Paytm Payments Bank (@paytm)</option>
                          <option value="BHIM NPCI UPI">BHIM NPCI UPI (@upi)</option>
                          <option value="ICICI Bank iMobile">ICICI Bank (@okicici)</option>
                          <option value="HDFC / Axis Bank">
                            HDFC / Axis Bank (@ybl / @okhdfcbank)
                          </option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="rounded-full bg-emerald-600 px-6 py-2.5 text-xs font-extrabold text-white shadow-md hover:bg-emerald-700 transition flex items-center gap-1.5"
                      >
                        <ShieldCheck className="size-4" /> Verify &amp; Save UPI ID
                      </button>
                    </div>
                  </form>
                </div>

                {/* Saved Registered UPI Accounts */}
                <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-[#18201c] mb-4">
                    Saved UPI Payout Destinations
                  </h3>

                  <div className="flex flex-col gap-3">
                    {savedUpiList.map((upi) => (
                      <div
                        key={upi.id}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition ${
                          upi.isPrimary
                            ? 'border-emerald-400 bg-emerald-50/60 shadow-xs'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="primaryUpi"
                            checked={upi.isPrimary}
                            onChange={() => setPrimaryUpi(upi.id)}
                            className="size-4 accent-emerald-600 cursor-pointer"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-sm text-[#18201c]">
                                {upi.vpa}
                              </span>
                              {upi.isPrimary && (
                                <span className="rounded-full bg-emerald-600 text-white px-2 py-0.5 text-[9px] font-extrabold uppercase">
                                  Default Payout
                                </span>
                              )}
                              {upi.isVerified && (
                                <span className="text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-300">
                                  ✓ NPCI Verified
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{upi.bankName}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 mt-3 sm:mt-0 justify-end">
                          {!upi.isPrimary && (
                            <button
                              onClick={() => setPrimaryUpi(upi.id)}
                              className="text-xs font-bold text-emerald-700 hover:underline"
                            >
                              Make Primary
                            </button>
                          )}
                          {!upi.isPrimary && (
                            <button
                              onClick={() => deleteUpiId(upi.id)}
                              className="text-rose-600 hover:text-rose-800 p-1.5 rounded-lg hover:bg-rose-100 transition"
                              title="Delete UPI handle"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bank Account Direct Transfer Fallback */}
                <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-[#18201c] mb-1">
                    Direct Bank Account (Fallback NEFT/IMPS)
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Secondary destination if UPI network is temporarily unavailable.
                  </p>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4 text-xs flex flex-col gap-1.5">
                      <p className="text-gray-500 font-bold uppercase">Account Holder</p>
                      <p className="font-bold text-sm text-[#18201c]">
                        {user?.name || 'Rajesh Kumar'}
                      </p>
                      <p className="text-gray-600">Bank Name: ICICI Bank Ltd</p>
                    </div>

                    <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4 text-xs flex flex-col gap-1.5">
                      <p className="text-gray-500 font-bold uppercase">Account &amp; IFSC</p>
                      <p className="font-mono font-bold text-sm text-[#18201c]">•••• •••• 4921</p>
                      <p className="text-gray-600 font-mono">IFSC: ICIC0001024</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MOBILE BOTTOM NAVIGATION BAR (lg:hidden) */}
        <nav className="lg:hidden sticky bottom-0 z-30 flex items-center justify-around border-t border-[#24302a] bg-[#121815] p-2 text-white shadow-2xl">
          <button
            onClick={() => setActiveTab('map')}
            className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition ${
              activeTab === 'map' ? 'text-[#d9f447] font-bold' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Navigation className="size-4" />
            <span className="text-[9px]">Map</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition ${
              activeTab === 'history'
                ? 'text-[#d9f447] font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <History className="size-4" />
            <span className="text-[9px]">History</span>
          </button>

          <button
            onClick={() => setActiveTab('wallet')}
            className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition ${
              activeTab === 'wallet' ? 'text-[#d9f447] font-bold' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Wallet className="size-4" />
            <span className="text-[9px]">Wallet</span>
          </button>

          <button
            onClick={() => setActiveTab('incentives')}
            className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition ${
              activeTab === 'incentives'
                ? 'text-[#d9f447] font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Target className="size-4" />
            <span className="text-[9px]">Quests</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition ${
              activeTab === 'settings'
                ? 'text-[#d9f447] font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Settings className="size-4" />
            <span className="text-[9px]">UPI</span>
          </button>
        </nav>
      </div>

      {/* NEW ORDER REQUEST BROADCAST POPUP MODAL */}
      {broadcastOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#121815]/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl border-2 border-[#d9f447] bg-[#121815] p-5 text-white shadow-2xl relative overflow-hidden">
            {/* Top Timer Bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gray-800">
              <div
                style={{ width: `${(offerTimer / 15) * 100}%` }}
                className="h-full bg-[#d9f447] transition-all duration-1000 ease-linear"
              />
            </div>

            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-[#d9f447] animate-ping" />
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#d9f447]">
                  New Delivery Offer ({offerTimer}s)
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-white/60">
                {broadcastOffer.orderNumber}
              </span>
            </div>

            <div className="mt-3 flex flex-col gap-2.5">
              <div>
                <span className="text-[9px] font-bold uppercase text-amber-400">
                  Pickup Kitchen
                </span>
                <h3 className="text-base font-bold text-white">{broadcastOffer.restaurantName}</h3>
                <p className="text-xs text-white/70 flex items-center gap-1 mt-0.5">
                  <MapPin className="size-3 text-amber-400" /> {broadcastOffer.restaurantAddress}
                </p>
              </div>

              <div className="border-t border-white/10 pt-2">
                <span className="text-[9px] font-bold uppercase text-blue-400">
                  Customer Delivery Zone
                </span>
                <p className="text-xs text-white/90 font-semibold mt-0.5">
                  {broadcastOffer.customerAddress}
                </p>
                <p className="text-[10px] text-white/60 mt-0.5">
                  Distance: {broadcastOffer.distance}
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 p-3 flex items-center justify-between border border-white/10">
                <div>
                  <p className="text-[9px] font-bold uppercase text-[#d9f447]">
                    Estimated Total Payout
                  </p>
                  <p className="text-xl font-extrabold text-emerald-400">
                    ₹{broadcastOffer.basePayout + broadcastOffer.surgeBonus + broadcastOffer.tip}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-[#d9f447] bg-[#1d2722] px-2 py-0.5 rounded-md border border-[#303f37]">
                    ~18 mins total
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setBroadcastOffer(null)}
                className="rounded-full border border-white/20 bg-white/5 py-2.5 text-xs font-bold text-white hover:bg-white/10 transition"
              >
                Reject / Skip
              </button>
              <button
                onClick={acceptBroadcastOffer}
                className="rounded-full bg-[#d9f447] py-2.5 text-xs font-extrabold text-[#121815] shadow-lg hover:bg-[#c2dc3a] transition"
              >
                ACCEPT ORDER
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELIVERY COMPLETED SUMMARY MODAL */}
      {completedSummaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#121815]/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl border border-emerald-400 bg-white p-5 shadow-2xl text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-600 mb-3 shadow-lg">
              <CheckCircle2 className="size-8" />
            </div>

            <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider">
              Delivery Complete
            </span>
            <h3 className="mt-1.5 text-xl font-extrabold text-[#18201c]">
              Order {completedSummaryModal.order}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Delivered to {completedSummaryModal.customer}
            </p>

            <div className="mt-4 rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 text-center">
              <p className="text-[10px] font-bold text-emerald-800 uppercase">
                Payout Credited to Wallet
              </p>
              <p className="text-2xl font-extrabold text-emerald-700 mt-0.5">
                ₹{completedSummaryModal.total}
              </p>
            </div>

            <button
              onClick={() => setCompletedSummaryModal(null)}
              className="mt-5 w-full rounded-full bg-[#18201c] py-3 text-xs font-extrabold text-white shadow-lg hover:bg-[#323d36] transition"
            >
              BACK ONLINE & SEARCH NEXT ORDER
            </button>
          </div>
        </div>
      )}

      {/* KITCHEN DELAY MODAL */}
      {delayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#121815]/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-5 shadow-2xl text-left">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5 mb-3">
              <h3 className="font-bold text-sm text-[#18201c]">Report Kitchen Delay</h3>
              <button
                onClick={() => setDelayModalOpen(false)}
                className="text-gray-400 hover:text-black"
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-2.5">Select the reason for delay at kitchen:</p>

            <div className="flex flex-col gap-2 text-xs">
              {[
                'Order is still being cooked',
                'Kitchen is heavily rushed',
                'Packaging item missing',
                'Other delay reason',
              ].map((reason, idx) => (
                <button
                  key={idx}
                  onClick={() => setDelayModalOpen(false)}
                  className="rounded-xl border border-gray-200 p-2.5 text-left font-semibold text-[#18201c] hover:bg-amber-50 hover:border-amber-300 transition"
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* INSTANT CASHOUT MODAL */}
      {cashoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#121815]/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-5 shadow-2xl text-left">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5 mb-3">
              <h3 className="font-bold text-sm text-[#18201c] flex items-center gap-2">
                <Wallet className="size-4 text-emerald-600" /> Instant Wallet Cashout
              </h3>
              <button
                onClick={() => setCashoutModalOpen(false)}
                className="text-gray-400 hover:text-black"
              >
                <X className="size-4" />
              </button>
            </div>

            {cashoutSuccess ? (
              <div className="rounded-2xl bg-emerald-100 p-3.5 text-center text-xs font-bold text-emerald-900 border border-emerald-200">
                {cashoutSuccess}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Enter Cashout Amount (₹):
                  </label>
                  <input
                    type="number"
                    value={cashoutAmount}
                    onChange={(e) => setCashoutAmount(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm font-bold outline-none focus:border-emerald-600"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">Available balance: ₹1,480.00</p>
                </div>

                <div className="rounded-xl bg-gray-50 p-2.5 text-xs text-gray-600 border border-gray-200">
                  <p className="font-bold text-gray-800">Destination VPA Account:</p>
                  <p className="font-mono mt-0.5 text-emerald-700">rajesh.kumar@okicici</p>
                </div>

                <button
                  onClick={handleInstantCashout}
                  className="w-full rounded-full bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition"
                >
                  Confirm Instant Transfer
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* QUICK SMS TEMPLATE DRAWER */}
      {smsDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#121815]/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-5 shadow-2xl text-left">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5 mb-3">
              <h3 className="font-bold text-sm text-[#18201c] flex items-center gap-2">
                <MessageSquare className="size-4 text-blue-600" /> Send Quick Customer SMS
              </h3>
              <button
                onClick={() => setSmsDrawerOpen(false)}
                className="text-gray-400 hover:text-black"
              >
                <X className="size-4" />
              </button>
            </div>

            {sentSmsMsg ? (
              <div className="rounded-2xl bg-blue-100 p-3.5 text-center text-xs font-bold text-blue-900 border border-blue-200">
                {sentSmsMsg}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {[
                  "I'm at the kitchen collecting your fresh food order!",
                  'On my way with your order! ETA ~10 minutes.',
                  'I have arrived at your building doorstep / lobby.',
                  'Please share your 4-digit PIN for order delivery.',
                ].map((txt, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendQuickSms(txt)}
                    className="rounded-xl border border-gray-200 p-2.5 text-left text-xs font-medium text-[#18201c] hover:bg-blue-50 hover:border-blue-300 transition"
                  >
                    "{txt}"
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
