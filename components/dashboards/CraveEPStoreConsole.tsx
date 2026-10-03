'use client'

import React, { useState, useMemo } from 'react'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import {
  Zap,
  Store,
  Package,
  CheckCircle2,
  Clock,
  Plus,
  Edit2,
  Trash2,
  TrendingUp,
  AlertTriangle,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  Check,
  Bike,
  Users,
  RefreshCw,
  Sparkles,
  ShoppingBag,
  Bell,
  Box,
  Layers,
  ChevronRight,
  Flame,
  BarChart3,
  Thermometer,
  QrCode,
  Award,
  Download,
  AlertCircle
} from 'lucide-react'
import { SAMPLE_GROCERY_ITEMS, GroceryItem } from './CraveXPStore'
import { supabase } from '@/lib/supabase'

interface IncomingGroceryOrder {
  id: string
  customerName: string
  phone: string
  address: string
  distance: string
  items: { name: string; qty: number; unit: string; packed?: boolean; skuCode: string }[]
  total: number
  paymentMethod: string
  time: string
  status: 'new' | 'packing' | 'ready' | 'picked_up'
  packTimerSeconds: number
  pickerName: string
  batchZone: string
}

const INITIAL_GROCERY_ORDERS: IncomingGroceryOrder[] = [
  {
    id: 'CXP-9021',
    customerName: 'Aarav Sharma',
    phone: '+91 98765 12345',
    address: 'B-402, Mantri Tranquil, Kanakapura Road',
    distance: '1.2 km',
    items: [
      { name: 'Amul Taaza Toned Fresh Milk', qty: 2, unit: '500 ml', packed: true, skuCode: 'SKU-8812' },
      { name: 'Farm Fresh White Eggs (6 Pcs)', qty: 1, unit: '6 units', packed: false, skuCode: 'SKU-4410' },
      { name: 'Harvest Gold 100% Atta Bread', qty: 1, unit: '400 g', packed: false, skuCode: 'SKU-3321' },
    ],
    total: 142,
    paymentMethod: 'UPI Online Paid',
    time: '2 mins ago',
    status: 'new',
    packTimerSeconds: 165,
    pickerName: 'Unassigned',
    batchZone: 'Zone A (Konanakunte)',
  },
  {
    id: 'CXP-8945',
    customerName: 'Priya Sundaram',
    phone: '+91 97444 88990',
    address: 'Flat 102, Century Winter Sun, Konanakunte',
    distance: '1.8 km',
    items: [
      { name: 'Fresh Organic Robusta Bananas', qty: 2, unit: '500 g', packed: true, skuCode: 'SKU-1120' },
      { name: 'Coca-Cola Soft Drink Original Taste', qty: 1, unit: '750 ml', packed: true, skuCode: 'SKU-9941' },
      { name: "Lay's India's Magic Masala Chips", qty: 3, unit: '50 g', packed: false, skuCode: 'SKU-7752' },
    ],
    total: 168,
    paymentMethod: 'UPI Online Paid',
    time: '5 mins ago',
    status: 'packing',
    packTimerSeconds: 85,
    pickerName: 'Suresh K. (Bay 3)',
    batchZone: 'Zone A (Konanakunte)',
  },
  {
    id: 'CXP-8890',
    customerName: 'Rohan Mehta',
    phone: '+91 98111 44556',
    address: 'Villa 12, Judicial Layout, Kanakapura Rd',
    distance: '0.8 km',
    items: [
      { name: 'Tropicana 100% Real Orange Juice', qty: 1, unit: '1 L Pack', packed: true, skuCode: 'SKU-5520' },
      { name: 'Mother Dairy Fresh Paneer', qty: 2, unit: '200 g', packed: true, skuCode: 'SKU-6611' },
    ],
    total: 302,
    paymentMethod: 'UPI Online Paid',
    time: '12 mins ago',
    status: 'ready',
    packTimerSeconds: 0,
    pickerName: 'Vikram R. (Bay 1)',
    batchZone: 'Zone B (Yelachenahalli)',
  },
]

export default function CraveEPStoreConsole() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'coldchain' | 'leaderboard'>('orders')
  const [orderFilter, setOrderFilter] = useState<'all' | 'new' | 'packing' | 'ready'>('all')
  const [storeOnline, setStoreOnline] = useState(true)
  const [toastMsg, setToastMsg] = useState('')

  const [orders, setOrders] = useState<IncomingGroceryOrder[]>(INITIAL_GROCERY_ORDERS)
  const [inventory, setInventory] = useState<GroceryItem[]>(
    SAMPLE_GROCERY_ITEMS.map((item, idx) => ({
      ...item,
      stockCount: idx % 3 === 0 ? 8 : idx % 5 === 0 ? 0 : 45,
      expiryDays: (idx % 7) + 2,
      skuCode: `SKU-${1000 + idx * 47}`,
    }))
  )
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [stockFilter, setStockFilter] = useState<'all' | 'instock' | 'lowstock' | 'outofstock'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [barcodeQuery, setBarcodeQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  // Cold Chain Chiller State
  const [chillers, setChillers] = useState([
    { id: 'ch1', name: 'Freezer 01 (Ice Creams & Frozen)', temp: -18.2, target: '-18°C', status: 'Optimal' },
    { id: 'ch2', name: 'Chiller 02 (Dairy, Milk & Paneer)', temp: 3.8, target: '4°C', status: 'Optimal' },
    { id: 'ch3', name: 'Chiller 03 (Cold Drinks & Juices)', temp: 6.2, target: '6°C', status: 'Optimal' },
    { id: 'ch4', name: 'Fresh Zone (Veggies & Fruits)', temp: 12.1, target: '12°C', status: 'Optimal' },
  ])

  // New SKU Item form state
  const [newItemName, setNewItemName] = useState('')
  const [newItemCategory, setNewItemCategory] = useState('Dairy & Eggs')
  const [newItemUnit, setNewItemUnit] = useState('500 g')
  const [newItemPrice, setNewItemPrice] = useState('')
  const [newItemMrp, setNewItemMrp] = useState('')
  const [newItemStock, setNewItemStock] = useState('50')
  const [newItemImage, setNewItemImage] = useState('')

  const triggerToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 3000)
  }

  // Handle Order Status Workflow & Supabase Sync
  const handleUpdateOrderStatus = async (orderId: string, nextStatus: 'packing' | 'ready' | 'picked_up') => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          return {
            ...o,
            status: nextStatus,
            pickerName: nextStatus === 'packing' ? 'Suresh K. (Bay 3)' : o.pickerName,
          }
        }
        return o
      })
    )

    try {
      await supabase.from('orders').update({ status: nextStatus }).eq('id', orderId)
    } catch (e) {
      console.warn('Supabase sync order status:', e)
    }

    if (nextStatus === 'packing') triggerToast(`Order #${orderId} accepted & assigned to Picker Suresh K.!`)
    else if (nextStatus === 'ready') triggerToast(`Order #${orderId} packed & barcode printed! Ready for rider.`)
    else if (nextStatus === 'picked_up') triggerToast(`Order #${orderId} handed over to EV Rider! Out for 10-min delivery.`)
  }

  // Toggle checklist item
  const handleToggleItemPacked = (orderId: string, itemIdx: number) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          const updatedItems = o.items.map((it, idx) =>
            idx === itemIdx ? { ...it, packed: !it.packed } : it
          )
          return { ...o, items: updatedItems }
        }
        return o
      })
    )
  }

  // Barcode Scanner Quick Item Packing
  const handleBarcodeScanSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!barcodeQuery.trim()) return
    const code = barcodeQuery.trim().toUpperCase()
    let found = false
    setOrders((prev) =>
      prev.map((o) => {
        if (o.status === 'packing' || o.status === 'new') {
          const updatedItems = o.items.map((it) => {
            if (it.skuCode.toUpperCase() === code || it.name.toUpperCase().includes(code)) {
              found = true
              return { ...it, packed: true }
            }
            return it
          })
          return { ...o, items: updatedItems, status: 'packing' }
        }
        return o
      })
    )
    if (found) {
      triggerToast(`Barcode "${code}" Scanned Successfully! Item Checked.`)
    } else {
      triggerToast(`Barcode "${code}" not found in current active packing orders.`)
    }
    setBarcodeQuery('')
  }

  // Simulate new incoming order
  const handleSimulateNewOrder = () => {
    const newId = `CXP-${Math.floor(1000 + Math.random() * 9000)}`
    const simulatedOrder: IncomingGroceryOrder = {
      id: newId,
      customerName: 'Ananya Rao',
      phone: '+91 99888 77665',
      address: 'Flat 304, Brigade Meadows, Kanakapura Road',
      distance: '1.5 km',
      items: [
        { name: 'Amul Taaza Toned Fresh Milk', qty: 1, unit: '500 ml', packed: false, skuCode: 'SKU-8812' },
        { name: 'Mother Dairy Fresh Paneer', qty: 1, unit: '200 g', packed: false, skuCode: 'SKU-6611' },
        { name: 'Fresh Organic Robusta Bananas', qty: 1, unit: '500 g', packed: false, skuCode: 'SKU-1120' },
      ],
      total: 153,
      paymentMethod: 'UPI Online Paid',
      time: 'Just now',
      status: 'new',
      packTimerSeconds: 180,
      pickerName: 'Unassigned',
      batchZone: 'Zone A (Konanakunte)',
    }
    setOrders((prev) => [simulatedOrder, ...prev])
    triggerToast(`⚡ New Order #${newId} received! Target pack time: 3:00 mins.`)
  }

  // Toggle Stock Availability
  const handleToggleStock = (itemId: string) => {
    setInventory((prev) =>
      prev.map((i) => {
        if (i.id === itemId) {
          const newStatus = !i.inStock
          return {
            ...i,
            inStock: newStatus,
            stockCount: newStatus ? (i as any).stockCount || 30 : 0,
          }
        }
        return i
      })
    )
    triggerToast('Product SKU stock availability toggled!')
  }

  // Adjust Stock Count
  const handleAdjustStock = (itemId: string, delta: number) => {
    setInventory((prev) =>
      prev.map((i) => {
        if (i.id === itemId) {
          const currentCount = (i as any).stockCount || 0
          const newCount = Math.max(0, currentCount + delta)
          return {
            ...i,
            stockCount: newCount,
            inStock: newCount > 0,
          }
        }
        return i
      })
    )
  }

  // Auto Reorder Low Stock Items
  const handleAutoReorderStock = (itemId: string, name: string) => {
    handleAdjustStock(itemId, 50)
    triggerToast(`Auto-Reorder request sent to Central Warehouse for "${name}" (+50 units).`)
  }

  // Add New SKU Item
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemName || !newItemPrice) return
    const newItem: GroceryItem & { stockCount: number; expiryDays: number; skuCode: string } = {
      id: `g_${Date.now()}`,
      name: newItemName,
      category: newItemCategory,
      unit: newItemUnit,
      price: Number(newItemPrice),
      mrp: Number(newItemMrp) || Number(newItemPrice),
      image:
        newItemImage ||
        'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=500&q=80',
      inStock: true,
      stockCount: Number(newItemStock) || 50,
      expiryDays: 14,
      skuCode: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      discount: newItemMrp && Number(newItemMrp) > Number(newItemPrice)
        ? `${Math.round(((Number(newItemMrp) - Number(newItemPrice)) / Number(newItemMrp)) * 100)}% OFF`
        : undefined,
    }
    setInventory((prev) => [newItem, ...prev])
    setNewItemName('')
    setNewItemPrice('')
    setNewItemMrp('')
    setNewItemStock('50')
    setNewItemImage('')
    setShowAddModal(false)
    triggerToast(`New SKU "${newItem.name}" added to dark store inventory!`)
  }

  // Filtered Inventory
  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const matchesCat = categoryFilter === 'All' || item.category === categoryFilter
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ((item as any).skuCode || '').toLowerCase().includes(searchQuery.toLowerCase())
      const stockCount = (item as any).stockCount || 0
      const matchesStock =
        stockFilter === 'all'
          ? true
          : stockFilter === 'instock'
          ? item.inStock && stockCount > 10
          : stockFilter === 'lowstock'
          ? item.inStock && stockCount > 0 && stockCount <= 10
          : !item.inStock || stockCount === 0
      return matchesCat && matchesSearch && matchesStock
    })
  }, [inventory, categoryFilter, searchQuery, stockFilter])

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (orderFilter === 'all') return true
      return o.status === orderFilter
    })
  }, [orders, orderFilter])

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  return (
    <div className="min-h-screen bg-[#f8f9f7] text-[#18201c] pb-24 selection:bg-[#d9f447] selection:text-[#18201c]">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-5 z-50 flex items-center gap-2 rounded-2xl bg-[#18201c] px-4 py-3 text-xs font-black text-white shadow-2xl border border-white/20 animate-in fade-in slide-in-from-top-4 duration-300">
          <Sparkles className="size-4 text-[#d9f447]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Console Command Header Bar (Clean Light Theme) */}
      <header className="sticky top-0 z-40 border-b border-[#e2e7dc] bg-white/95 backdrop-blur-md px-4 py-4 sm:px-6 shadow-xs">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-[#d9f447] text-[#18201c] font-black shadow-md border border-[#c2dc38]">
              <Zap className="size-6 fill-current" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-[#18201c]">
                  crave<span className="text-emerald-700">EP</span>
                </span>
                <span className="rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800">
                  Dark Store Hub #402 · Kanakapura Corridor
                </span>
              </div>
              <p className="text-xs text-[#5c6861]">
                Instamart Dark Store Operations, Inventory &amp; Order Fulfillment Console
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Online Status Toggle */}
            <button
              onClick={() => {
                setStoreOnline(!storeOnline)
                triggerToast(storeOnline ? 'Store paused for new orders' : 'Store is ONLINE for orders!')
              }}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-black border transition ${
                storeOnline
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}
            >
              <span className={`size-2.5 rounded-full ${storeOnline ? 'bg-emerald-600 animate-ping' : 'bg-rose-600'}`} />
              <span>{storeOnline ? 'STORE ONLINE' : 'PAUSED'}</span>
            </button>

            {/* Test Simulation Button */}
            <button
              onClick={handleSimulateNewOrder}
              className="flex items-center gap-1.5 rounded-2xl bg-[#18201c] px-4 py-2.5 text-xs font-black text-white shadow-md hover:bg-[#323f37] transition active:scale-95"
            >
              <Plus className="size-4 text-[#d9f447]" />
              Simulate Live Order
            </button>
          </div>
        </div>
      </header>

      {/* Main Console Container */}
      <main className="mx-auto max-w-[1280px] px-4 pt-6 sm:px-6">
        {/* KPI Dashboard Metrics Bar (Light Theme) */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="rounded-3xl border border-[#e2e7dc] bg-white p-5 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-[#627068] mb-2">
              <span className="font-bold uppercase tracking-wider">Unfulfilled Queue</span>
              <Box className="size-4 text-emerald-600" />
            </div>
            <p className="text-3xl font-black text-[#18201c]">
              {orders.filter((o) => o.status === 'new' || o.status === 'packing').length}
            </p>
            <p className="mt-2 text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
              <Clock className="size-3" /> Target Packing &lt; 3 mins
            </p>
          </div>

          <div className="rounded-3xl border border-[#e2e7dc] bg-white p-5 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-[#627068] mb-2">
              <span className="font-bold uppercase tracking-wider">Avg Pack Speed</span>
              <Zap className="size-4 text-amber-600" />
            </div>
            <p className="text-3xl font-black text-amber-700">1m 24s</p>
            <p className="mt-2 text-[11px] font-semibold text-[#5c6861]">
              98.4% On-time SLA Fulfillment
            </p>
          </div>

          <div className="rounded-3xl border border-[#e2e7dc] bg-white p-5 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-[#627068] mb-2">
              <span className="font-bold uppercase tracking-wider">Store Revenue Today</span>
              <TrendingUp className="size-4 text-purple-600" />
            </div>
            <p className="text-3xl font-black text-[#18201c]">₹24,850</p>
            <p className="mt-2 text-[11px] font-semibold text-purple-700">
              84 Instamart Drops Completed
            </p>
          </div>

          <div className="rounded-3xl border border-[#e2e7dc] bg-white p-5 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-[#627068] mb-2">
              <span className="font-bold uppercase tracking-wider">Stock Alerts</span>
              <AlertTriangle className="size-4 text-rose-600" />
            </div>
            <p className="text-3xl font-black text-rose-700">
              {inventory.filter((i) => !i.inStock).length} Out
            </p>
            <p className="mt-2 text-[11px] font-semibold text-amber-700">
              {inventory.filter((i) => i.inStock && ((i as any).stockCount || 0) <= 10).length} Low Stock SKUs
            </p>
          </div>
        </div>

        {/* Tab Selector & Navigation */}
        <div className="flex items-center justify-between border-b border-[#e2e7dc] pb-4 mb-6">
          <div className="flex items-center gap-2 rounded-2xl bg-[#f0f3eb] p-1.5 text-xs font-bold flex-wrap">
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 transition ${
                activeTab === 'orders'
                  ? 'bg-white text-[#18201c] shadow-sm'
                  : 'text-[#627068] hover:text-[#18201c]'
              }`}
            >
              <Package className="size-4 text-[#86a018]" />
              <span>Live Orders ({orders.filter((o) => o.status !== 'picked_up').length})</span>
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 transition ${
                activeTab === 'inventory'
                  ? 'bg-white text-[#18201c] shadow-sm'
                  : 'text-[#627068] hover:text-[#18201c]'
              }`}
            >
              <Layers className="size-4 text-[#86a018]" />
              <span>Stock SKUs ({inventory.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('coldchain')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 transition ${
                activeTab === 'coldchain'
                  ? 'bg-white text-[#18201c] shadow-sm'
                  : 'text-[#627068] hover:text-[#18201c]'
              }`}
            >
              <Thermometer className="size-4 text-blue-600" />
              <span>Cold-Chain Chillers</span>
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 transition ${
                activeTab === 'leaderboard'
                  ? 'bg-white text-[#18201c] shadow-sm'
                  : 'text-[#627068] hover:text-[#18201c]'
              }`}
            >
              <Award className="size-4 text-amber-600" />
              <span>Picker Staff Leaderboard</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            TAB 1: LIVE FULFILLMENT TERMINAL (ORDER DISPATCHER)
           ========================================================================= */}
        {activeTab === 'orders' && (
          <div className="flex flex-col gap-6">
            {/* Barcode Scanner & Quick Filter Bar */}
            <div className="grid gap-4 md:grid-cols-12 items-center">
              <div className="md:col-span-6">
                <form onSubmit={handleBarcodeScanSubmit} className="relative flex items-center rounded-2xl border-2 border-[#18201c]/20 bg-white px-3.5 py-2.5 shadow-sm focus-within:border-emerald-600">
                  <QrCode className="size-4 text-emerald-700 mr-2 shrink-0" />
                  <input
                    type="text"
                    value={barcodeQuery}
                    onChange={(e) => setBarcodeQuery(e.target.value)}
                    placeholder="Scan SKU barcode or enter SKU code (e.g. SKU-8812)..."
                    className="w-full bg-transparent text-xs font-bold text-[#18201c] outline-none placeholder:font-normal placeholder:text-gray-400"
                  />
                  <button type="submit" className="rounded-xl bg-[#18201c] px-3 py-1.5 text-[11px] font-bold text-white shrink-0">
                    Scan Barcode
                  </button>
                </form>
              </div>

              <div className="md:col-span-6 flex items-center justify-end gap-2 text-xs font-bold flex-wrap">
                <span className="text-[#627068]">Status:</span>
                {(['all', 'new', 'packing', 'ready'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setOrderFilter(st)}
                    className={`rounded-xl px-3 py-1.5 capitalize transition ${
                      orderFilter === st
                        ? 'bg-[#18201c] text-[#d9f447]'
                        : 'bg-white border border-[#e2e7dc] text-[#5c6861] hover:text-[#18201c]'
                    }`}
                  >
                    {st === 'all' ? 'All Orders' : st}
                  </button>
                ))}
              </div>
            </div>

            {/* Orders Cards Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredOrders.length === 0 ? (
                <div className="col-span-full py-16 text-center rounded-3xl border border-dashed border-[#e2e7dc] bg-white">
                  <CheckCircle2 className="mx-auto size-12 text-emerald-600 mb-3" />
                  <p className="text-base font-bold text-[#18201c]">All Incoming Instamart Orders Fulfilled!</p>
                  <p className="text-xs text-gray-500 mt-1">
                    No active unfulfilled orders in the queue. Click &quot;Simulate Live Order&quot; above to test.
                  </p>
                </div>
              ) : (
                filteredOrders.map((order) => {
                  const allItemsPacked = order.items.every((i) => i.packed)
                  return (
                    <div
                      key={order.id}
                      className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-[#e2e7dc] bg-white p-6 shadow-sm transition hover:shadow-xl hover:border-[#18201c] relative"
                    >
                      <div>
                        {/* Card Header */}
                        <div className="flex items-center justify-between border-b border-[#f0f4eb] pb-3 mb-4">
                          <div>
                            <span className="font-mono text-sm font-black text-[#18201c]">
                              #{order.id}
                            </span>
                            <p className="text-[11px] text-[#627068] mt-0.5">{order.time} · {order.distance}</p>
                          </div>

                          <span
                            className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
                              order.status === 'new'
                                ? 'bg-rose-100 text-rose-900 border border-rose-200 animate-pulse'
                                : order.status === 'packing'
                                ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                            }`}
                          >
                            {order.status === 'new'
                              ? 'NEW ORDER'
                              : order.status === 'packing'
                              ? 'PACKING'
                              : 'READY FOR RIDER'}
                          </span>
                        </div>

                        {/* Customer & Address */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-[#18201c]">{order.customerName}</p>
                            <span className="text-[10px] font-bold text-gray-500">{order.batchZone}</span>
                          </div>
                          <p className="text-[11px] text-[#627068] line-clamp-1">{order.address}</p>
                        </div>

                        {/* SLA Countdown Timer */}
                        {order.status !== 'ready' && (
                          <div className="rounded-2xl bg-[#f8f9f6] p-3 border border-[#e8ece3] mb-4 flex items-center justify-between text-xs font-bold">
                            <span className="flex items-center gap-1.5 text-[#5c6861]">
                              <Clock className="size-4 text-emerald-700" /> Pack SLA Target:
                            </span>
                            <span className="font-mono text-emerald-800 text-sm font-black">
                              {formatTimer(order.packTimerSeconds)}
                            </span>
                          </div>
                        )}

                        {/* Interactive Picker Packing Checklist */}
                        <div className="rounded-2xl bg-[#f8f9f6] p-3.5 border border-[#e8ece3] mb-4">
                          <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                            <span>Picker Checklist ({order.items.length} SKUs)</span>
                            <span>{order.pickerName}</span>
                          </div>

                          <div className="flex flex-col gap-2">
                            {order.items.map((item, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleToggleItemPacked(order.id, idx)}
                                className={`flex items-center justify-between text-xs p-2 rounded-xl text-left border transition ${
                                  item.packed
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                    : 'bg-white border-[#e2e7dc] text-[#18201c] hover:border-gray-400'
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  <span
                                    className={`grid size-4 place-items-center rounded ${
                                      item.packed ? 'bg-emerald-600 text-white' : 'border border-gray-300 bg-white'
                                    }`}
                                  >
                                    {item.packed && <Check className="size-3 stroke-[3]" />}
                                  </span>
                                  <span className={item.packed ? 'line-through text-gray-400' : 'font-semibold'}>
                                    {item.qty}x {item.name}
                                  </span>
                                </span>
                                <span className="text-[10px] text-gray-400 font-mono">{item.skuCode}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Card Action Footer */}
                      <div>
                        <div className="flex items-center justify-between text-xs font-bold border-t border-[#f0f4eb] pt-3 mb-3 text-[#5c6861]">
                          <span>Total Paid: ₹{order.total} ({order.paymentMethod})</span>
                        </div>

                        {order.status === 'new' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'packing')}
                            className="w-full rounded-2xl bg-[#18201c] py-3 text-xs font-black text-[#d9f447] hover:bg-[#323f37] transition shadow flex items-center justify-center gap-2"
                          >
                            <span>Accept &amp; Assign to Picker</span>
                            <ArrowRight className="size-4" />
                          </button>
                        )}

                        {order.status === 'packing' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'ready')}
                            disabled={!allItemsPacked}
                            className={`w-full rounded-2xl py-3 text-xs font-black transition shadow flex items-center justify-center gap-2 ${
                              allItemsPacked
                                ? 'bg-amber-400 text-black hover:bg-amber-500'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            <span>{allItemsPacked ? 'Mark Packed & Print Barcode' : 'Check All Items First'}</span>
                            <CheckCircle2 className="size-4" />
                          </button>
                        )}

                        {order.status === 'ready' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'picked_up')}
                            className="w-full rounded-2xl bg-emerald-600 py-3 text-xs font-black text-white hover:bg-emerald-700 transition shadow flex items-center justify-center gap-2"
                          >
                            <Bike className="size-4" />
                            <span>Handover to Rider (Dispatch Drop)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: INVENTORY & STOCK MANAGER
           ========================================================================= */}
        {activeTab === 'inventory' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#18201c]">
                  Dark Store Inventory &amp; Stock Manager
                </h2>
                <p className="text-xs text-[#5c6861]">
                  Manage dark store #402 SKU availability, stock counts, shelf expiry, and prices in real-time.
                </p>
              </div>

              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 rounded-2xl bg-[#18201c] px-5 py-3 text-xs font-black text-[#d9f447] shadow hover:bg-[#323f37] transition shrink-0"
              >
                <Plus className="size-4" /> Add New SKU Product
              </button>
            </div>

            {/* Filter Bar & Search */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              {/* Category Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 text-xs font-bold scrollbar-none">
                {['All', 'Dairy & Eggs', 'Fruits & Veggies', 'Snacks & Munchies', 'Drinks & Juices', 'Instant Food', 'Cleaning & Household', 'Personal Care'].map(
                  (cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`rounded-xl px-3.5 py-2 transition whitespace-nowrap ${
                        categoryFilter === cat
                          ? 'bg-[#18201c] text-[#d9f447] shadow-sm'
                          : 'bg-white border border-[#e2e7dc] text-[#5c6861] hover:text-[#18201c]'
                      }`}
                    >
                      {cat}
                    </button>
                  )
                )}
              </div>

              {/* Stock Status Filter */}
              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="text-[#627068]">Status:</span>
                {(['all', 'instock', 'lowstock', 'outofstock'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStockFilter(st)}
                    className={`rounded-xl px-3 py-1.5 uppercase tracking-wider text-[10px] transition ${
                      stockFilter === st
                        ? 'bg-[#18201c] text-white'
                        : 'bg-white border border-[#e2e7dc] text-[#5c6861] hover:text-[#18201c]'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative flex items-center rounded-2xl border border-[#e2e7dc] bg-white px-4 py-3 text-xs">
              <Search className="size-4 text-gray-400 mr-2 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search SKU item name, SKU code (e.g. SKU-1000), or category..."
                className="w-full bg-transparent text-xs font-medium text-[#18201c] outline-none placeholder:text-gray-400"
              />
            </div>

            {/* Inventory SKUs Grid */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {filteredInventory.map((item) => {
                const stockCount = (item as any).stockCount || 0
                const skuCode = (item as any).skuCode || 'SKU-1000'
                const expiryDays = (item as any).expiryDays || 7
                return (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between overflow-hidden rounded-3xl border border-[#e2e7dc] bg-white p-5 shadow-xs transition hover:border-[#18201c]"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="size-14 rounded-2xl object-cover bg-gray-50 border border-[#e2e7dc]"
                          />
                          <div>
                            <span className="text-[10px] font-bold text-[#86a018] uppercase tracking-wider">
                              {item.category} · {skuCode}
                            </span>
                            <h3 className="text-xs font-bold text-[#18201c] line-clamp-1">{item.name}</h3>
                            <p className="text-[11px] text-[#627068]">{item.unit}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleToggleStock(item.id)}
                          className={`rounded-full px-3 py-1 text-[10px] font-black uppercase shrink-0 ${
                            item.inStock && stockCount > 0
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                              : 'bg-rose-100 text-rose-900 border border-rose-200'
                          }`}
                        >
                          {item.inStock && stockCount > 0 ? 'In Stock' : 'Out of Stock'}
                        </button>
                      </div>

                      {/* Expiry Badge & Price */}
                      <div className="flex items-center justify-between text-xs border-t border-[#f0f4eb] pt-3 mb-3">
                        <div>
                          <span className="text-gray-400 text-[10px]">Price:</span>
                          <span className="ml-1 font-bold text-[#18201c]">₹{item.price}</span>
                          {item.mrp > item.price && (
                            <span className="ml-1.5 text-[10px] text-gray-400 line-through">
                              ₹{item.mrp}
                            </span>
                          )}
                        </div>

                        <div>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            Fresh: {expiryDays}d Expiry
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stock Counter Controls */}
                    <div className="flex items-center justify-between pt-2 border-t border-[#f0f4eb]">
                      <div>
                        <span className="text-[11px] font-bold text-[#18201c]">
                          {stockCount} units
                        </span>
                        {stockCount <= 10 && (
                          <button
                            onClick={() => handleAutoReorderStock(item.id, item.name)}
                            className="ml-2 text-[10px] font-extrabold text-rose-700 hover:underline"
                          >
                            Auto-Reorder (+50)
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2 rounded-xl bg-[#f8f9f6] border border-[#e8ece3] px-3 py-1 text-xs font-bold">
                        <button
                          onClick={() => handleAdjustStock(item.id, -5)}
                          className="text-gray-500 hover:text-[#18201c]"
                        >
                          -5
                        </button>
                        <span className="text-[#18201c] font-mono">{stockCount}</span>
                        <button
                          onClick={() => handleAdjustStock(item.id, 5)}
                          className="text-emerald-700 hover:text-[#18201c]"
                        >
                          +5
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: COLD-CHAIN CHILLER MONITOR
           ========================================================================= */}
        {activeTab === 'coldchain' && (
          <div className="flex flex-col gap-6 max-w-4xl">
            <div>
              <h2 className="text-lg font-bold text-[#18201c]">
                Dark Store Temperature &amp; Cold-Chain Audit
              </h2>
              <p className="text-xs text-[#5c6861]">
                Real-time IoT sensors monitoring dark store freezer &amp; chiller temperatures for dairy, beverages, and fresh produce.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {chillers.map((c) => (
                <div key={c.id} className="rounded-3xl border border-[#e2e7dc] bg-white p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-[#18201c] flex items-center gap-1.5">
                      <Thermometer className="size-4 text-blue-600" /> {c.name}
                    </span>
                    <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 border border-emerald-200">
                      {c.status}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <p className="text-3xl font-black text-[#18201c]">{c.temp}°C</p>
                    <span className="text-xs text-gray-500">Target: {c.target}</span>
                  </div>
                  <div className="mt-3 text-[11px] text-gray-500 border-t border-[#f0f4eb] pt-2">
                    Sensor #SNS-402 · Last sync 10 secs ago
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 4: PICKER STAFF LEADERBOARD
           ========================================================================= */}
        {activeTab === 'leaderboard' && (
          <div className="flex flex-col gap-6 max-w-4xl">
            <div>
              <h2 className="text-lg font-bold text-[#18201c]">
                Dark Store Picker Staff Performance Leaderboard
              </h2>
              <p className="text-xs text-[#5c6861]">
                Packing efficiency, average item pick speed, and accuracy metrics for store staff.
              </p>
            </div>

            <div className="overflow-hidden rounded-3xl border border-[#e2e7dc] bg-white shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8f9f6] border-b border-[#e2e7dc] font-bold text-gray-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-4">Picker Staff</th>
                    <th className="p-4">Orders Packed Today</th>
                    <th className="p-4">Avg Pick Speed</th>
                    <th className="p-4 text-right">Accuracy Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f4eb]">
                  {[
                    { name: 'Suresh Kumar', bay: 'Bay 3', orders: 42, speed: '1m 12s', accuracy: '99.8%' },
                    { name: 'Ramesh V.', bay: 'Bay 1', orders: 38, speed: '1m 24s', accuracy: '99.5%' },
                    { name: 'Vikram R.', bay: 'Bay 2', orders: 35, speed: '1m 30s', accuracy: '99.2%' },
                  ].map((p, idx) => (
                    <tr key={idx} className="hover:bg-[#fcfdfa] transition">
                      <td className="p-4">
                        <p className="font-bold text-[#18201c]">{p.name}</p>
                        <p className="text-[10px] text-gray-500">{p.bay}</p>
                      </td>
                      <td className="p-4 font-bold text-[#18201c]">{p.orders} drops</td>
                      <td className="p-4 font-mono font-bold text-emerald-700">{p.speed}</td>
                      <td className="p-4 text-right font-bold text-purple-700">{p.accuracy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Add New SKU Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200 border border-[#e2e7dc]">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
              <h3 className="font-bold text-base text-[#18201c]">Add New Grocery SKU to craveEP</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-[#18201c]">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddItem} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-[#18201c]">Product SKU Name</label>
                <input
                  type="text"
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. Amul Butter 100g"
                  className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-xs outline-none focus:border-[#18201c]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-[#18201c]">Category</label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-xs outline-none focus:border-[#18201c] bg-white"
                  >
                    <option>Dairy &amp; Eggs</option>
                    <option>Fruits &amp; Veggies</option>
                    <option>Snacks &amp; Munchies</option>
                    <option>Drinks &amp; Juices</option>
                    <option>Instant Food</option>
                    <option>Cleaning &amp; Household</option>
                    <option>Personal Care</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#18201c]">Unit / Pack Size</label>
                  <input
                    type="text"
                    required
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    placeholder="e.g. 100 g or 1 L"
                    className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-xs outline-none focus:border-[#18201c]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-bold text-[#18201c]">Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    placeholder="45"
                    className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-xs outline-none focus:border-[#18201c]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#18201c]">MRP (₹)</label>
                  <input
                    type="number"
                    value={newItemMrp}
                    onChange={(e) => setNewItemMrp(e.target.value)}
                    placeholder="50"
                    className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-xs outline-none focus:border-[#18201c]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#18201c]">Stock Count</label>
                  <input
                    type="number"
                    value={newItemStock}
                    onChange={(e) => setNewItemStock(e.target.value)}
                    placeholder="50"
                    className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-xs outline-none focus:border-[#18201c]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#18201c]">Image URL (Optional)</label>
                <input
                  type="url"
                  value={newItemImage}
                  onChange={(e) => setNewItemImage(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-xs outline-none focus:border-[#18201c]"
                />
              </div>

              <button
                type="submit"
                className="mt-3 w-full rounded-2xl bg-[#18201c] py-3.5 text-xs font-black text-[#d9f447] hover:bg-[#323f37] transition shadow"
              >
                Add Product SKU to Dark Store
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
