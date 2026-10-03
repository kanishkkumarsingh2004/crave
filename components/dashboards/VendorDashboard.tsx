'use client'

import { useAuth } from '@/lib/auth-context'
import {
  BarChart3,
  Check,
  CheckCircle2,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  Clock3,
  DollarSign,
  Edit3,
  FileText,
  LayoutDashboard,
  LogOut,
  Plus,
  Power,
  Search,
  Settings,
  Store,
  Tag,
  Trash2,
  TrendingUp,
  UtensilsCrossed,
  Volume2,
  VolumeX,
  Wallet,
  X,
} from 'lucide-react'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'

interface OrderItem {
  name: string
  qty: number
  price: number
}

interface IncomingOrder {
  id: string
  customerName: string
  customerPhone: string
  customerAddress: string
  items: OrderItem[]
  total: number
  packagingFee: number
  gst: number
  status: 'new' | 'preparing' | 'ready' | 'completed'
  timeAgo: string
  cookingNotes?: string
  deliveryDriver?: string
  driverPhone?: string
  paymentMethod: 'UPI Online' | 'UPI Prepaid'
}

interface MenuItem {
  id: string
  name: string
  category: string
  price: number
  inStock: boolean
  image: string
  description?: string
}

export default function VendorDashboard() {
  const { user, logout } = useAuth()
  const [isOpen, setIsOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<
    'orders' | 'orders-table' | 'menu' | 'coupons' | 'analytics' | 'payouts' | 'settings'
  >('orders')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    const handleToggle = () => setSidebarOpen((v) => !v)
    window.addEventListener('toggle-mobile-sidebar', handleToggle)
    return () => window.removeEventListener('toggle-mobile-sidebar', handleToggle)
  }, [])
  const [soundAlerts, setSoundAlerts] = useState(true)
  const [prepTimeBuffer, setPrepTimeBuffer] = useState<number>(15)
  const [orderSearchQuery, setOrderSearchQuery] = useState('')
  const [orderViewMode, setOrderViewMode] = useState<'kanban' | 'table'>('table')
  const [orderTableFilter, setOrderTableFilter] = useState<
    'all' | 'new' | 'preparing' | 'ready' | 'completed'
  >('all')

  // Live incoming orders state with cooking notes & driver details
  const [orders, setOrders] = useState<IncomingOrder[]>([
    {
      id: 'DRP-9021',
      customerName: 'Alex Rivera',
      customerPhone: '+91 98765 43210',
      customerAddress: 'Flat 402, Sunshine Heights, Indiranagar',
      items: [
        { name: 'Basil Pesto Quinoa Bowl', qty: 2, price: 289 },
        { name: 'Smoky Paneer Tikka Wrap', qty: 1, price: 249 },
      ],
      packagingFee: 30,
      gst: 41,
      total: 898,
      status: 'new',
      timeAgo: '2 mins ago',
      cookingNotes: 'Extra pesto sauce on top. No onions in the wrap please!',
      paymentMethod: 'UPI Online',
    },
    {
      id: 'DRP-8840',
      customerName: 'Priya Sharma',
      customerPhone: '+91 98450 11223',
      customerAddress: 'Villa 12, Palm Meadows, Whitefield',
      items: [{ name: 'Steamed Truffle Edamame Momos', qty: 3, price: 320 }],
      packagingFee: 20,
      gst: 48,
      total: 1028,
      status: 'preparing',
      timeAgo: '12 mins ago',
      cookingNotes: 'Please pack chili oil dip separately.',
      deliveryDriver: 'Rajesh Kumar (Arriving in 4 min)',
      driverPhone: '+91 91234 56789',
      paymentMethod: 'UPI Online',
    },
    {
      id: 'DRP-8712',
      customerName: 'Karan Patel',
      customerPhone: '+91 99100 55443',
      customerAddress: 'Block C, Koramangala 5th Block',
      items: [{ name: 'Basil Pesto Quinoa Bowl', qty: 1, price: 289 }],
      packagingFee: 15,
      gst: 14,
      total: 318,
      status: 'ready',
      timeAgo: '22 mins ago',
      deliveryDriver: 'Suresh V (Driver assigned)',
      driverPhone: '+91 98989 00112',
      paymentMethod: 'UPI Online',
    },
  ])

  // Menu Catalog State
  const [menuItems, setMenuItems] = useState<MenuItem[]>([
    {
      id: 'mn_1',
      name: 'Basil Pesto Quinoa Bowl',
      category: 'Bowls',
      price: 289,
      inStock: true,
      description:
        'Organic quinoa topped with wild basil pesto, roasted cherry tomatoes & toasted pine nuts.',
      image:
        'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=300&q=80',
    },
    {
      id: 'mn_2',
      name: 'Smoky Paneer Tikka Wrap',
      category: 'Wraps',
      price: 249,
      inStock: true,
      description:
        'Char-grilled cottage cheese wrapped in whole wheat tortilla with mint yogurt sauce.',
      image:
        'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=300&q=80',
    },
    {
      id: 'mn_3',
      name: 'Steamed Truffle Edamame Momos',
      category: 'Starters',
      price: 320,
      inStock: false,
      description:
        'Delicate dumplings stuffed with smashed edamame and infused with black truffle oil.',
      image:
        'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=300&q=80',
    },
  ])

  // Modals & Interactivity State
  const [selectedOrderModal, setSelectedOrderModal] = useState<IncomingOrder | null>(null)
  const [showAddDishModal, setShowAddDishModal] = useState(false)
  const [editingDish, setEditingDish] = useState<MenuItem | null>(null)

  // New Dish Form State
  const [dishName, setDishName] = useState('')
  const [dishPrice, setDishPrice] = useState('')
  const [dishCategory, setDishCategory] = useState('Main Course')
  const [dishDescription, setDishDescription] = useState('')

  // Payout State
  const [payoutModalOpen, setPayoutModalOpen] = useState(false)
  const [payoutAmount, setPayoutAmount] = useState('14280')
  const [payoutSuccessMsg, setPayoutSuccessMsg] = useState('')
  const [payoutHistory, setPayoutHistory] = useState([
    {
      id: 'pay_99',
      amount: 12450,
      date: 'Yesterday, 11:30 PM',
      status: 'Settled to HDFC Bank ****4921',
    },
    { id: 'pay_98', amount: 18900, date: 'Oct 01, 2026', status: 'Settled to HDFC Bank ****4921' },
  ])

  function updateOrderStatus(orderId: string, newStatus: IncomingOrder['status']) {
    setOrders((prev) =>
      prev.map((ord) => (ord.id === orderId ? { ...ord, status: newStatus } : ord))
    )
  }

  function toggleItemStock(itemId: string) {
    setMenuItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, inStock: !item.inStock } : item))
    )
  }

  function deleteMenuItem(itemId: string) {
    setMenuItems((prev) => prev.filter((item) => item.id !== itemId))
  }

  function handleSaveDish(e: React.FormEvent) {
    e.preventDefault()
    if (!dishName || !dishPrice) return

    if (editingDish) {
      setMenuItems((prev) =>
        prev.map((item) =>
          item.id === editingDish.id
            ? {
                ...item,
                name: dishName,
                price: parseFloat(dishPrice),
                category: dishCategory,
                description: dishDescription,
              }
            : item
        )
      )
      setEditingDish(null)
    } else {
      const newDish: MenuItem = {
        id: `mn_${Date.now()}`,
        name: dishName,
        price: parseFloat(dishPrice),
        category: dishCategory,
        description: dishDescription,
        inStock: true,
        image:
          'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80',
      }
      setMenuItems((prev) => [...prev, newDish])
    }

    setDishName('')
    setDishPrice('')
    setDishDescription('')
    setShowAddDishModal(false)
  }

  function openEditDishModal(item: MenuItem) {
    setEditingDish(item)
    setDishName(item.name)
    setDishPrice(item.price.toString())
    setDishCategory(item.category)
    setDishDescription(item.description || '')
    setShowAddDishModal(true)
  }

  function handleRequestPayout() {
    if (!payoutAmount || parseFloat(payoutAmount) <= 0) return
    const amount = parseFloat(payoutAmount)
    setPayoutSuccessMsg(
      `₹${amount.toLocaleString('en-IN')} has been transferred to your registered Bank Account!`
    )
    setPayoutHistory((prev) => [
      {
        id: `pay_${Date.now()}`,
        amount,
        date: 'Just Now',
        status: 'Settled to HDFC Bank ****4921',
      },
      ...prev,
    ])
    setTimeout(() => {
      setPayoutSuccessMsg('')
      setPayoutModalOpen(false)
    }, 2500)
  }

  const filteredOrders = orders.filter(
    (o) =>
      o.id.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(orderSearchQuery.toLowerCase())
  )

  const tableFilteredOrders = filteredOrders.filter((ord) => {
    if (orderTableFilter === 'all') return true
    return ord.status === orderTableFilter
  })

  const activeOrdersCount = orders.filter((o) => o.status !== 'completed').length

  const navItems = [
    {
      id: 'orders',
      label: 'Kitchen Dashboard',
      icon: LayoutDashboard,
      badge: activeOrdersCount > 0 ? `${activeOrdersCount} Active` : null,
    },
    {
      id: 'orders-table',
      label: 'All Orders (Table View)',
      icon: FileText,
      badge: `${orders.length}`,
    },
    { id: 'menu', label: 'Menu Catalog Manager', icon: Store, badge: menuItems.length.toString() },
    { id: 'coupons', label: 'Store Coupons & Offers', icon: Tag, badge: 'Promo' },
    { id: 'analytics', label: 'Sales & Analytics', icon: BarChart3, badge: '+18%' },
    { id: 'payouts', label: 'Wallet & Payouts', icon: Wallet, badge: '₹14.2k' },
    { id: 'settings', label: 'Store Profile', icon: Settings, badge: null },
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

      {/* Vendor Sidebar Navigation (Matching Admin Theme & Colors) */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex flex-col justify-between bg-[#121815] text-white transition-all duration-300 ease-in-out will-change-[width,transform] lg:sticky lg:top-[65px] lg:h-[calc(100vh-65px)] lg:left-0 lg:right-auto lg:border-r lg:border-[#202923] lg:translate-x-0 ${
          sidebarOpen
            ? 'translate-x-0 shadow-2xl w-72 border-l border-[#202923]'
            : 'translate-x-full lg:shadow-none'
        } ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        <div className="flex flex-col justify-between h-full min-h-0">
          <div
            className={`flex-1 min-h-0 flex flex-col gap-6 overflow-y-auto no-scrollbar transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'p-2.5' : 'p-4'}`}
          >
            {/* Logo & Header matching Admin */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 pt-1">
              <Link
                href="/vendor/dashboard"
                className="flex items-center gap-2.5 group min-w-0"
                title={sidebarCollapsed ? user?.restaurantName || 'The Green Table' : undefined}
              >
                <span className="grid size-9 place-items-center rounded-xl bg-[#d9f447] text-[#121815] shadow-[0_4px_16px_rgba(217,244,71,0.35)] shrink-0 transition-transform duration-300 group-hover:scale-105">
                  <UtensilsCrossed className="size-5 fill-current" />
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
                  <span className="rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-amber-300 border border-amber-500/30">
                    Vendor
                  </span>
                </div>
              </Link>

              <button
                onClick={() => setSidebarOpen(false)}
                className="grid size-7 place-items-center rounded-lg bg-white/10 text-white lg:hidden transition hover:bg-white/20"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Kitchen Online/Offline Toggle inside Sidebar */}
            <button
              onClick={() => setIsOpen((prev) => !prev)}
              title={sidebarCollapsed ? (isOpen ? 'Kitchen Open' : 'Kitchen Closed') : undefined}
              className={`flex items-center ${
                sidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2.5'
              } rounded-xl text-xs font-bold transition shadow-sm ${
                isOpen ? 'bg-emerald-500 text-[#121815]' : 'bg-rose-600 text-white'
              }`}
            >
              <span className="flex items-center gap-2 min-w-0">
                <Power className="size-4 shrink-0" />
                <span
                  className={`transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
                    sidebarCollapsed ? 'opacity-0 max-w-0 hidden' : 'opacity-100 max-w-[120px]'
                  }`}
                >
                  Kitchen Status
                </span>
              </span>
              <span
                className={`uppercase text-[10px] tracking-wider font-extrabold transition-all duration-300 ease-in-out shrink-0 ${
                  sidebarCollapsed ? 'hidden' : 'block'
                }`}
              >
                {isOpen ? 'OPEN' : 'CLOSED'}
              </span>
            </button>

            {/* Navigation Links */}
            <nav className="flex flex-col gap-1">
              <p
                className={`px-3 text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1 transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
                  sidebarCollapsed ? 'opacity-0 max-h-0 mb-0 hidden' : 'opacity-100 max-h-6'
                }`}
              >
                Kitchen Management
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
                        ? 'justify-center px-0 py-3'
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

          {/* Sidebar Bottom Profile & Single Minimize Toggle Arrow Button */}
          <div className="border-t border-white/10 p-3.5 flex flex-col gap-2 transition-all duration-300 ease-in-out bg-[#121815] shrink-0">
            <div
              className={`flex items-center ${sidebarCollapsed ? 'justify-center p-2' : 'justify-between p-2.5'} rounded-xl bg-white/5 transition-all duration-300 ease-in-out`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="grid size-8 place-items-center rounded-lg bg-amber-950 text-amber-300 font-bold border border-amber-800 text-xs shrink-0"
                  title={user?.name || 'Maya Lin'}
                >
                  ML
                </span>
                <div
                  className={`transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap min-w-0 flex-1 ${
                    sidebarCollapsed ? 'opacity-0 max-w-0 hidden' : 'opacity-100 max-w-[130px]'
                  }`}
                >
                  <p className="text-xs font-bold text-white truncate">
                    {user?.name || 'Maya Lin'}
                  </p>
                  <p className="text-[10px] text-white/50 truncate">Owner / Partner</p>
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
              <span
                className={`transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
                  sidebarCollapsed ? 'opacity-0 max-w-0 hidden' : 'opacity-100 max-w-[130px]'
                }`}
              >
                Minimize Sidebar
              </span>
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
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#e3e8de] bg-white/90 px-4 py-3.5 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#859d19]">
                KITCHEN CONSOLE
              </p>
              <h1 className="text-lg font-bold tracking-tight text-[#18201c] capitalize">
                {user?.restaurantName || 'The Green Table'} —{' '}
                {activeTab === 'orders'
                  ? 'Kitchen Dashboard'
                  : activeTab === 'orders-table'
                    ? 'All Orders Manager'
                    : activeTab.replace('-', ' ')}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Audio Notifications Switch */}
            <button
              onClick={() => setSoundAlerts((prev) => !prev)}
              title={soundAlerts ? 'Audio Alerts Enabled' : 'Audio Muted'}
              className={`hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold border transition ${
                soundAlerts
                  ? 'bg-amber-50 text-amber-900 border-amber-300'
                  : 'bg-gray-100 text-gray-500 border-gray-200'
              }`}
            >
              {soundAlerts ? (
                <Volume2 className="size-4 text-amber-600 animate-pulse" />
              ) : (
                <VolumeX className="size-4" />
              )}
              <span>{soundAlerts ? 'Sound ON' : 'Muted'}</span>
            </button>

            {/* Kitchen Status Badge */}
            <span
              className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold border ${
                isOpen
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  : 'bg-rose-100 text-rose-800 border-rose-200'
              }`}
            >
              ● {isOpen ? 'Accepting Orders' : 'Kitchen Closed'}
            </span>
          </div>
        </header>

        {/* Dashboard Body Content */}
        <div className="p-5 lg:p-8 flex-1">
          {/* Kitchen Live KPI Overview Stats */}
          <div className="mb-8 grid gap-3 grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl border border-[#e2e7dc] bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#737e77]">
                  Today's Gross Sales
                </p>
                <span className="grid size-9 place-items-center rounded-xl bg-emerald-100 text-emerald-800 font-bold">
                  <DollarSign className="size-5" />
                </span>
              </div>
              <p className="mt-2 text-3xl font-bold text-[#18201c]">₹14,280</p>
              <p className="mt-1.5 text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <TrendingUp className="size-3.5" /> +18% vs yesterday
              </p>
            </div>

            <div className="rounded-3xl border border-[#e2e7dc] bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#737e77]">
                  Active Kitchen Orders
                </p>
                <span className="grid size-9 place-items-center rounded-xl bg-amber-100 text-amber-800 font-bold">
                  <ChefHat className="size-5" />
                </span>
              </div>
              <p className="mt-2 text-3xl font-bold text-amber-600">{activeOrdersCount} Active</p>
              <p className="mt-1.5 text-xs text-[#737e77]">
                {orders.filter((o) => o.status === 'new').length} New ·{' '}
                {orders.filter((o) => o.status === 'preparing').length} Cooking ·{' '}
                {orders.filter((o) => o.status === 'ready').length} Ready
              </p>
            </div>

            <div className="rounded-3xl border border-[#e2e7dc] bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#737e77]">
                  Completed Drops Today
                </p>
                <span className="grid size-9 place-items-center rounded-xl bg-blue-100 text-blue-800 font-bold">
                  <CheckCircle2 className="size-5" />
                </span>
              </div>
              <p className="mt-2 text-3xl font-bold text-blue-700">42 drops</p>
              <p className="mt-1.5 text-xs text-[#737e77]">100% fulfillment (0 cancelled)</p>
            </div>

            <div className="rounded-3xl border border-[#e2e7dc] bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#737e77]">
                  Avg Prep Speed
                </p>
                <span className="grid size-9 place-items-center rounded-xl bg-purple-100 text-purple-800 font-bold">
                  <Clock3 className="size-5" />
                </span>
              </div>
              <p className="mt-2 text-3xl font-bold text-purple-700">{prepTimeBuffer} mins</p>
              <p className="mt-1.5 text-xs text-[#737e77]">Target buffer: &lt; 20 min</p>
            </div>
          </div>

          {/* TAB 1: KITCHEN DASHBOARD (KPI Cards + Graphs + Kanban Cards) */}
          {activeTab === 'orders' && (
            <div className="flex flex-col gap-6">
              {/* Analytics & Demand Graphs Section */}
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Graph 1: Hourly Kitchen Demand & Sales Curve */}
                <div className="lg:col-span-2 rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4 mb-4">
                    <div>
                      <h3 className="text-base font-bold text-[#18201c] flex items-center gap-2">
                        <TrendingUp className="size-4 text-emerald-600" /> Hourly Demand & Sales
                        Curve (Today)
                      </h3>
                      <p className="text-xs text-gray-500">
                        Real-time order volume peaks and sales performance per hour
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 border border-emerald-200">
                        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" /> Peak
                        Rush: 1 PM - 3 PM
                      </span>
                    </div>
                  </div>

                  {/* Bar Graph Visualization */}
                  <div className="pt-2">
                    <div className="flex items-end justify-between gap-2 h-44 border-b border-gray-200 pb-2 px-2">
                      {[
                        { hour: '10 AM', count: 3, sales: 840, height: '25%' },
                        { hour: '11 AM', count: 5, sales: 1420, height: '40%' },
                        { hour: '12 PM', count: 9, sales: 2680, height: '70%' },
                        { hour: '1 PM', count: 14, sales: 4120, height: '100%', peak: true },
                        { hour: '2 PM', count: 11, sales: 3240, height: '80%' },
                        { hour: '3 PM', count: 4, sales: 1180, height: '35%' },
                        { hour: '4 PM', count: 3, sales: 890, height: '25%' },
                        { hour: '5 PM', count: 6, sales: 1750, height: '45%' },
                        { hour: '6 PM', count: 8, sales: 2360, height: '60%' },
                        { hour: '7 PM', count: 12, sales: 3640, height: '90%', peak: true },
                        { hour: '8 PM', count: 10, sales: 2980, height: '75%' },
                        { hour: '9 PM', count: 5, sales: 1450, height: '40%' },
                      ].map((bar, idx) => (
                        <div
                          key={idx}
                          className="flex-1 flex flex-col items-center gap-1 group relative"
                        >
                          <div className="absolute -top-10 z-20 hidden group-hover:flex flex-col items-center rounded-lg bg-[#18201c] px-2 py-1 text-[10px] text-white font-bold whitespace-nowrap shadow-md">
                            <span>
                              {bar.count} orders (₹{bar.sales})
                            </span>
                          </div>
                          <div className="w-full flex items-end justify-center h-36">
                            <div
                              style={{ height: bar.height }}
                              className={`w-full max-w-[28px] rounded-t-lg transition-all duration-300 group-hover:brightness-110 ${
                                bar.peak ? 'bg-[#d9f447] border border-[#a8c414]' : 'bg-[#18201c]'
                              }`}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-gray-500 mt-1">
                            {bar.hour}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                      <div className="rounded-2xl bg-gray-50 p-2.5 border border-gray-100">
                        <p className="text-[10px] uppercase font-bold text-gray-400">
                          Peak Hour Volume
                        </p>
                        <p className="text-sm font-bold text-[#18201c]">14 Orders / hr</p>
                      </div>
                      <div className="rounded-2xl bg-gray-50 p-2.5 border border-gray-100">
                        <p className="text-[10px] uppercase font-bold text-gray-400">
                          Avg Ticket Size
                        </p>
                        <p className="text-sm font-bold text-emerald-700">₹340 / order</p>
                      </div>
                      <div className="rounded-2xl bg-gray-50 p-2.5 border border-gray-100">
                        <p className="text-[10px] uppercase font-bold text-gray-400">
                          Preparation Velocity
                        </p>
                        <p className="text-sm font-bold text-purple-700">12.4 mins / item</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Graph 2: Category Revenue Share & Live Pipeline Health */}
                <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="border-b border-gray-100 pb-3 mb-4">
                      <h3 className="text-base font-bold text-[#18201c] flex items-center gap-2">
                        <BarChart3 className="size-4 text-blue-600" /> Category Revenue Share
                      </h3>
                      <p className="text-xs text-gray-500">Sales performance by dish category</p>
                    </div>

                    <div className="flex flex-col gap-4">
                      {[
                        {
                          label: 'Healthy Bowls & Salads',
                          percent: 45,
                          sales: '₹6,420',
                          color: 'bg-emerald-500',
                        },
                        {
                          label: 'Artisanal Wraps',
                          percent: 30,
                          sales: '₹4,280',
                          color: 'bg-amber-500',
                        },
                        {
                          label: 'Truffle Momos & Starters',
                          percent: 25,
                          sales: '₹3,580',
                          color: 'bg-blue-500',
                        },
                      ].map((cat, idx) => (
                        <div key={idx} className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-gray-700">{cat.label}</span>
                            <span className="text-[#18201c]">
                              {cat.sales} ({cat.percent}%)
                            </span>
                          </div>
                          <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
                            <div
                              style={{ width: `${cat.percent}%` }}
                              className={`h-full rounded-full ${cat.color} transition-all duration-500`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Kitchen Live Pipeline Health */}
                  <div className="mt-6 border-t border-gray-100 pt-4">
                    <p className="text-xs font-bold text-gray-600 mb-2">Live Pipeline Health</p>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-xl bg-amber-50 p-2 border border-amber-200">
                        <p className="text-[10px] font-bold text-amber-800">New</p>
                        <p className="text-base font-extrabold text-amber-900">
                          {orders.filter((o) => o.status === 'new').length}
                        </p>
                      </div>
                      <div className="rounded-xl bg-blue-50 p-2 border border-blue-200">
                        <p className="text-[10px] font-bold text-blue-800">Cooking</p>
                        <p className="text-base font-extrabold text-blue-900">
                          {orders.filter((o) => o.status === 'preparing').length}
                        </p>
                      </div>
                      <div className="rounded-xl bg-emerald-50 p-2 border border-emerald-200">
                        <p className="text-[10px] font-bold text-emerald-800">Ready</p>
                        <p className="text-base font-extrabold text-emerald-900">
                          {orders.filter((o) => o.status === 'ready').length}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DEDICATED ALL ORDERS TABLE PAGE */}
          {activeTab === 'orders-table' && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-[#dfe4dc] bg-white p-4 shadow-sm">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3.5 top-2.5 size-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by Order ID, Customer, or Item..."
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-2 text-xs font-medium outline-none focus:border-[#18201c]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#737e77]">Prep Time Buffer:</span>
                  <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 text-xs font-bold border border-gray-200">
                    {[15, 25, 35].map((mins) => (
                      <button
                        key={mins}
                        onClick={() => setPrepTimeBuffer(mins)}
                        className={`rounded-lg px-2.5 py-1 transition ${
                          prepTimeBuffer === mins
                            ? 'bg-[#d9f447] text-[#121815] shadow-xs font-extrabold'
                            : 'text-gray-600 hover:text-black'
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* TABLE FORMAT VIEW */}
              <div className="flex flex-col gap-4 rounded-3xl border border-[#dfe4dc] bg-white p-5 shadow-sm">
                {/* Table Filter Tabs */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { id: 'all', label: 'All Orders', count: orders.length },
                      {
                        id: 'new',
                        label: 'New Needs Acceptance',
                        count: orders.filter((o) => o.status === 'new').length,
                      },
                      {
                        id: 'preparing',
                        label: 'In Kitchen (Cooking)',
                        count: orders.filter((o) => o.status === 'preparing').length,
                      },
                      {
                        id: 'ready',
                        label: 'Ready for Pickup',
                        count: orders.filter((o) => o.status === 'ready').length,
                      },
                      {
                        id: 'completed',
                        label: 'Completed Drops',
                        count: orders.filter((o) => o.status === 'completed').length,
                      },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setOrderTableFilter(tab.id as any)}
                        className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition whitespace-nowrap ${
                          orderTableFilter === tab.id
                            ? 'bg-[#121815] text-[#d9f447] shadow-sm'
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                            orderTableFilter === tab.id
                              ? 'bg-[#d9f447] text-[#121815]'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {tab.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  <span className="text-xs font-bold text-gray-500">
                    Showing {tableFilteredOrders.length} order
                    {tableFilteredOrders.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50/80 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                        <th className="py-3 px-4">Order ID & Type</th>
                        <th className="py-3 px-4">Customer Details</th>
                        <th className="py-3 px-4">Items & Cooking Notes</th>
                        <th className="py-3 px-4">Bill Total</th>
                        <th className="py-3 px-4">Time Received</th>
                        <th className="py-3 px-4">Current Status</th>
                        <th className="py-3 px-4 text-right">Update Status / Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {tableFilteredOrders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-gray-50/80 transition">
                          <td className="py-3.5 px-4 font-bold text-[#18201c] whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-extrabold">{ord.id}</span>
                              <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800 border border-emerald-200">
                                {ord.paymentMethod}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 min-w-[180px]">
                            <p className="font-bold text-[#18201c]">{ord.customerName}</p>
                            <p className="text-[11px] text-gray-500">{ord.customerPhone}</p>
                            <p
                              className="text-[10px] text-gray-400 truncate max-w-[200px]"
                              title={ord.customerAddress}
                            >
                              {ord.customerAddress}
                            </p>
                          </td>
                          <td className="py-3.5 px-4 min-w-[240px]">
                            <div className="flex flex-col gap-0.5 text-xs text-[#2f3833]">
                              {ord.items.map((it, idx) => (
                                <span key={idx} className="font-semibold">
                                  {it.qty}x {it.name}{' '}
                                  <span className="text-gray-400 font-normal">(₹{it.price})</span>
                                </span>
                              ))}
                            </div>
                            {ord.cookingNotes && (
                              <div className="mt-1.5 flex items-start gap-1 rounded-lg bg-amber-50 p-1.5 text-[10px] font-semibold text-amber-900 border border-amber-200">
                                <ChefHat className="size-3 text-amber-700 shrink-0 mt-0.5" />
                                <span>{ord.cookingNotes}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-sm text-[#18201c] whitespace-nowrap">
                            ₹{ord.total.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 px-4 text-gray-500 whitespace-nowrap font-medium">
                            {ord.timeAgo}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase border ${
                                ord.status === 'new'
                                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                                  : ord.status === 'preparing'
                                    ? 'bg-blue-100 text-blue-900 border-blue-300'
                                    : ord.status === 'ready'
                                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                      : 'bg-gray-100 text-gray-700 border-gray-300'
                              }`}
                            >
                              <span
                                className={`size-1.5 rounded-full ${
                                  ord.status === 'new'
                                    ? 'bg-amber-500 animate-pulse'
                                    : ord.status === 'preparing'
                                      ? 'bg-blue-500 animate-spin'
                                      : ord.status === 'ready'
                                        ? 'bg-emerald-500'
                                        : 'bg-gray-400'
                                }`}
                              />
                              {ord.status === 'new'
                                ? 'Needs Acceptance'
                                : ord.status === 'preparing'
                                  ? 'In Kitchen'
                                  : ord.status === 'ready'
                                    ? 'Ready for Pickup'
                                    : 'Completed'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setSelectedOrderModal(ord)}
                                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition"
                                title="View order slip"
                              >
                                Slip
                              </button>
                              <select
                                value={ord.status}
                                onChange={(e) =>
                                  updateOrderStatus(
                                    ord.id,
                                    e.target.value as IncomingOrder['status']
                                  )
                                }
                                className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-[#18201c] cursor-pointer outline-none focus:border-[#18201c] transition shadow-2xs"
                              >
                                <option value="new">Status: New</option>
                                <option value="preparing">Status: Cooking</option>
                                <option value="ready">Status: Ready</option>
                                <option value="completed">Status: Completed</option>
                              </select>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {tableFilteredOrders.length === 0 && (
                        <tr>
                          <td
                            colSpan={7}
                            className="py-8 text-center text-xs font-semibold text-gray-500"
                          >
                            No orders match the selected filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MENU MANAGER */}
          {activeTab === 'menu' && (
            <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#f0f3ec] pb-4">
                <div>
                  <h3 className="text-xl font-bold">Dish Catalog & Availability</h3>
                  <p className="text-xs text-[#737e77]">
                    Toggle stock status in real-time, edit prices, or publish new dishes.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingDish(null)
                    setDishName('')
                    setDishPrice('')
                    setDishDescription('')
                    setShowAddDishModal(true)
                  }}
                  className="flex items-center gap-1.5 rounded-full bg-[#18201c] px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#323d36]"
                >
                  <Plus className="size-4" /> Add New Dish
                </button>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {menuItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-[#e5e9e1] p-4 flex flex-col justify-between bg-white shadow-sm hover:border-gray-300 transition"
                  >
                    <div>
                      <div className="flex gap-4 items-start">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="size-16 rounded-xl object-cover shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#86a018]">
                            {item.category}
                          </span>
                          <h4 className="font-bold text-sm text-[#18201c] truncate">{item.name}</h4>
                          <p className="text-xs font-bold text-[#18201c] mt-0.5">₹{item.price}</p>
                        </div>
                      </div>
                      {item.description && (
                        <p className="mt-3 text-xs text-gray-500 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                      <button
                        onClick={() => toggleItemStock(item.id)}
                        className={`rounded-full px-3 py-1 text-[10px] font-bold transition ${
                          item.inStock
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                        }`}
                      >
                        {item.inStock ? 'In Stock' : 'Out of Stock'}
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditDishModal(item)}
                          className="grid size-8 place-items-center rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                          title="Edit Dish"
                        >
                          <Edit3 className="size-3.5" />
                        </button>
                        <button
                          onClick={() => deleteMenuItem(item.id)}
                          className="grid size-8 place-items-center rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                          title="Delete Dish"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: STORE COUPONS */}
          {activeTab === 'coupons' && (
            <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-[#18201c]">
                    Store Promo Codes &amp; Discount Offers
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Attract new diners and boost order volume with store-specific coupons.
                  </p>
                </div>
                <Link
                  href="/vendor/coupons"
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#18201c] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#323d36] transition"
                >
                  <Tag className="size-4 text-[#d9f447]" /> Manage All Store Coupons
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-extrabold text-amber-950">
                      HEALTHY20
                    </span>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      Active
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-bold text-amber-900">
                    20% OFF on all gourmet bowls
                  </p>
                  <p className="mt-1 text-[11px] text-amber-700">Min Order: ₹249 · Cap: ₹150</p>
                </div>

                <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-extrabold text-blue-950">
                      FREEDEL40
                    </span>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      Active
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-bold text-blue-900">Flat ₹40 OFF delivery fee</p>
                  <p className="mt-1 text-[11px] text-blue-700">Min Order: ₹299</p>
                </div>

                <div className="rounded-2xl border border-purple-200 bg-purple-50/70 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-extrabold text-purple-950">BITE50</span>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      Active
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-bold text-purple-900">50% OFF welcome meal</p>
                  <p className="mt-1 text-[11px] text-purple-700">Min Order: ₹199 · Cap: ₹100</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
              <h3 className="text-xl font-bold">Kitchen Performance & Revenue Trends</h3>
              <p className="text-xs text-[#737e77] mt-0.5">
                Detailed analytics on peak hours and top selling menu items.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 p-5 bg-gradient-to-br from-emerald-50/50 to-white">
                  <h4 className="font-bold text-sm text-[#18201c]">Top Selling Dish</h4>
                  <p className="text-lg font-bold text-emerald-700 mt-1">
                    Basil Pesto Quinoa Bowl (142 orders)
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Generates 34% of your total kitchen revenue.
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-200 p-5 bg-gradient-to-br from-amber-50/50 to-white">
                  <h4 className="font-bold text-sm text-[#18201c]">Peak Order Hour</h4>
                  <p className="text-lg font-bold text-amber-700 mt-1">
                    1:00 PM – 2:30 PM (Lunch Rush)
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Average order rate: 18 orders/hr during rush.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: WALLET & PAYOUTS */}
          {activeTab === 'payouts' && (
            <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#f0f3ec] pb-5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-md">
                    Instant Bank Settlement
                  </span>
                  <h3 className="text-xl font-bold text-[#18201c] mt-1">
                    Kitchen Wallet & Balance
                  </h3>
                  <p className="text-xs text-[#737e77]">
                    Transfer collected customer payments straight to your registered UPI or Bank
                    Account.
                  </p>
                </div>

                <button
                  onClick={() => setPayoutModalOpen(true)}
                  className="flex items-center justify-center gap-2 rounded-full bg-[#18201c] px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-[#323d36] transition"
                >
                  <Wallet className="size-4 text-amber-400" /> Request Instant Payout
                </button>
              </div>

              {/* Settlement History Table */}
              <div className="mt-6">
                <h4 className="text-sm font-bold text-[#18201c] mb-3">Settlement History</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px]">
                        <th className="py-2.5 px-3">Transaction ID</th>
                        <th className="py-2.5 px-3">Amount</th>
                        <th className="py-2.5 px-3">Date & Time</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {payoutHistory.map((p) => (
                        <tr key={p.id}>
                          <td className="py-3 px-3 font-mono font-bold">{p.id}</td>
                          <td className="py-3 px-3 font-bold text-emerald-700">
                            ₹{p.amount.toLocaleString('en-IN')}
                          </td>
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

          {/* TAB 5: STORE SETTINGS */}
          {activeTab === 'settings' && (
            <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm max-w-2xl">
              <h3 className="text-xl font-bold">Store & Kitchen Details</h3>
              <p className="text-xs text-[#737e77] mt-0.5">
                Update restaurant name, address, cuisine specialization, and contact information.
              </p>

              <div className="mt-6 flex flex-col gap-4 text-xs">
                <div>
                  <label className="font-bold text-[#18201c]">Restaurant Name</label>
                  <input
                    type="text"
                    defaultValue={user?.restaurantName || 'The Green Table'}
                    className="mt-1 w-full rounded-xl border border-gray-300 p-2.5 outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#18201c]">Cuisine Specialization</label>
                  <input
                    type="text"
                    defaultValue={user?.cuisine || 'Healthy Bowls & Salads'}
                    className="mt-1 w-full rounded-xl border border-gray-300 p-2.5 outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#18201c]">Kitchen Address</label>
                  <textarea
                    rows={2}
                    defaultValue="100ft Road, Indiranagar, Bengaluru, KA 560038"
                    className="mt-1 w-full rounded-xl border border-gray-300 p-2.5 outline-none font-medium"
                  />
                </div>
                <button className="mt-2 rounded-full bg-[#18201c] py-2.5 font-bold text-white shadow-md hover:bg-[#323d36]">
                  Save Store Settings
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Order Details Invoice Slip Modal */}
      {selectedOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18201c]/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#f0f3ec] pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                  Kitchen Order Receipt
                </span>
                <h3 className="font-bold text-lg text-[#18201c]">{selectedOrderModal.id}</h3>
              </div>
              <button
                onClick={() => setSelectedOrderModal(null)}
                className="grid size-8 place-items-center rounded-full bg-gray-100 hover:bg-gray-200"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-3 text-xs">
              <div className="rounded-2xl bg-gray-50 p-3 flex justify-between">
                <div>
                  <p className="font-bold text-[#18201c]">{selectedOrderModal.customerName}</p>
                  <p className="text-gray-500">{selectedOrderModal.customerPhone}</p>
                  <p className="text-gray-600 text-[11px] mt-1">
                    {selectedOrderModal.customerAddress}
                  </p>
                </div>
                <div className="text-right">
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                    {selectedOrderModal.paymentMethod}
                  </span>
                </div>
              </div>

              {selectedOrderModal.cookingNotes && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-950 font-medium">
                  <strong>Special Cooking Request:</strong> {selectedOrderModal.cookingNotes}
                </div>
              )}

              <div className="border-t border-b border-gray-100 py-3 flex flex-col gap-2">
                <span className="font-bold text-gray-500 uppercase text-[10px]">Order Items</span>
                {selectedOrderModal.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between font-semibold">
                    <span>
                      {it.qty}x {it.name}
                    </span>
                    <span>₹{it.price * it.qty}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-1 text-[#737e77]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{selectedOrderModal.items.reduce((a, b) => a + b.price * b.qty, 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kitchen Packaging Fee</span>
                  <span>₹{selectedOrderModal.packagingFee}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST Taxes</span>
                  <span>₹{selectedOrderModal.gst}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-[#18201c] pt-2 border-t border-gray-200">
                  <span>Total Payable</span>
                  <span>₹{selectedOrderModal.total}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedOrderModal(null)}
              className="mt-5 w-full rounded-full bg-[#18201c] py-2.5 text-xs font-bold text-white hover:bg-[#323d36]"
            >
              Close Receipt
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Dish Modal */}
      {showAddDishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18201c]/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#f0f3ec] pb-3">
              <h3 className="font-bold text-lg">
                {editingDish ? 'Edit Dish Catalog Item' : 'Add Dish to Menu'}
              </h3>
              <button
                onClick={() => setShowAddDishModal(false)}
                className="grid size-8 place-items-center rounded-full bg-gray-100 hover:bg-gray-200"
              >
                <X className="size-4" />
              </button>
            </div>
            <form onSubmit={handleSaveDish} className="mt-4 flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold">Dish Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Avocado Toast"
                  value={dishName}
                  onChange={(e) => setDishName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2 text-xs outline-none focus:border-[#18201c]"
                />
              </div>
              <div>
                <label className="text-xs font-bold">Price (₹)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 299"
                  value={dishPrice}
                  onChange={(e) => setDishPrice(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2 text-xs outline-none focus:border-[#18201c]"
                />
              </div>
              <div>
                <label className="text-xs font-bold">Category</label>
                <select
                  value={dishCategory}
                  onChange={(e) => setDishCategory(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2 text-xs outline-none bg-white font-medium"
                >
                  <option value="Starters">Starters</option>
                  <option value="Main Course">Main Course</option>
                  <option value="Bowls">Bowls</option>
                  <option value="Wraps">Wraps</option>
                  <option value="Beverages">Beverages</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold">Short Description</label>
                <textarea
                  rows={2}
                  placeholder="Ingredients or description..."
                  value={dishDescription}
                  onChange={(e) => setDishDescription(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2 text-xs outline-none focus:border-[#18201c]"
                />
              </div>
              <button
                type="submit"
                className="mt-2 rounded-full bg-[#18201c] py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#323d36]"
              >
                {editingDish ? 'Save Changes' : 'Save & Publish Dish'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Payout Settlement Modal */}
      {payoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18201c]/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#f0f3ec] pb-3">
              <div>
                <h3 className="font-bold text-lg text-[#18201c]">Instant Kitchen Withdrawal</h3>
                <p className="text-xs text-gray-500">
                  Transfer funds directly to registered bank account.
                </p>
              </div>
              <button
                onClick={() => setPayoutModalOpen(false)}
                className="grid size-8 place-items-center rounded-full bg-gray-100 hover:bg-gray-200"
              >
                <X className="size-4" />
              </button>
            </div>

            {payoutSuccessMsg ? (
              <div className="my-6 rounded-2xl bg-emerald-100 p-4 text-center text-emerald-900 font-bold text-xs flex flex-col items-center gap-2">
                <CheckCircle2 className="size-8 text-emerald-600 animate-bounce" />
                {payoutSuccessMsg}
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-4">
                <div className="rounded-2xl bg-amber-50 p-4 border border-amber-200">
                  <span className="text-[10px] font-bold uppercase text-amber-800">
                    Available Balance
                  </span>
                  <p className="text-2xl font-bold text-[#18201c] mt-0.5">₹14,280</p>
                </div>

                <div>
                  <label className="text-xs font-bold">Withdrawal Amount (₹)</label>
                  <input
                    type="number"
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 p-2.5 text-sm font-bold outline-none"
                  />
                </div>

                <div className="rounded-xl border border-gray-200 p-3 text-xs flex items-center justify-between bg-gray-50">
                  <span className="text-gray-600">Receiving Account</span>
                  <span className="font-bold text-[#18201c]">HDFC Bank (****4921)</span>
                </div>

                <button
                  onClick={handleRequestPayout}
                  className="mt-2 w-full rounded-full bg-emerald-600 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition"
                >
                  Confirm Payout Transfer
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
