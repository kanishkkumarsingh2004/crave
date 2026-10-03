'use client'

import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import {
  AlertTriangle,
  ArrowRight,
  Award,
  Bike,
  Box,
  Check,
  CheckCircle2,
  Clock,
  Layers,
  Package,
  Plus,
  QrCode,
  Search,
  Sparkles,
  Thermometer,
  TrendingUp,
  Zap,
} from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import { GroceryItem } from './CraveXPStore'

interface IncomingGroceryOrder {
  id: string
  customerName: string
  phone: string
  address: string
  distance?: string
  items: { name: string; qty: number; unit: string; packed?: boolean; skuCode: string }[]
  total: number
  paymentMethod: string
  time: string
  status: 'new' | 'packing' | 'ready' | 'picked_up'
  packTimerSeconds?: number
  pickerName: string
  batchZone: string
}

export default function CraveXPStoreConsole() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'coldchain' | 'leaderboard'>(
    'orders'
  )
  const [orderFilter, setOrderFilter] = useState<'all' | 'new' | 'packing' | 'ready'>('all')
  const [storeOnline, setStoreOnline] = useState(false)
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [restaurantName, setRestaurantName] = useState('')
  const [restaurantAddress, setRestaurantAddress] = useState('')
  const [dailyRevenue, setDailyRevenue] = useState(0)
  const [completedDrops, setCompletedDrops] = useState(0)
  const [averagePickSeconds, setAveragePickSeconds] = useState<number | null>(null)
  const [averageAccuracy, setAverageAccuracy] = useState<number | null>(null)
  const [pickerMetrics, setPickerMetrics] = useState<
    { id: string; name: string; bay: string; orders: number; speed: string; accuracy: string }[]
  >([])
  const [dashboardError, setDashboardError] = useState('')
  const [toastMsg, setToastMsg] = useState('')

  const [orders, setOrders] = useState<IncomingGroceryOrder[]>([])
  const [inventory, setInventory] = useState<
    (GroceryItem & { skuCode: string; expiryDate: string | null })[]
  >([])
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [stockFilter, setStockFilter] = useState<'all' | 'instock' | 'lowstock' | 'outofstock'>(
    'all'
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [barcodeQuery, setBarcodeQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  // Cold Chain Chiller State
  const [chillers, setChillers] = useState<
    {
      id: string
      name: string
      temp: number
      target: string
      status: string
      updatedAt: string | null
    }[]
  >([])

  // New SKU Item form state
  const [newItemName, setNewItemName] = useState('')
  const [newItemCategory, setNewItemCategory] = useState('Dairy & Eggs')
  const [newItemUnit, setNewItemUnit] = useState('')
  const [newItemPrice, setNewItemPrice] = useState('')
  const [newItemMrp, setNewItemMrp] = useState('')
  const [newItemStock, setNewItemStock] = useState('')
  const [newItemImage, setNewItemImage] = useState('')

  useEffect(() => {
    if (!user?.id) {
      setOrders([])
      setInventory([])
      setChillers([])
      setPickerMetrics([])
      setDashboardError('Sign in with a vendor account linked to a dark store.')
      return
    }

    let cancelled = false
    const loadConsoleData = async () => {
      setDashboardError('')
      try {
        const { data: restaurant, error: restaurantError } = await supabase
          .from('restaurants')
          .select('id, name, address, is_open')
          .eq('owner_id', user.id)
          .eq('is_dark_store', true)
          .maybeSingle()

        if (restaurantError) throw restaurantError
        if (!restaurant) {
          setRestaurantId(null)
          setRestaurantName('')
          setRestaurantAddress('')
          setStoreOnline(false)
          setOrders([])
          setInventory([])
          setChillers([])
          setPickerMetrics([])
          return
        }

        setRestaurantId(restaurant.id)
        setRestaurantName(restaurant.name)
        setRestaurantAddress(restaurant.address ?? '')
        setStoreOnline(Boolean(restaurant.is_open))

        const [orderResult, inventoryResult, sensorResult, pickerResult] = await Promise.all([
          supabase
            .from('orders')
            .select('*')
            .eq('restaurant_id', restaurant.id)
            .order('created_at', { ascending: false }),
          supabase.from('menu_items').select('*').eq('restaurant_id', restaurant.id).order('name'),
          supabase
            .from('cold_chain_sensors')
            .select('*')
            .eq('restaurant_id', restaurant.id)
            .order('name'),
          supabase
            .from('picker_metrics')
            .select('*')
            .eq('restaurant_id', restaurant.id)
            .order('orders_packed', { ascending: false }),
        ])

        const queryError =
          orderResult.error || inventoryResult.error || sensorResult.error || pickerResult.error
        if (queryError) throw queryError
        if (cancelled) return

        const orderRows = orderResult.data ?? []
        setOrders(
          orderRows.map((order) => {
            const rawItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items
            const items = Array.isArray(rawItems)
              ? rawItems.map((item: Record<string, unknown>) => ({
                  name: String(item.name ?? ''),
                  qty: Number(item.qty ?? 1),
                  unit: String(item.unit ?? ''),
                  packed: Boolean(item.packed),
                  skuCode: String(item.sku_code ?? item.menu_item_id ?? ''),
                }))
              : []
            const status = order.status === 'preparing' ? 'packing' : order.status
            return {
              id: order.id,
              customerName: order.customer_name,
              phone: order.customer_phone ?? '',
              address: order.customer_address ?? '',
              items,
              total: Number(order.total_amount ?? 0),
              paymentMethod: order.payment_method ?? '',
              time: order.created_at ? new Date(order.created_at).toLocaleString() : '',
              status: status === 'completed' ? 'picked_up' : status,
              pickerName: order.picker_name ?? '',
              batchZone: order.customer_address ?? '',
            } as IncomingGroceryOrder
          })
        )

        const itemRows = inventoryResult.data ?? []
        setInventory(
          itemRows.map((item) => ({
            id: item.id,
            name: item.name,
            unit: item.unit ?? '',
            price: Number(item.price),
            mrp: Number(item.mrp ?? item.price),
            image: item.image ?? '',
            category: item.category,
            inStock: Boolean(item.in_stock),
            restaurantId: item.restaurant_id,
            restaurantName: restaurant.name,
            stockCount: Number(item.stock_count ?? 0),
            skuCode: item.sku_code ?? item.id,
            expiryDate: item.expiry_date ?? null,
          }))
        )

        setChillers(
          (sensorResult.data ?? []).map((sensor) => ({
            id: sensor.id,
            name: sensor.name,
            temp: Number(sensor.temperature_c),
            target: sensor.target_temperature_c == null ? '' : `${sensor.target_temperature_c}°C`,
            status: sensor.status,
            updatedAt: sensor.updated_at ?? null,
          }))
        )

        setPickerMetrics(
          (pickerResult.data ?? []).map((picker) => ({
            id: picker.id,
            name: picker.picker_name,
            bay: picker.bay ?? '',
            orders: Number(picker.orders_packed ?? 0),
            speed:
              picker.average_pick_seconds == null
                ? ''
                : `${Math.floor(picker.average_pick_seconds / 60)}m ${picker.average_pick_seconds % 60}s`,
            accuracy: picker.accuracy_rate == null ? '' : `${picker.accuracy_rate}%`,
          }))
        )
        const pickTimes = (pickerResult.data ?? [])
          .map((picker) => picker.average_pick_seconds)
          .filter((value): value is number => value != null)
        const accuracyValues = (pickerResult.data ?? [])
          .map((picker) => picker.accuracy_rate)
          .filter((value): value is number => value != null)
        setAveragePickSeconds(
          pickTimes.length
            ? Math.round(pickTimes.reduce((sum, value) => sum + value, 0) / pickTimes.length)
            : null
        )
        setAverageAccuracy(
          accuracyValues.length
            ? accuracyValues.reduce((sum, value) => sum + value, 0) / accuracyValues.length
            : null
        )

        const today = new Date().toDateString()
        setDailyRevenue(
          orderRows
            .filter(
              (order) => order.created_at && new Date(order.created_at).toDateString() === today
            )
            .reduce((sum, order) => sum + Number(order.total_amount ?? 0), 0)
        )
        setCompletedDrops(
          orderRows.filter((order) => ['picked_up', 'completed'].includes(order.status)).length
        )
      } catch (error) {
        if (cancelled) return
        console.error('Failed to load dark-store data:', error)
        setDashboardError('Dark-store data could not be loaded from the database.')
        setOrders([])
        setInventory([])
        setChillers([])
        setPickerMetrics([])
      }
    }

    loadConsoleData()
    const refresh = setInterval(loadConsoleData, 15000)
    return () => {
      cancelled = true
      clearInterval(refresh)
    }
  }, [user?.id])

  const triggerToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 3000)
  }

  const handleToggleStoreOnline = async () => {
    if (!restaurantId) return
    const nextStatus = !storeOnline
    const { error } = await supabase
      .from('restaurants')
      .update({ is_open: nextStatus })
      .eq('id', restaurantId)
      .eq('owner_id', user?.id)
    if (error) {
      triggerToast('Could not update store availability.')
      return
    }
    setStoreOnline(nextStatus)
  }

  // Handle Order Status Workflow & Supabase Sync
  const handleUpdateOrderStatus = async (
    orderId: string,
    nextStatus: 'packing' | 'ready' | 'picked_up'
  ) => {
    if (!restaurantId) return
    const { error } = await supabase
      .from('orders')
      .update({ status: nextStatus })
      .eq('id', orderId)
      .eq('restaurant_id', restaurantId)
    if (error) {
      triggerToast('Could not update the order. Please try again.')
      return
    }
    setOrders((prev) =>
      prev.map((order) => (order.id === orderId ? { ...order, status: nextStatus } : order))
    )

    if (nextStatus === 'packing')
      triggerToast(`Order #${orderId} accepted & assigned to Picker Suresh K.!`)
    else if (nextStatus === 'ready')
      triggerToast(`Order #${orderId} packed & barcode printed! Ready for rider.`)
    else if (nextStatus === 'picked_up')
      triggerToast(`Order #${orderId} handed over to EV Rider! Out for 10-min delivery.`)
  }

  // Toggle checklist item
  const handleToggleItemPacked = async (orderId: string, itemIdx: number) => {
    if (!restaurantId) return
    const order = orders.find((entry) => entry.id === orderId)
    if (!order) return
    const updatedItems = order.items.map((item, index) =>
      index === itemIdx ? { ...item, packed: !item.packed } : item
    )
    const { error } = await supabase
      .from('orders')
      .update({ items: updatedItems })
      .eq('id', orderId)
      .eq('restaurant_id', restaurantId)
    if (error) {
      triggerToast('Could not update the packing checklist.')
      return
    }
    setOrders((prev) =>
      prev.map((entry) => (entry.id === orderId ? { ...entry, items: updatedItems } : entry))
    )
  }

  // Barcode Scanner Quick Item Packing
  const handleBarcodeScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!barcodeQuery.trim() || !restaurantId) return
    const code = barcodeQuery.trim().toUpperCase()
    const updates = orders.flatMap((order) => {
      if (order.status !== 'packing' && order.status !== 'new') return []
      const itemIndex = order.items.findIndex(
        (item) => item.skuCode.toUpperCase() === code || item.name.toUpperCase().includes(code)
      )
      if (itemIndex < 0) return []
      return [{ orderId: order.id, itemIndex }]
    })
    if (!updates.length) {
      triggerToast('That code was not found in an active order.')
      return
    }
    for (const update of updates) await handleToggleItemPacked(update.orderId, update.itemIndex)
    triggerToast('Order checklist updated from the scanned code.')
    setBarcodeQuery('')
  }

  // Toggle Stock Availability
  const handleToggleStock = async (itemId: string) => {
    if (!restaurantId) return
    const item = inventory.find((entry) => entry.id === itemId)
    if (!item) return
    const nextStock = !item.inStock
    const nextCount = nextStock ? Math.max(item.stockCount, 1) : 0
    const { error } = await supabase
      .from('menu_items')
      .update({ in_stock: nextStock, stock_count: nextCount })
      .eq('id', itemId)
      .eq('restaurant_id', restaurantId)
    if (error) {
      triggerToast('Could not update product availability.')
      return
    }
    setInventory((prev) =>
      prev.map((entry) =>
        entry.id === itemId ? { ...entry, inStock: nextStock, stockCount: nextCount } : entry
      )
    )
  }

  // Adjust Stock Count
  const handleAdjustStock = async (itemId: string, delta: number) => {
    if (!restaurantId) return
    const item = inventory.find((entry) => entry.id === itemId)
    if (!item) return
    const newCount = Math.max(0, item.stockCount + delta)
    const { error } = await supabase
      .from('menu_items')
      .update({ stock_count: newCount, in_stock: newCount > 0 })
      .eq('id', itemId)
      .eq('restaurant_id', restaurantId)
    if (error) {
      triggerToast('Could not update the stock count.')
      return
    }
    setInventory((prev) =>
      prev.map((entry) =>
        entry.id === itemId ? { ...entry, stockCount: newCount, inStock: newCount > 0 } : entry
      )
    )
  }

  // Add New SKU Item
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!restaurantId || !newItemName.trim() || !newItemPrice || !newItemStock) return
    const newItem: GroceryItem & { skuCode: string; expiryDate: string | null } = {
      id: crypto.randomUUID(),
      name: newItemName,
      category: newItemCategory,
      unit: newItemUnit,
      price: Number(newItemPrice),
      mrp: Number(newItemMrp) || Number(newItemPrice),
      image: newItemImage,
      inStock: true,
      restaurantId,
      restaurantName,
      stockCount: Number(newItemStock),
      skuCode: crypto.randomUUID(),
      expiryDate: null,
      discount:
        newItemMrp && Number(newItemMrp) > Number(newItemPrice)
          ? `${Math.round(((Number(newItemMrp) - Number(newItemPrice)) / Number(newItemMrp)) * 100)}% OFF`
          : undefined,
    }

    const { error } = await supabase.from('menu_items').insert([
      {
        id: newItem.id,
        restaurant_id: restaurantId,
        name: newItem.name,
        category: newItem.category,
        unit: newItem.unit,
        price: newItem.price,
        mrp: newItem.mrp,
        image: newItem.image || null,
        in_stock: newItem.inStock,
        stock_count: newItem.stockCount,
        sku_code: newItem.skuCode,
        expiry_date: newItem.expiryDate,
      },
    ])
    if (error) {
      console.error('Could not create inventory item:', error)
      triggerToast('Could not add this product to the database.')
      return
    }

    setInventory((prev) => [newItem, ...prev])
    setNewItemName('')
    setNewItemPrice('')
    setNewItemMrp('')
    setNewItemStock('')
    setNewItemImage('')
    setShowAddModal(false)
    triggerToast(`Added "${newItem.name}" to the store inventory.`)
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
                <span className="whitespace-nowrap text-xl sm:text-2xl font-black tracking-tight text-[#18201c]">
                  crave<span className="text-emerald-700">XP</span>
                </span>
                <span className="max-w-[13rem] rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-1 text-[9px] sm:text-[10px] font-black uppercase tracking-wider leading-tight text-emerald-800 sm:max-w-none">
                  {restaurantName || 'Dark store'}
                </span>
              </div>
              <p className="mt-1 text-[11px] sm:text-xs leading-snug text-[#5c6861]">
                {restaurantAddress || 'Inventory and order fulfillment'}
              </p>
            </div>
          </div>

          <div className="flex w-full items-center gap-2 sm:w-auto sm:gap-3">
            {/* Online Status Toggle */}
            <button
              onClick={() => {
                void handleToggleStoreOnline()
              }}
              disabled={!restaurantId}
              className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-[10px] font-black border transition sm:flex-none sm:px-4 sm:text-xs ${
                storeOnline
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}
            >
              <span
                className={`size-2.5 rounded-full ${storeOnline ? 'bg-emerald-600 animate-ping' : 'bg-rose-600'}`}
              />
              <span>{storeOnline ? 'STORE ONLINE' : 'PAUSED'}</span>
            </button>

            <span className="text-[10px] text-gray-500 sm:text-xs">
              {orders.length} active orders
            </span>
          </div>
        </div>
      </header>

      {/* Main Console Container */}
      <main className="mx-auto max-w-[1280px] px-3 pt-4 sm:px-6 sm:pt-6">
        {dashboardError && (
          <p
            role="alert"
            className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"
          >
            {dashboardError}
          </p>
        )}
        {/* KPI Dashboard Metrics Bar (Light Theme) */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:mb-8 sm:gap-4 lg:grid-cols-4">
          <div className="relative overflow-hidden rounded-2xl border border-[#e2e7dc] bg-white p-3.5 shadow-xs sm:rounded-3xl sm:p-5">
            <div className="mb-2 flex items-center justify-between gap-2 text-[10px] text-[#627068] sm:text-xs">
              <span className="font-bold uppercase tracking-wider">Unfulfilled Queue</span>
              <Box className="size-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-[#18201c] sm:text-3xl">
              {orders.filter((o) => o.status === 'new' || o.status === 'packing').length}
            </p>
            <p className="mt-2 flex items-center gap-1 text-[9px] font-semibold leading-tight text-emerald-700 sm:text-[11px]">
              {orders.length} orders loaded
            </p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-[#e2e7dc] bg-white p-3.5 shadow-xs sm:rounded-3xl sm:p-5">
            <div className="mb-2 flex items-center justify-between gap-2 text-[10px] text-[#627068] sm:text-xs">
              <span className="font-bold uppercase tracking-wider">Avg Pack Speed</span>
              <Zap className="size-4 text-amber-600" />
            </div>
            <p className="text-2xl font-black text-amber-700 sm:text-3xl">
              {averagePickSeconds == null
                ? '—'
                : `${Math.floor(averagePickSeconds / 60)}m ${averagePickSeconds % 60}s`}
            </p>
            <p className="mt-2 text-[9px] font-semibold leading-tight text-[#5c6861] sm:text-[11px]">
              {averageAccuracy == null
                ? 'No picker accuracy data'
                : `${averageAccuracy.toFixed(1)}% average picker accuracy`}
            </p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-[#e2e7dc] bg-white p-3.5 shadow-xs sm:rounded-3xl sm:p-5">
            <div className="mb-2 flex items-center justify-between gap-2 text-[10px] text-[#627068] sm:text-xs">
              <span className="font-bold uppercase tracking-wider">Store Revenue Today</span>
              <TrendingUp className="size-4 text-purple-600" />
            </div>
            <p className="text-2xl font-black text-[#18201c] sm:text-3xl">
              ₹{dailyRevenue.toLocaleString()}
            </p>
            <p className="mt-2 text-[9px] font-semibold leading-tight text-purple-700 sm:text-[11px]">
              {completedDrops} completed drops
            </p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-[#e2e7dc] bg-white p-3.5 shadow-xs sm:rounded-3xl sm:p-5">
            <div className="mb-2 flex items-center justify-between gap-2 text-[10px] text-[#627068] sm:text-xs">
              <span className="font-bold uppercase tracking-wider">Stock Alerts</span>
              <AlertTriangle className="size-4 text-rose-600" />
            </div>
            <p className="text-2xl font-black text-rose-700 sm:text-3xl">
              {inventory.filter((i) => !i.inStock).length} Out
            </p>
            <p className="mt-2 text-[9px] font-semibold leading-tight text-amber-700 sm:text-[11px]">
              {inventory.filter((i) => i.inStock && i.stockCount <= 10).length} Low Stock SKUs
            </p>
          </div>
        </div>

        {/* Tab Selector & Navigation */}
        <div className="mb-5 border-b border-[#e2e7dc] pb-4 sm:mb-6">
          <div className="scrollbar-none flex w-full snap-x items-center gap-2 overflow-x-auto rounded-2xl bg-[#f0f3eb] p-1.5 text-xs font-bold">
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex min-h-11 shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 transition touch-manipulation sm:px-4 ${
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
              className={`flex min-h-11 shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 transition touch-manipulation sm:px-4 ${
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
              className={`flex min-h-11 shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 transition touch-manipulation sm:px-4 ${
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
              className={`flex min-h-11 shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 transition touch-manipulation sm:px-4 ${
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
            <div className="grid items-center gap-3 sm:gap-4 md:grid-cols-12">
              <div className="md:col-span-6">
                <form
                  onSubmit={handleBarcodeScanSubmit}
                  className="relative flex min-h-12 items-center rounded-2xl border-2 border-[#18201c]/20 bg-white px-3 py-2.5 shadow-sm focus-within:border-emerald-600 sm:px-3.5"
                >
                  <QrCode className="size-4 text-emerald-700 mr-2 shrink-0" />
                  <input
                    type="text"
                    value={barcodeQuery}
                    onChange={(e) => setBarcodeQuery(e.target.value)}
                    placeholder="Scan barcode or enter SKU..."
                    className="min-w-0 w-full bg-transparent text-xs font-bold text-[#18201c] outline-none placeholder:font-normal placeholder:text-gray-400"
                  />
                  <button
                    type="submit"
                    className="min-h-10 shrink-0 rounded-xl bg-[#18201c] px-2.5 py-1.5 text-[10px] font-bold text-white sm:px-3 sm:text-[11px]"
                  >
                    Scan Barcode
                  </button>
                </form>
              </div>

              <div className="scrollbar-none flex min-w-0 items-center justify-start gap-2 overflow-x-auto text-xs font-bold md:col-span-6 md:justify-end">
                <span className="shrink-0 text-[#627068]">Status:</span>
                {(['all', 'new', 'packing', 'ready'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setOrderFilter(st)}
                    className={`min-h-10 shrink-0 rounded-xl px-3 py-2 capitalize transition touch-manipulation ${
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
                  <Package className="mx-auto size-10 text-gray-300 mb-3" />
                  <p className="text-base font-bold text-[#18201c]">
                    No active orders in the database.
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    New customer orders for this store will appear here.
                  </p>
                </div>
              ) : (
                filteredOrders.map((order) => {
                  const allItemsPacked = order.items.every((i) => i.packed)
                  return (
                    <div
                      key={order.id}
                      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#e2e7dc] bg-white p-4 shadow-sm transition hover:border-[#18201c] hover:shadow-xl sm:rounded-3xl sm:p-6"
                    >
                      <div>
                        {/* Card Header */}
                        <div className="flex items-center justify-between border-b border-[#f0f4eb] pb-3 mb-4">
                          <div>
                            <span className="font-mono text-sm font-black text-[#18201c]">
                              #{order.id}
                            </span>
                            <p className="text-[11px] text-[#627068] mt-0.5">
                              {order.time}
                              {order.distance ? ` · ${order.distance}` : ''}
                            </p>
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
                            <span className="text-[10px] font-bold text-gray-500">
                              {order.batchZone}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#627068] line-clamp-1">{order.address}</p>
                        </div>

                        {/* SLA Countdown Timer */}
                        {order.packTimerSeconds != null && order.status !== 'ready' && (
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
                                      item.packed
                                        ? 'bg-emerald-600 text-white'
                                        : 'border border-gray-300 bg-white'
                                    }`}
                                  >
                                    {item.packed && <Check className="size-3 stroke-[3]" />}
                                  </span>
                                  <span
                                    className={
                                      item.packed ? 'line-through text-gray-400' : 'font-semibold'
                                    }
                                  >
                                    {item.qty}x {item.name}
                                  </span>
                                </span>
                                <span className="text-[10px] text-gray-400 font-mono">
                                  {item.skuCode}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Card Action Footer */}
                      <div>
                        <div className="flex items-center justify-between text-xs font-bold border-t border-[#f0f4eb] pt-3 mb-3 text-[#5c6861]">
                          <span>
                            Total Paid: ₹{order.total} ({order.paymentMethod})
                          </span>
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
                            <span>
                              {allItemsPacked
                                ? 'Mark Packed & Print Barcode'
                                : 'Check All Items First'}
                            </span>
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
                  Manage dark store #402 SKU availability, stock counts, shelf expiry, and prices in
                  real-time.
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
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              {/* Category Pills */}
              <div className="scrollbar-none flex w-full min-w-0 items-center gap-2 overflow-x-auto pb-2 text-xs font-bold sm:w-auto">
                {[
                  'All',
                  'Dairy & Eggs',
                  'Fruits & Veggies',
                  'Snacks & Munchies',
                  'Drinks & Juices',
                  'Instant Food',
                  'Cleaning & Household',
                  'Personal Care',
                ].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`min-h-10 shrink-0 rounded-xl px-3.5 py-2 transition whitespace-nowrap touch-manipulation ${
                      categoryFilter === cat
                        ? 'bg-[#18201c] text-[#d9f447] shadow-sm'
                        : 'bg-white border border-[#e2e7dc] text-[#5c6861] hover:text-[#18201c]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Stock Status Filter */}
              <div className="scrollbar-none flex w-full min-w-0 items-center gap-2 overflow-x-auto text-xs font-bold sm:w-auto">
                <span className="shrink-0 text-[#627068]">Status:</span>
                {(['all', 'instock', 'lowstock', 'outofstock'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStockFilter(st)}
                    className={`min-h-10 shrink-0 rounded-xl px-3 py-2 uppercase tracking-wider text-[10px] transition touch-manipulation ${
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
                const stockCount = item.stockCount
                const skuCode = item.skuCode
                return (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between overflow-hidden rounded-3xl border border-[#e2e7dc] bg-white p-5 shadow-xs transition hover:border-[#18201c]"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="size-14 rounded-2xl object-cover bg-gray-50 border border-[#e2e7dc]"
                            />
                          ) : (
                            <span className="grid size-14 place-items-center rounded-2xl bg-gray-100 text-gray-400">
                              <Package className="size-5" />
                            </span>
                          )}
                          <div>
                            <span className="text-[10px] font-bold text-[#86a018] uppercase tracking-wider">
                              {item.category} · {skuCode}
                            </span>
                            <h3 className="text-xs font-bold text-[#18201c] line-clamp-1">
                              {item.name}
                            </h3>
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

                        {item.expiryDate && (
                          <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            Expires {new Date(item.expiryDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stock Counter Controls */}
                    <div className="flex items-center justify-between pt-2 border-t border-[#f0f4eb]">
                      <div>
                        <span className="text-[11px] font-bold text-[#18201c]">
                          {stockCount} units
                        </span>
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
                Real-time IoT sensors monitoring dark store freezer &amp; chiller temperatures for
                dairy, beverages, and fresh produce.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {chillers.length === 0 ? (
                <p className="col-span-full rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-600">
                  No cold-chain sensors are registered for this store.
                </p>
              ) : (
                chillers.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-3xl border border-[#e2e7dc] bg-white p-6 shadow-xs"
                  >
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
                      {c.updatedAt
                        ? `Updated ${new Date(c.updatedAt).toLocaleString()}`
                        : 'Last update not recorded'}
                    </div>
                  </div>
                ))
              )}
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

            <div className="overflow-x-auto rounded-3xl border border-[#e2e7dc] bg-white shadow-xs">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead className="bg-[#f8f9f6] border-b border-[#e2e7dc] font-bold text-gray-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-4">Picker Staff</th>
                    <th className="p-4">Orders Packed Today</th>
                    <th className="p-4">Avg Pick Speed</th>
                    <th className="p-4 text-right">Accuracy Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f4eb]">
                  {pickerMetrics.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-500">
                        No picker performance records are stored for this store.
                      </td>
                    </tr>
                  ) : (
                    pickerMetrics.map((p) => (
                      <tr key={p.id} className="hover:bg-[#fcfdfa] transition">
                        <td className="p-4">
                          <p className="font-bold text-[#18201c]">{p.name}</p>
                          <p className="text-[10px] text-gray-500">{p.bay}</p>
                        </td>
                        <td className="p-4 font-bold text-[#18201c]">{p.orders} drops</td>
                        <td className="p-4 font-mono font-bold text-emerald-700">{p.speed}</td>
                        <td className="p-4 text-right font-bold text-purple-700">{p.accuracy}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Add New SKU Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-xs sm:p-4">
          <div className="max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-3xl border border-[#e2e7dc] bg-white p-4 shadow-2xl animate-in zoom-in-95 duration-200 sm:max-h-[calc(100dvh-2rem)] sm:p-6">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
              <h3 className="font-bold text-base text-[#18201c]">Add New Grocery SKU to craveXP</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-[#18201c]"
              >
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

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
