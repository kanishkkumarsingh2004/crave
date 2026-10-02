'use client'

import React, { useState } from 'react'
import {
  AlertCircle,
  BarChart3,
  Check,
  CheckCircle2,
  Clock3,
  DollarSign,
  Eye,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Power,
  Search,
  Settings,
  Sliders,
  Store,
  TrendingUp,
  Utensils,
  X,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

interface OrderItem {
  name: string
  qty: number
  price: number
}

interface IncomingOrder {
  id: string
  customerName: string
  customerPhone: string
  items: OrderItem[]
  total: number
  status: 'new' | 'preparing' | 'ready' | 'completed'
  timeAgo: string
  deliveryDriver?: string
}

interface MenuItem {
  id: string
  name: string
  category: string
  price: number
  inStock: boolean
  image: string
}

export default function VendorDashboard() {
  const { user, logout } = useAuth()
  const [isOpen, setIsOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<'orders' | 'menu' | 'analytics' | 'settings'>('orders')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Live incoming orders state
  const [orders, setOrders] = useState<IncomingOrder[]>([
    {
      id: 'DRP-9021',
      customerName: 'Alex Rivera',
      customerPhone: '+91 98765 43210',
      items: [
        { name: 'Basil Pesto Quinoa Bowl', qty: 2, price: 289 },
        { name: 'Smoky Paneer Tikka Wrap', qty: 1, price: 249 },
      ],
      total: 827,
      status: 'new',
      timeAgo: '2 mins ago',
    },
    {
      id: 'DRP-8840',
      customerName: 'Priya Sharma',
      customerPhone: '+91 98450 11223',
      items: [{ name: 'Steamed Truffle Edamame Momos', qty: 3, price: 320 }],
      total: 960,
      status: 'preparing',
      timeAgo: '12 mins ago',
      deliveryDriver: 'Rajesh Kumar (Arriving in 4 min)',
    },
    {
      id: 'DRP-8712',
      customerName: 'Karan Patel',
      customerPhone: '+91 99100 55443',
      items: [{ name: 'Basil Pesto Quinoa Bowl', qty: 1, price: 289 }],
      total: 289,
      status: 'ready',
      timeAgo: '22 mins ago',
      deliveryDriver: 'Suresh V (Driver assigned)',
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
      image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=300&q=80',
    },
    {
      id: 'mn_2',
      name: 'Smoky Paneer Tikka Wrap',
      category: 'Wraps',
      price: 249,
      inStock: true,
      image: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=300&q=80',
    },
    {
      id: 'mn_3',
      name: 'Steamed Truffle Edamame Momos',
      category: 'Starters',
      price: 320,
      inStock: false,
      image: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=300&q=80',
    },
  ])

  const [showAddDishModal, setShowAddDishModal] = useState(false)
  const [newDishName, setNewDishName] = useState('')
  const [newDishPrice, setNewDishPrice] = useState('')
  const [newDishCategory, setNewDishCategory] = useState('Main Course')

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

  function handleAddDish(e: React.FormEvent) {
    e.preventDefault()
    if (!newDishName || !newDishPrice) return
    const dish: MenuItem = {
      id: `mn_${Date.now()}`,
      name: newDishName,
      price: parseFloat(newDishPrice),
      category: newDishCategory,
      inStock: true,
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80',
    }
    setMenuItems((prev) => [...prev, dish])
    setNewDishName('')
    setNewDishPrice('')
    setShowAddDishModal(false)
  }

  const activeOrdersCount = orders.filter((o) => o.status !== 'completed').length

  const navItems = [
    { id: 'orders', label: 'Live Kitchen Queue', icon: Utensils, badge: activeOrdersCount > 0 ? `${activeOrdersCount} Active` : null },
    { id: 'menu', label: 'Menu Catalog Manager', icon: Store, badge: menuItems.length.toString() },
    { id: 'analytics', label: 'Sales & Analytics', icon: BarChart3, badge: '+18%' },
    { id: 'settings', label: 'Store Profile', icon: Settings, badge: null },
  ]

  return (
    <div className="flex min-h-screen bg-[#f8f9f7] text-[#18201c]">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-[#18201c]/50 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Vendor Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col justify-between border-r border-[#e3e8de] bg-[#18201c] text-white transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col gap-6 p-5">
          {/* Sidebar Top Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-5">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-amber-400 text-[#18201c] shadow-[0_4px_20px_rgba(251,191,36,0.3)] font-bold">
                <Store className="size-6" />
              </span>
              <div>
                <h2 className="text-base font-bold tracking-tight text-white truncate max-w-[150px]">
                  {user?.restaurantName || 'The Green Table'}
                </h2>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Kitchen Console</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="grid size-8 place-items-center rounded-full bg-white/10 text-white lg:hidden"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Kitchen Online/Offline Toggle inside Sidebar */}
          <button
            onClick={() => setIsOpen((prev) => !prev)}
            className={`flex items-center justify-between rounded-2xl px-4 py-3 text-xs font-bold transition shadow-sm ${
              isOpen ? 'bg-emerald-500 text-[#18201c]' : 'bg-rose-600 text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <Power className="size-4" /> Kitchen Status
            </span>
            <span className="uppercase text-[10px] tracking-wider font-extrabold">
              {isOpen ? 'OPEN' : 'CLOSED'}
            </span>
          </button>

          {/* Nav Items */}
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as any)
                    setSidebarOpen(false)
                  }}
                  className={`flex items-center justify-between rounded-2xl px-4 py-3 text-xs font-bold transition ${
                    isActive
                      ? 'bg-amber-400 text-[#18201c] shadow-md'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`size-4 ${isActive ? 'text-[#18201c]' : 'text-amber-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                        isActive ? 'bg-[#18201c] text-white' : 'bg-white/15 text-amber-300'
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

        {/* Sidebar Footer User Info */}
        <div className="border-t border-white/10 p-5">
          <div className="flex items-center justify-between rounded-2xl bg-white/5 p-3">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-amber-950 text-amber-300 font-bold border border-amber-800">
                ML
              </span>
              <div>
                <p className="text-xs font-bold text-white">{user?.name || 'Maya Lin'}</p>
                <p className="text-[10px] text-white/60">Owner / Partner</p>
              </div>
            </div>
            <button
              onClick={() => logout()}
              title="Sign Out"
              className="grid size-8 place-items-center rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white transition"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#e3e8de] bg-white/90 px-5 py-4 backdrop-blur-md lg:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="grid size-9 place-items-center rounded-xl border border-[#dfe4dc] bg-white lg:hidden"
            >
              <Menu className="size-5 text-[#18201c]" />
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#18201c] capitalize">
                {user?.restaurantName || 'The Green Table'} — {activeTab.replace('-', ' ')}
              </h1>
              <p className="text-xs text-[#737e77]">
                FSSAI License: <span className="font-mono font-bold text-[#18201c]">#11223344556677</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold border ${
                isOpen ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-rose-100 text-rose-800 border-rose-200'
              }`}
            >
              ● {isOpen ? 'Accepting Orders' : 'Kitchen Closed'}
            </span>
          </div>
        </header>

        {/* Dashboard Body Content */}
        <div className="p-5 lg:p-8 flex-1">
          {/* KPI Metric Cards */}
          <div className="mb-8 grid gap-4 sm:grid-cols-4">
            <div className="rounded-3xl border border-[#e2e7dc] bg-white p-5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#737e77]">Today's Sales</p>
              <p className="mt-2 text-3xl font-bold text-[#18201c]">₹14,280</p>
              <p className="mt-1 text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <TrendingUp className="size-3.5" /> +18% vs yesterday
              </p>
            </div>

            <div className="rounded-3xl border border-[#e2e7dc] bg-white p-5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#737e77]">Active Kitchen Orders</p>
              <p className="mt-2 text-3xl font-bold text-amber-600">{activeOrdersCount}</p>
              <p className="mt-1 text-xs text-[#737e77]">In cooking pipeline</p>
            </div>

            <div className="rounded-3xl border border-[#e2e7dc] bg-white p-5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#737e77]">Completed Drops Today</p>
              <p className="mt-2 text-3xl font-bold text-emerald-700">42 drops</p>
              <p className="mt-1 text-xs text-[#737e77]">0 cancellations</p>
            </div>

            <div className="rounded-3xl border border-[#e2e7dc] bg-white p-5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#737e77]">Avg Prep Speed</p>
              <p className="mt-2 text-3xl font-bold text-blue-700">14.5 mins</p>
              <p className="mt-1 text-xs text-[#737e77]">Target &lt; 20 mins</p>
            </div>
          </div>

          {/* TAB 1: LIVE KITCHEN QUEUE */}
          {activeTab === 'orders' && (
            <div className="grid gap-6 md:grid-cols-3">
              {/* Column 1: New Orders */}
              <div className="rounded-3xl border border-amber-200 bg-amber-50/40 p-4">
                <div className="flex items-center justify-between border-b border-amber-200/60 pb-3">
                  <span className="font-bold text-sm text-amber-900 flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-amber-500 animate-pulse" />
                    New Orders ({orders.filter((o) => o.status === 'new').length})
                  </span>
                  <span className="text-[10px] uppercase font-bold text-amber-800">Needs Acceptance</span>
                </div>

                <div className="mt-4 flex flex-col gap-3">
                  {orders
                    .filter((o) => o.status === 'new')
                    .map((ord) => (
                      <div key={ord.id} className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between border-b border-[#f0f3ec] pb-2">
                          <span className="font-bold text-xs text-[#18201c]">{ord.id}</span>
                          <span className="text-[10px] text-[#737e77]">{ord.timeAgo}</span>
                        </div>
                        <div className="mt-2 text-xs font-semibold text-[#18201c]">
                          {ord.customerName} ({ord.customerPhone})
                        </div>

                        <div className="mt-2 text-xs bg-amber-50 rounded-xl p-2.5 flex flex-col gap-1">
                          {ord.items.map((it, idx) => (
                            <div key={idx} className="flex justify-between font-medium text-[#2f3833]">
                              <span>{it.qty}x {it.name}</span>
                              <span>₹{it.price * it.qty}</span>
                            </div>
                          ))}
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <span className="font-bold text-sm text-[#18201c]">Total: ₹{ord.total}</span>
                          <button
                            onClick={() => updateOrderStatus(ord.id, 'preparing')}
                            className="rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700"
                          >
                            Accept & Start Cooking
                          </button>
                        </div>
                      </div>
                    ))}
                  {orders.filter((o) => o.status === 'new').length === 0 && (
                    <p className="py-8 text-center text-xs text-[#7c867f]">No new incoming orders right now.</p>
                  )}
                </div>
              </div>

              {/* Column 2: In Cooking */}
              <div className="rounded-3xl border border-blue-200 bg-blue-50/40 p-4">
                <div className="flex items-center justify-between border-b border-blue-200/60 pb-3">
                  <span className="font-bold text-sm text-blue-900 flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-blue-500 animate-spin" />
                    In Kitchen ({orders.filter((o) => o.status === 'preparing').length})
                  </span>
                  <span className="text-[10px] uppercase font-bold text-blue-800">Cooking</span>
                </div>

                <div className="mt-4 flex flex-col gap-3">
                  {orders
                    .filter((o) => o.status === 'preparing')
                    .map((ord) => (
                      <div key={ord.id} className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between border-b border-[#f0f3ec] pb-2">
                          <span className="font-bold text-xs text-[#18201c]">{ord.id}</span>
                          <span className="text-[10px] text-blue-700 font-bold">{ord.timeAgo}</span>
                        </div>
                        <div className="mt-2 text-xs font-semibold text-[#18201c]">{ord.customerName}</div>

                        <div className="mt-2 text-xs bg-blue-50 rounded-xl p-2.5 flex flex-col gap-1">
                          {ord.items.map((it, idx) => (
                            <div key={idx} className="flex justify-between font-medium">
                              <span>{it.qty}x {it.name}</span>
                            </div>
                          ))}
                        </div>

                        {ord.deliveryDriver && (
                          <p className="mt-2 text-[10px] font-bold text-blue-800">🛵 {ord.deliveryDriver}</p>
                        )}

                        <div className="mt-3 flex items-center justify-between">
                          <span className="font-bold text-sm text-[#18201c]">₹{ord.total}</span>
                          <button
                            onClick={() => updateOrderStatus(ord.id, 'ready')}
                            className="rounded-full bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700"
                          >
                            Mark Ready for Pickup
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Column 3: Ready for Pickup */}
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50/40 p-4">
                <div className="flex items-center justify-between border-b border-emerald-200/60 pb-3">
                  <span className="font-bold text-sm text-emerald-900 flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    Ready for Pickup ({orders.filter((o) => o.status === 'ready').length})
                  </span>
                  <span className="text-[10px] uppercase font-bold text-emerald-800">Packed</span>
                </div>

                <div className="mt-4 flex flex-col gap-3">
                  {orders
                    .filter((o) => o.status === 'ready')
                    .map((ord) => (
                      <div key={ord.id} className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between border-b border-[#f0f3ec] pb-2">
                          <span className="font-bold text-xs text-[#18201c]">{ord.id}</span>
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            Packed & Ready
                          </span>
                        </div>
                        <div className="mt-2 text-xs font-semibold text-[#18201c]">{ord.customerName}</div>
                        <p className="mt-1 text-[11px] text-[#737e77]">Waiting for driver pickup</p>

                        <button
                          onClick={() => updateOrderStatus(ord.id, 'completed')}
                          className="mt-3 w-full rounded-full border border-emerald-300 bg-emerald-50 py-1.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"
                        >
                          Handed to Driver
                        </button>
                      </div>
                    ))}
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
                  <p className="text-xs text-[#737e77]">Toggle stock status in real-time or publish new dishes.</p>
                </div>
                <button
                  onClick={() => setShowAddDishModal(true)}
                  className="flex items-center gap-1.5 rounded-full bg-[#18201c] px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#323d36]"
                >
                  <Plus className="size-4" /> Add New Dish
                </button>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {menuItems.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-[#e5e9e1] p-4 flex gap-4 items-center">
                    <img src={item.image} alt={item.name} className="size-16 rounded-xl object-cover" />
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold uppercase text-[#86a018]">{item.category}</span>
                      <h4 className="font-bold text-sm text-[#18201c] truncate">{item.name}</h4>
                      <p className="text-xs font-bold text-[#18201c] mt-0.5">₹{item.price}</p>
                    </div>
                    <button
                      onClick={() => toggleItemStock(item.id)}
                      className={`rounded-full px-3 py-1.5 text-[10px] font-bold ${
                        item.inStock ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {item.inStock ? 'In Stock' : 'Out of Stock'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
              <h3 className="text-xl font-bold">Kitchen Performance & Revenue Trends</h3>
              <p className="text-xs text-[#737e77] mt-0.5">Detailed analytics on peak hours and top selling menu items.</p>
              
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 p-4">
                  <h4 className="font-bold text-sm text-[#18201c]">Top Selling Dish</h4>
                  <p className="text-lg font-bold text-emerald-700 mt-1">Basil Pesto Quinoa Bowl (142 orders)</p>
                </div>
                <div className="rounded-2xl border border-gray-200 p-4">
                  <h4 className="font-bold text-sm text-[#18201c]">Peak Order Hour</h4>
                  <p className="text-lg font-bold text-amber-700 mt-1">1:00 PM – 2:30 PM (Lunch Rush)</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: STORE SETTINGS */}
          {activeTab === 'settings' && (
            <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm max-w-2xl">
              <h3 className="text-xl font-bold">Store & Kitchen Details</h3>
              <p className="text-xs text-[#737e77] mt-0.5">Update restaurant name, address, cuisine specialization, and contact information.</p>
              
              <div className="mt-6 flex flex-col gap-4 text-xs">
                <div>
                  <label className="font-bold text-[#18201c]">Restaurant Name</label>
                  <input type="text" defaultValue={user?.restaurantName || 'The Green Table'} className="mt-1 w-full rounded-xl border border-gray-300 p-2.5 outline-none font-bold" />
                </div>
                <div>
                  <label className="font-bold text-[#18201c]">Cuisine Specialization</label>
                  <input type="text" defaultValue={user?.cuisine || 'Healthy Bowls & Salads'} className="mt-1 w-full rounded-xl border border-gray-300 p-2.5 outline-none" />
                </div>
                <button className="mt-2 rounded-full bg-[#18201c] py-2.5 font-bold text-white">Save Store Settings</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Dish Modal */}
      {showAddDishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18201c]/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#f0f3ec] pb-3">
              <h3 className="font-bold text-lg">Add Dish to Menu</h3>
              <button onClick={() => setShowAddDishModal(false)} className="grid size-8 place-items-center rounded-full bg-gray-100">
                <X className="size-4" />
              </button>
            </div>
            <form onSubmit={handleAddDish} className="mt-4 flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold">Dish Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Avocado Toast"
                  value={newDishName}
                  onChange={(e) => setNewDishName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2 text-xs outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold">Price (₹)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 299"
                  value={newDishPrice}
                  onChange={(e) => setNewDishPrice(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2 text-xs outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold">Category</label>
                <select
                  value={newDishCategory}
                  onChange={(e) => setNewDishCategory(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2 text-xs outline-none bg-white font-medium"
                >
                  <option value="Starters">Starters</option>
                  <option value="Main Course">Main Course</option>
                  <option value="Bowls">Bowls</option>
                  <option value="Beverages">Beverages</option>
                </select>
              </div>
              <button
                type="submit"
                className="mt-2 rounded-full bg-[#18201c] py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#323d36]"
              >
                Save & Publish Dish
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
