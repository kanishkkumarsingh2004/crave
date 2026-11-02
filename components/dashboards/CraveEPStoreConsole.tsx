'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  Box,
  Layers,
  LogOut,
  Package,
  TrendingUp,
  Zap,
} from 'lucide-react'
import CraveLogo from '@/components/CraveLogo'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/lib/toast-context'
import { useVendorOrderUpdates } from '@/lib/websocket'
import AddGrocerySkuModal from '@/components/cravexp/AddGrocerySkuModal'
import CameraBarcodeScannerModal from '@/components/cravexp/CameraBarcodeScannerModal'
import StoreInventoryView from '@/components/cravexp/StoreInventoryView'
import StoreOrdersView from '@/components/cravexp/StoreOrdersView'
import { IncomingGroceryOrder, InventoryItem } from '@/components/cravexp/types'

export default function CraveEPStoreConsole() {
  const { user, logout } = useAuth()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory'>('orders')
  const [orderFilter, setOrderFilter] = useState<'all' | 'new' | 'packing' | 'ready'>('all')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [stockFilter, setStockFilter] = useState<'all' | 'instock' | 'lowstock' | 'outofstock'>(
    'all'
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [barcodeQuery, setBarcodeQuery] = useState('')

  const [storeOnline, setStoreOnline] = useState(false)
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [restaurantName, setRestaurantName] = useState('')
  const [restaurantAddress, setRestaurantAddress] = useState('')
  const [dailyRevenue, setDailyRevenue] = useState(0)
  const [completedDrops, setCompletedDrops] = useState(0)
  const [dashboardError, setDashboardError] = useState('')

  const [orders, setOrders] = useState<IncomingGroceryOrder[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showCameraScanner, setShowCameraScanner] = useState(false)
  const [scannerTarget, setScannerTarget] = useState<'add_item' | 'packing' | 'inventory_search'>(
    'add_item'
  )
  const [newItemBarcode, setNewItemBarcode] = useState('')

  const pendingOrderStatusRef = useRef<Record<string, boolean>>({})

  useEffect(() => {
    if (!user?.id) {
      setOrders([])
      setInventory([])
      setDashboardError('Sign in with a vendor account linked to a craveXP store.')
      return
    }

    let cancelled = false
    const loadConsoleData = async () => {
      setDashboardError('')
      try {
        let vendorId = user?.restaurantId || user?.id || 'cravexp_dark_store_01'
        let name = user?.restaurantName || 'craveXP Instamart Warehouse #01'
        let addr = user?.address || 'Kanakapura Road Central Dark Store Warehouse, Bengaluru'

        try {
          const restRes = await fetch('/api/restaurants', { cache: 'no-store' })
          const restJson = await restRes.json()
          if (restJson.success && Array.isArray(restJson.restaurants)) {
            const matched = restJson.restaurants.find(
              (r: any) =>
                r.owner_id === user?.id ||
                r.id === user?.restaurantId ||
                r.is_dark_store === true ||
                r.name?.toLowerCase().includes('cravexp') ||
                r.cuisine?.toLowerCase().includes('cravexp')
            )
            if (matched) {
              vendorId = matched.id
              name = matched.name
              if (matched.address) addr = matched.address
            }
          }
        } catch {}

        setRestaurantId(vendorId)
        setRestaurantName(name)
        setRestaurantAddress(addr)
        setStoreOnline(true)

        const [ordersResponse, inventoryResponse] = await Promise.all([
          fetch(`/api/orders?vendorId=${encodeURIComponent(vendorId)}`, { cache: 'no-store' }),
          fetch(`/api/menu-items?restaurantId=${encodeURIComponent(vendorId)}`, {
            cache: 'no-store',
          }),
        ])
        if (!ordersResponse.ok || !inventoryResponse.ok) {
          throw new Error('Failed to load CraveXP data from the local database')
        }
        const orderResult = await ordersResponse.json()
        const inventoryResult = await inventoryResponse.json()

        if (cancelled) return

        const orderRows = orderResult.orders ?? []
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

        const itemRows = inventoryResult.items ?? []
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
            restaurantName: name || 'craveXP Store',
            stockCount: Number(item.stockCount ?? item.stock_count ?? 50),
            skuCode: item.sku || item.sku_code || item.id,
            expiryDate: item.expiry_date ?? null,
          }))
        )

        const today = new Date().toDateString()
        setDailyRevenue(
          orderRows
            .filter((o: any) => o.created_at && new Date(o.created_at).toDateString() === today)
            .reduce((sum: number, o: any) => sum + Number(o.total_amount ?? 0), 0)
        )
        setCompletedDrops(
          orderRows.filter((o: any) => ['picked_up', 'completed'].includes(o.status)).length
        )
      } catch (error) {
        if (cancelled) return
        console.error('Failed to load craveXP store data:', error)
        setDashboardError('craveXP store data could not be loaded from the database.')
        setOrders([])
        setInventory([])
      }
    }

    loadConsoleData()
    return () => {
      cancelled = true
    }
  }, [user?.id, user?.restaurantId, user?.restaurantName])

  useVendorOrderUpdates((evtData) => {
    const o = evtData?.order || evtData
    const isApproved =
      !o ||
      !o.id ||
      o.payment_status === 'verified' ||
      (o.status && !['payment_pending', 'payment_submitted'].includes(o.status))

    if (isApproved && restaurantId) {
      fetch(`/api/orders?vendorId=${encodeURIComponent(restaurantId)}`, { cache: 'no-store' })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.orders)) {
            const approvedOrders = data.orders.filter(
              (order: any) =>
                order.payment_status === 'verified' ||
                !['payment_pending', 'payment_submitted'].includes(order.status)
            )
            setOrders(
              approvedOrders.map((order: any) => {
                const rawItems =
                  typeof order.items === 'string' ? JSON.parse(order.items) : order.items
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
                }
              })
            )
          }
        })
        .catch(() => {})
    }
  })

  const handleToggleStoreOnline = async () => {
    if (!restaurantId) return
    const nextStatus = !storeOnline
    const response = await fetch('/api/restaurants', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: restaurantId, is_open: nextStatus }),
    })
    if (!response.ok) {
      toast('Could not update store availability.', 'error')
      return
    }
    setStoreOnline(nextStatus)
  }

  const handleUpdateOrderStatus = async (
    orderId: string,
    nextStatus: 'packing' | 'ready' | 'picked_up'
  ) => {
    if (!restaurantId || pendingOrderStatusRef.current[orderId]) return
    pendingOrderStatusRef.current[orderId] = true

    try {
      const response = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: nextStatus }),
      })
      if (!response.ok) {
        toast('Could not update the order. Please try again.', 'error')
        return
      }
      setOrders((prev) =>
        prev.map((order) => (order.id === orderId ? { ...order, status: nextStatus } : order))
      )

      if (nextStatus === 'packing') toast(`Order #${orderId} assigned to picker!`, 'success')
      else if (nextStatus === 'ready') toast(`Order #${orderId} marked ready for rider!`, 'success')
      else if (nextStatus === 'picked_up')
        toast(`Order #${orderId} handed over to rider!`, 'success')
    } finally {
      pendingOrderStatusRef.current[orderId] = false
    }
  }

  const handleToggleItemPacked = async (orderId: string, itemIdx: number) => {
    if (!restaurantId) return
    const order = orders.find((entry) => entry.id === orderId)
    if (!order) return
    const updatedItems = order.items.map((item, index) =>
      index === itemIdx ? { ...item, packed: !item.packed } : item
    )
    const response = await fetch('/api/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, items: updatedItems }),
    })
    if (!response.ok) {
      toast('Could not update the packing checklist.', 'error')
      return
    }
    setOrders((prev) =>
      prev.map((entry) => (entry.id === orderId ? { ...entry, items: updatedItems } : entry))
    )
  }

  const openCameraScanner = (target: 'add_item' | 'packing' | 'inventory_search') => {
    setScannerTarget(target)
    setShowCameraScanner(true)
  }

  const handleCameraScanSuccess = (code: string) => {
    setShowCameraScanner(false)
    const cleanCode = code.trim().toUpperCase()

    if (scannerTarget === 'add_item') {
      setNewItemBarcode(cleanCode)
      toast(`Barcode Scanned: [${cleanCode}]`, 'success')
      setShowAddModal(true)
    } else if (scannerTarget === 'packing') {
      setBarcodeQuery(cleanCode)
      const updates = orders.flatMap((order) => {
        if (order.status !== 'packing' && order.status !== 'new') return []
        const itemIndex = order.items.findIndex(
          (item) =>
            item.skuCode.toUpperCase() === cleanCode || item.name.toUpperCase().includes(cleanCode)
        )
        if (itemIndex < 0) return []
        return [{ orderId: order.id, itemIndex }]
      })
      if (!updates.length) {
        toast(`Scanned [${cleanCode}], but no matching item found in active orders.`, 'error')
        return
      }
      for (const update of updates) handleToggleItemPacked(update.orderId, update.itemIndex)
      toast(`Scanned [${cleanCode}] & updated checklist!`, 'success')
    } else if (scannerTarget === 'inventory_search') {
      const match = inventory.find((item) => item.skuCode.toUpperCase() === cleanCode)
      if (match) {
        setSearchQuery(cleanCode)
        toast(`Found product "${match.name}" (Stock: ${match.stockCount})`, 'success')
      } else {
        setNewItemBarcode(cleanCode)
        setShowAddModal(true)
      }
    }
  }

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
      toast('That code was not found in an active order.', 'error')
      return
    }
    for (const update of updates) await handleToggleItemPacked(update.orderId, update.itemIndex)
    toast('Order checklist updated from the scanned code.', 'success')
    setBarcodeQuery('')
  }

  const handleToggleStock = async (itemId: string) => {
    if (!restaurantId) return
    const item = inventory.find((entry) => entry.id === itemId)
    if (!item) return
    const nextStock = !item.inStock
    const nextCount = nextStock ? Math.max(item.stockCount, 1) : 0

    const response = await fetch('/api/menu-items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: itemId, in_stock: nextStock, stock_count: nextCount }),
    })
    if (!response.ok) {
      toast('Could not update product availability.', 'error')
      return
    }
    setInventory((prev) =>
      prev.map((entry) =>
        entry.id === itemId ? { ...entry, inStock: nextStock, stockCount: nextCount } : entry
      )
    )
  }

  const handleAdjustStock = async (itemId: string, delta: number) => {
    if (!restaurantId) return
    const item = inventory.find((entry) => entry.id === itemId)
    if (!item) return
    const newCount = Math.max(0, item.stockCount + delta)

    const response = await fetch('/api/menu-items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: itemId, stock_count: newCount, in_stock: newCount > 0 }),
    })
    if (!response.ok) {
      toast('Could not update the stock count.', 'error')
      return
    }
    setInventory((prev) =>
      prev.map((entry) =>
        entry.id === itemId ? { ...entry, stockCount: newCount, inStock: newCount > 0 } : entry
      )
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f9f7] text-[#18201c] pb-24 selection:bg-[#d9f447] selection:text-[#18201c]">
      {/* Top Header */}
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
            <Link
              href={user?.role === 'admin' ? '/admin/dashboard' : '/vendor/dashboard'}
              className="flex items-center gap-1.5 rounded-2xl border border-[#dfe4dc] bg-[#f8f9f7] px-3.5 py-2.5 text-xs font-bold text-[#18201c] hover:bg-[#e2e7dc] transition shrink-0 cursor-pointer"
            >
              <ArrowLeft className="size-3.5 text-[#7e9619]" />
              <span>Dashboard</span>
            </Link>

            <button
              onClick={() => void handleToggleStoreOnline()}
              disabled={!restaurantId}
              className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-[10px] font-black border transition sm:flex-none sm:px-4 sm:text-xs cursor-pointer ${
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

            <button
              onClick={() => void logout()}
              title="Sign Out"
              className="flex items-center gap-1 rounded-2xl border border-[#dfe4dc] bg-white px-3 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-50 transition shrink-0 cursor-pointer"
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

        {/* KPI Metrics */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:mb-8 sm:gap-4 lg:grid-cols-4">
          <div className="relative overflow-hidden rounded-2xl border border-[#e2e7dc] bg-white p-3.5 shadow-xs sm:rounded-3xl sm:p-5">
            <div className="mb-2 flex items-center justify-between gap-2 text-[10px] text-[#627068] sm:text-xs">
              <span className="font-bold uppercase tracking-wider">Unfulfilled Queue</span>
              <Box className="size-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-[#18201c] sm:text-3xl">
              {orders.filter((o) => o.status === 'new' || o.status === 'packing').length}
            </p>
            <p className="mt-2 text-[9px] font-semibold text-emerald-700 sm:text-[11px]">
              {orders.length} orders loaded
            </p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-[#e2e7dc] bg-white p-3.5 shadow-xs sm:rounded-3xl sm:p-5">
            <div className="mb-2 flex items-center justify-between gap-2 text-[10px] text-[#627068] sm:text-xs">
              <span className="font-bold uppercase tracking-wider">Store Status</span>
              <Zap className="size-4 text-amber-600" />
            </div>
            <p className="text-2xl font-black text-amber-700 sm:text-3xl">
              {storeOnline ? 'Active' : 'Paused'}
            </p>
            <p className="mt-2 text-[9px] font-semibold text-[#5c6861] sm:text-[11px]">
              Real-time customer dispatch
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
            <p className="mt-2 text-[9px] font-semibold text-purple-700 sm:text-[11px]">
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
            <p className="mt-2 text-[9px] font-semibold text-amber-700 sm:text-[11px]">
              {inventory.filter((i) => i.inStock && i.stockCount <= 10).length} Low Stock SKUs
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="mb-5 border-b border-[#e2e7dc] pb-4 sm:mb-6">
          <div className="scrollbar-none flex w-full snap-x items-center gap-2 overflow-x-auto rounded-2xl bg-[#f0f3eb] p-1.5 text-xs font-bold">
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex min-h-11 shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 transition touch-manipulation cursor-pointer sm:px-4 ${
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
              className={`flex min-h-11 shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 transition touch-manipulation cursor-pointer sm:px-4 ${
                activeTab === 'inventory'
                  ? 'bg-white text-[#18201c] shadow-sm'
                  : 'text-[#627068] hover:text-[#18201c]'
              }`}
            >
              <Layers className="size-4 text-[#86a018]" />
              <span>Stock SKUs ({inventory.length})</span>
            </button>
          </div>
        </div>

        {/* Active Tab View */}
        {activeTab === 'orders' && (
          <StoreOrdersView
            orders={orders}
            barcodeQuery={barcodeQuery}
            setBarcodeQuery={setBarcodeQuery}
            orderFilter={orderFilter}
            setOrderFilter={setOrderFilter}
            onBarcodeSubmit={handleBarcodeScanSubmit}
            onOpenScanner={() => openCameraScanner('packing')}
            onToggleItemPacked={handleToggleItemPacked}
            onUpdateStatus={handleUpdateOrderStatus}
          />
        )}

        {activeTab === 'inventory' && (
          <StoreInventoryView
            inventory={inventory}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            stockFilter={stockFilter}
            setStockFilter={setStockFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onOpenScanner={() => openCameraScanner('inventory_search')}
            onOpenAddModal={() => setShowAddModal(true)}
            onToggleStock={handleToggleStock}
            onAdjustStock={handleAdjustStock}
          />
        )}
      </main>

      {/* Add SKU Modal */}
      <AddGrocerySkuModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        restaurantId={restaurantId}
        restaurantName={restaurantName}
        initialBarcode={newItemBarcode}
        onOpenScanner={() => openCameraScanner('add_item')}
        onItemAdded={(newItem) => setInventory((prev) => [newItem, ...prev])}
      />

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
