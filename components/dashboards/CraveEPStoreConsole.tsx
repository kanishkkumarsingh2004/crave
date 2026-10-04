'use client'

import CraveLogo from '@/components/CraveLogo'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  Bike,
  Box,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Layers,
  LogOut,
  Package,
  Plus,
  QrCode,
  ScanLine,
  Search,
  Sparkles,
  Thermometer,
  TrendingUp,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
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
  const { user, logout } = useAuth()
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
  const [showCameraScanner, setShowCameraScanner] = useState(false)
  const [scannerTarget, setScannerTarget] = useState<'add_item' | 'packing' | 'inventory_search'>(
    'add_item'
  )

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
  const [newItemBarcode, setNewItemBarcode] = useState('')

  useEffect(() => {
    if (!user?.id) {
      setOrders([])
      setInventory([])
      setChillers([])
      setPickerMetrics([])
      setDashboardError('Sign in with a vendor account linked to a craveXP store.')
      return
    }

    let cancelled = false
    const loadConsoleData = async () => {
      setDashboardError('')
      try {
        let vendorId = 'cravexp_dark_store_01'
        setRestaurantId('cravexp_dark_store_01')
        setRestaurantName('craveXP Instamart Warehouse #01')
        setRestaurantAddress('Kanakapura Road Central Dark Store Warehouse, Bengaluru')
        setStoreOnline(true)

        const [orderResult, inventoryResult, sensorResult, pickerResult] = await Promise.all([
          supabase.from('orders').select('*').order('created_at', { ascending: false }),
          supabase
            .from('menu_items')
            .select('*')
            .eq('restaurant_id', 'cravexp_dark_store_01')
            .order('name'),
          supabase.from('cold_chain_sensors').select('*').order('name'),
          supabase.from('picker_metrics').select('*').order('orders_packed', { ascending: false }),
        ])

        if (cancelled) return

        const orderRows = orderResult.data ?? []
        setOrders(
          orderRows.map((order: any) => {
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
          itemRows.map((item: any) => ({
            id: item.id,
            name: item.name,
            unit: item.unit || item.description || '1 Pack',
            price: Number(item.price),
            mrp: Number(item.comparePrice ?? item.mrp ?? item.price),
            image: item.imageUrl ?? item.image ?? '',
            category: item.category || 'Dairy & Eggs',
            inStock: item.status !== 'OUT_OF_STOCK' && item.in_stock !== false,
            restaurantId: item.vendorId || vendorId,
            restaurantName: restaurantName || 'craveXP Store',
            stockCount: Number(item.stockCount ?? item.stock_count ?? 50),
            skuCode: item.sku || item.sku_code || item.id,
            expiryDate: item.expiry_date ?? null,
          }))
        )

        setChillers(
          (sensorResult.data ?? []).map((sensor: any) => ({
            id: sensor.id,
            name: sensor.name,
            temp: Number(sensor.temperature_c),
            target: sensor.target_temperature_c == null ? '' : `${sensor.target_temperature_c}°C`,
            status: sensor.status,
            updatedAt: sensor.updated_at ?? null,
          }))
        )

        setPickerMetrics(
          (pickerResult.data ?? []).map((picker: any) => ({
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
          .map((picker: any) => picker.average_pick_seconds)
          .filter((value: any): value is number => value != null)
        const accuracyValues = (pickerResult.data ?? [])
          .map((picker: any) => picker.accuracy_rate)
          .filter((value: any): value is number => value != null)
        setAveragePickSeconds(
          pickTimes.length
            ? Math.round(
                pickTimes.reduce((sum: number, value: number) => sum + value, 0) / pickTimes.length
              )
            : null
        )
        setAverageAccuracy(
          accuracyValues.length
            ? accuracyValues.reduce((sum: number, value: number) => sum + value, 0) /
                accuracyValues.length
            : null
        )

        const today = new Date().toDateString()
        setDailyRevenue(
          orderRows
            .filter(
              (order: any) =>
                order.created_at && new Date(order.created_at).toDateString() === today
            )
            .reduce((sum: number, order: any) => sum + Number(order.total_amount ?? 0), 0)
        )
        setCompletedDrops(
          orderRows.filter((order: any) => ['picked_up', 'completed'].includes(order.status)).length
        )
      } catch (error) {
        if (cancelled) return
        console.error('Failed to load craveXP store data:', error)
        setDashboardError('craveXP store data could not be loaded from the database.')
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
      .eq('owner_id', user?.id || '')
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
      triggerToast(`Order #${orderId} accepted & assigned to store picker!`)
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

  // Camera Barcode Scanner Handlers
  const openCameraScanner = (target: 'add_item' | 'packing' | 'inventory_search') => {
    setScannerTarget(target)
    setShowCameraScanner(true)
  }

  const handleCameraScanSuccess = (code: string) => {
    setShowCameraScanner(false)
    const cleanCode = code.trim().toUpperCase()

    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, audioCtx.currentTime)
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime)
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.start()
      osc.stop(audioCtx.currentTime + 0.15)
    } catch {}

    if (scannerTarget === 'add_item') {
      setNewItemBarcode(cleanCode)
      triggerToast(`Barcode Scanned: [${cleanCode}]! Enter SKU details to save to database.`)
      setShowAddModal(true)
    } else if (scannerTarget === 'packing') {
      setBarcodeQuery(cleanCode)
      const codeToMatch = cleanCode.toUpperCase()
      const updates = orders.flatMap((order) => {
        if (order.status !== 'packing' && order.status !== 'new') return []
        const itemIndex = order.items.findIndex(
          (item) =>
            item.skuCode.toUpperCase() === codeToMatch ||
            item.name.toUpperCase().includes(codeToMatch)
        )
        if (itemIndex < 0) return []
        return [{ orderId: order.id, itemIndex }]
      })
      if (!updates.length) {
        triggerToast(`Scanned [${cleanCode}], but no matching item found in active orders.`)
        return
      }
      for (const update of updates) handleToggleItemPacked(update.orderId, update.itemIndex)
      triggerToast(`Scanned [${cleanCode}] & updated order packing checklist!`)
    } else if (scannerTarget === 'inventory_search') {
      const match = inventory.find((item) => item.skuCode.toUpperCase() === cleanCode.toUpperCase())
      if (match) {
        setSearchQuery(cleanCode)
        triggerToast(`Found product "${match.name}" (Stock: ${match.stockCount})`)
      } else {
        triggerToast(`New Barcode [${cleanCode}]! Opening SKU creation form...`)
        setNewItemBarcode(cleanCode)
        setShowAddModal(true)
      }
    }
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
    const nextStatus = nextStock ? 'ACTIVE' : 'OUT_OF_STOCK'

    let { error } = await (supabase as any)
      .from('products')
      .update({ status: nextStatus, updatedAt: new Date().toISOString() })
      .eq('id', itemId)

    if (error && error.code === 'PGRST205') {
      const fallback = await supabase
        .from('menu_items')
        .update({ in_stock: nextStock, stock_count: nextCount })
        .eq('id', itemId)
      error = fallback.error
    }

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
    const nextStatus = newCount > 0 ? 'ACTIVE' : 'OUT_OF_STOCK'

    let { error } = await (supabase as any)
      .from('products')
      .update({ status: nextStatus, updatedAt: new Date().toISOString() })
      .eq('id', itemId)

    if (error && error.code === 'PGRST205') {
      const fallback = await supabase
        .from('menu_items')
        .update({ stock_count: newCount, in_stock: newCount > 0 })
        .eq('id', itemId)
      error = fallback.error
    }

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
    const customBarcode = newItemBarcode.trim().toUpperCase()
    const skuCode = customBarcode || crypto.randomUUID()

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
      skuCode,
      expiryDate: null,
      discount:
        newItemMrp && Number(newItemMrp) > Number(newItemPrice)
          ? `${Math.round(((Number(newItemMrp) - Number(newItemPrice)) / Number(newItemMrp)) * 100)}% OFF`
          : undefined,
    }

    const productRecord = {
      id: newItem.id,
      vendorId: restaurantId || 'cmur2n46c000lg1dkpbvcyg83',
      categoryId: 'cmuq0vdea0008g1u0lgo5z2af',
      name: newItem.name,
      description: `${newItem.category} · ${newItem.unit}`,
      sku: newItem.skuCode,
      price: newItem.price,
      comparePrice: newItem.mrp,
      currency: 'INR',
      imageUrl: newItem.image || null,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    let { error } = await (supabase as any).from('products').insert([productRecord])

    if (error && error.code === 'PGRST205') {
      const fallback = await supabase.from('menu_items').insert([
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
      error = fallback.error
    }

    if (error) {
      console.error('Could not create inventory item:', error)
      triggerToast(`Could not add product: ${error.message || 'Database error'}`)
      return
    }

    setInventory((prev) => [newItem, ...prev])
    setNewItemName('')
    setNewItemPrice('')
    setNewItemMrp('')
    setNewItemStock('')
    setNewItemImage('')
    setNewItemBarcode('')
    setShowAddModal(false)
    triggerToast(`Added "${newItem.name}" with Barcode [${skuCode}] to inventory!`)
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
                <CraveLogo variant="cravexp" size="lg" />
                <span className="max-w-[13rem] rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-1 text-[9px] sm:text-[10px] font-black uppercase tracking-wider leading-tight text-emerald-800 sm:max-w-none">
                  {restaurantName || 'craveXP Store'}
                </span>
              </div>
              <p className="mt-1 text-[11px] sm:text-xs leading-snug text-[#5c6861]">
                {restaurantAddress || 'Inventory and order fulfillment'}
              </p>
            </div>
          </div>

          <div className="flex w-full items-center gap-2 sm:w-auto sm:gap-3">
            {/* Dashboard Navigation */}
            <Link
              href={user?.role === 'admin' ? '/admin/dashboard' : '/vendor/dashboard'}
              className="flex items-center gap-1.5 rounded-2xl border border-[#dfe4dc] bg-[#f8f9f7] px-3.5 py-2.5 text-xs font-bold text-[#18201c] hover:bg-[#e2e7dc] transition shrink-0"
            >
              <ArrowLeft className="size-3.5 text-[#7e9619]" />
              <span>Dashboard</span>
            </Link>

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

            {/* Logout button */}
            <button
              onClick={() => void logout()}
              title="Sign Out"
              className="flex items-center gap-1 rounded-2xl border border-[#dfe4dc] bg-white px-3 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-50 transition shrink-0"
            >
              <LogOut className="size-3.5" />
            </button>
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
                    type="button"
                    onClick={() => openCameraScanner('packing')}
                    className="min-h-10 shrink-0 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition mr-1 flex items-center gap-1.5 shadow-xs"
                  >
                    <Camera className="size-3.5" />
                    <span>Camera Scan</span>
                  </button>
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
                  craveXP Inventory &amp; Stock Manager
                </h2>
                <p className="text-xs text-[#5c6861]">
                  Manage craveXP #402 SKU availability, stock counts, shelf expiry, and prices in
                  real-time.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openCameraScanner('inventory_search')}
                  className="flex items-center gap-2 rounded-2xl border border-[#e2e7dc] bg-white px-4 py-3 text-xs font-bold text-[#18201c] shadow-xs hover:bg-gray-50 transition shrink-0"
                >
                  <Camera className="size-4 text-emerald-600" />
                  <span>Scan Camera Barcode</span>
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 rounded-2xl bg-[#18201c] px-5 py-3 text-xs font-black text-[#d9f447] shadow hover:bg-[#323f37] transition shrink-0"
                >
                  <Plus className="size-4" /> Add New SKU Product
                </button>
              </div>
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
                craveXP Temperature &amp; Cold-Chain Audit
              </h2>
              <p className="text-xs text-[#5c6861]">
                Real-time IoT sensors monitoring craveXP freezer &amp; chiller temperatures for
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
                craveXP Staff Performance Leaderboard
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
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-[#18201c]">
                    Barcode / EAN (Scan or Enter Real Product Barcode)
                  </label>
                  <button
                    type="button"
                    onClick={() => openCameraScanner('add_item')}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg transition"
                  >
                    <Camera className="size-3" />
                    <span>Scan Camera</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={newItemBarcode}
                  onChange={(e) => setNewItemBarcode(e.target.value)}
                  placeholder="e.g. 8901058852314 (Optional - Auto-generated if left empty)"
                  className="w-full rounded-xl border border-gray-200 p-3 text-xs font-mono outline-none focus:border-[#18201c]"
                />
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
                Add Product SKU to craveXP Store
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Camera Barcode Scanner Modal */}
      <CameraBarcodeScannerModal
        isOpen={showCameraScanner}
        onClose={() => setShowCameraScanner(false)}
        onScan={handleCameraScanSuccess}
        title={
          scannerTarget === 'add_item'
            ? 'Scan Item Barcode to Add SKU'
            : scannerTarget === 'packing'
              ? 'Scan Item Barcode for Packing'
              : 'Scan Product Barcode'
        }
      />
    </div>
  )
}

interface CameraBarcodeScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onScan: (code: string) => void
  title?: string
}

function CameraBarcodeScannerModal({
  isOpen,
  onClose,
  onScan,
  title = 'Scan Product Barcode',
}: CameraBarcodeScannerModalProps) {
  const [manualCode, setManualCode] = useState('')
  const [cameraError, setCameraError] = useState('')
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string>('')
  const scannerRef = React.useRef<any>(null)

  useEffect(() => {
    if (!isOpen) return
    let isCancelled = false

    setCameraError('')

    const initScanner = async () => {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode')
        if (isCancelled) return

        const element = document.getElementById('camera-reader-view')
        if (!element) return

        // Stop existing instance if running
        if (scannerRef.current) {
          try {
            if (scannerRef.current.isScanning) {
              await scannerRef.current.stop()
            }
          } catch {}
        }

        const html5Qrcode = new Html5Qrcode('camera-reader-view')
        scannerRef.current = html5Qrcode

        const availableCams = await Html5Qrcode.getCameras()
        if (availableCams && availableCams.length > 0) {
          setCameras(availableCams)
        }

        let targetCamera: any = selectedCameraId
        if (!targetCamera && availableCams && availableCams.length > 0) {
          const backCam = availableCams.find(
            (c) =>
              c.label.toLowerCase().includes('back') ||
              c.label.toLowerCase().includes('rear') ||
              c.label.toLowerCase().includes('environment')
          )
          targetCamera = backCam ? backCam.id : availableCams[0].id
          setSelectedCameraId(targetCamera)
        }

        if (!targetCamera) {
          targetCamera = { facingMode: 'environment' }
        }

        const config = {
          fps: 15,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            return {
              width: Math.floor(viewfinderWidth * 0.85),
              height: Math.floor(viewfinderHeight * 0.65),
            }
          },
          aspectRatio: 1.333333,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
        }

        const onScanSuccess = (decodedText: string) => {
          if (isCancelled) return
          isCancelled = true
          try {
            if (scannerRef.current && scannerRef.current.isScanning) {
              scannerRef.current.stop().catch(() => {})
            }
          } catch {}
          onScan(decodedText)
        }

        try {
          await html5Qrcode.start(targetCamera, config, onScanSuccess, () => {})
        } catch (firstErr) {
          console.warn('Initial camera start failed, retrying default camera mode...', firstErr)
          await html5Qrcode.start({ facingMode: 'user' }, config, onScanSuccess, () => {})
        }
      } catch (err: any) {
        console.warn('Camera stream error:', err)
        if (!isCancelled) {
          setCameraError(
            'Camera permission is required or camera device was not found. Ensure camera access is allowed in browser settings or type barcode manually.'
          )
        }
      }
    }

    const timer = setTimeout(initScanner, 150)

    return () => {
      isCancelled = true
      clearTimeout(timer)
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(() => {})
          }
        } catch {}
      }
    }
  }, [isOpen, selectedCameraId])

  if (!isOpen) return null

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualCode.trim()) return
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(() => {})
        }
      } catch {}
    }
    onScan(manualCode.trim())
    setManualCode('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-[#e2e7dc] bg-white p-5 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Camera className="size-5 text-emerald-600" />
            <h3 className="font-bold text-base text-[#18201c]">{title}</h3>
          </div>
          <button
            onClick={() => {
              if (scannerRef.current) {
                try {
                  if (scannerRef.current.isScanning) {
                    scannerRef.current.stop().catch(() => {})
                  }
                } catch {}
              }
              onClose()
            }}
            className="text-gray-400 hover:text-[#18201c] text-lg font-bold"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-gray-500 mb-3">
          Point device camera directly at the physical item's barcode or QR code.
        </p>

        {/* Camera Selector (if multiple cameras exist) */}
        {cameras.length > 1 && (
          <div className="mb-3">
            <label className="text-[10px] font-bold text-gray-500 block mb-1 uppercase tracking-wider">
              Select Camera Device:
            </label>
            <select
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-2 text-xs outline-none bg-white font-medium text-[#18201c]"
            >
              {cameras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label || `Camera ${c.id.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Live Camera Scanner Feed Container */}
        <div className="relative min-h-[240px] rounded-2xl overflow-hidden bg-gray-950 flex items-center justify-center border border-gray-200">
          <div id="camera-reader-view" className="w-full h-full min-h-[240px]" />
          {cameraError && (
            <div className="absolute inset-0 p-4 bg-gray-950/90 text-white flex flex-col items-center justify-center text-center text-xs">
              <AlertTriangle className="size-8 text-amber-400 mb-2" />
              <p className="max-w-[260px] text-gray-300 font-medium mb-3">{cameraError}</p>
            </div>
          )}
        </div>

        {/* Manual Barcode Input Fallback */}
        <div className="mt-4 border-t border-gray-100 pt-3">
          <label className="text-[11px] font-bold text-gray-500 block mb-1">
            Or type / paste Barcode manually:
          </label>
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="e.g. 8901058852314"
              className="flex-1 rounded-xl border border-gray-200 p-2.5 text-xs font-mono outline-none focus:border-[#18201c]"
            />
            <button
              type="submit"
              className="flex items-center gap-1 rounded-xl bg-[#18201c] px-4 py-2.5 text-xs font-bold text-[#d9f447] hover:bg-[#323f37] transition"
            >
              <ScanLine className="size-3.5" />
              <span>Use Code</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
