'use client'

import { Coupon, fetchCouponsFromSupabase } from '@/lib/coupons'
import { useToast } from '@/lib/toast-context'
import {
  Building2,
  Check,
  CheckCircle2,
  DollarSign,
  Edit3,
  Plus,
  Search,
  Sparkles,
  Store,
  Tag,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)

  // Form Fields
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('percentage')
  const [discountValue, setDiscountValue] = useState<number | ''>('')
  const [minOrderAmount, setMinOrderAmount] = useState<number | ''>('')
  const [maxDiscount, setMaxDiscount] = useState<number | ''>('')
  const [expiryDate, setExpiryDate] = useState('')
  const [usageLimit, setUsageLimit] = useState<number | ''>('')
  const [isActive, setIsActive] = useState(true)

  // Restaurants State for Applicable Restaurants Selection
  const [restaurantsList, setRestaurantsList] = useState<
    { id: string; name: string; address: string }[]
  >([])
  const [selectedRestaurantIds, setSelectedRestaurantIds] = useState<string[]>([])
  const [showRestaurantModal, setShowRestaurantModal] = useState(false)
  const [restaurantSearchQuery, setRestaurantSearchQuery] = useState('')

  const { toast } = useToast()

  useEffect(() => {
    async function load() {
      const data = await fetchCouponsFromSupabase()
      setCoupons(data)

      try {
        const res = await fetch('/api/restaurants')
        if (res.ok) {
          const json = await res.json()
          if (json.success && Array.isArray(json.restaurants)) {
            setRestaurantsList(
              json.restaurants.map((r: any) => ({
                id: r.id,
                name: r.name || 'Unnamed Kitchen',
                address: r.address || 'Bengaluru, India',
              }))
            )
          }
        }
      } catch (err) {
        console.warn('Failed to load restaurants for coupon form:', err)
      }
    }
    load()
  }, [])

  function showToast(msg: string) {
    const isError = /could not|failed|error|unable/i.test(msg)
    toast(msg, isError ? 'error' : 'success')
  }

  async function handleSaveCoupon(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim() || !discountValue || !minOrderAmount) return

    const formattedCode = code.trim().toUpperCase()
    const dVal = typeof discountValue === 'number' ? discountValue : parseFloat(discountValue)
    const mOrder = typeof minOrderAmount === 'number' ? minOrderAmount : parseFloat(minOrderAmount)
    const mMax =
      maxDiscount !== ''
        ? typeof maxDiscount === 'number'
          ? maxDiscount
          : parseFloat(maxDiscount)
        : undefined
    const uLimit =
      usageLimit !== ''
        ? typeof usageLimit === 'number'
          ? usageLimit
          : parseInt(usageLimit as any)
        : undefined

    const rIds = selectedRestaurantIds
    const primaryRestId = rIds.length === 1 ? rIds[0] : rIds.length > 0 ? rIds[0] : null

    let updated: Coupon[]
    if (editingCoupon) {
      const dbRecord = {
        code: formattedCode,
        description,
        discount_type: discountType,
        discount_value: dVal,
        min_order_amount: mOrder,
        max_discount: mMax || null,
        expiry_date: expiryDate || null,
        usage_limit: uLimit || null,
        is_active: isActive,
        restaurant_id: primaryRestId,
        restaurant_ids: rIds,
      }
      try {
        const res = await fetch('/api/admin/coupons', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingCoupon.id, ...dbRecord }),
        })
        if (!res.ok) throw new Error('API update failed')
      } catch (apiErr) {
        console.error('Failed to update coupon via API:', apiErr)
        showToast('Could not update the coupon in the database.')
        return
      }

      updated = coupons.map((c) =>
        c.id === editingCoupon.id
          ? {
              ...c,
              code: formattedCode,
              description,
              discountType,
              discountValue: dVal,
              minOrderAmount: mOrder,
              maxDiscount: mMax,
              expiryDate,
              usageLimit: uLimit,
              isActive,
              restaurantId: primaryRestId || undefined,
              restaurantIds: rIds,
            }
          : c
      )
      showToast(`Coupon '${formattedCode}' updated successfully!`)
    } else {
      const newId = crypto.randomUUID()
      const descStr =
        description ||
        `${discountType === 'percentage' ? `${dVal}% OFF` : `₹${dVal} OFF`} on orders above ₹${mOrder}`
      const dbRecord = {
        id: newId,
        code: formattedCode,
        description: descStr,
        discount_type: discountType,
        discount_value: dVal,
        min_order_amount: mOrder,
        max_discount: mMax || null,
        usage_limit: uLimit || null,
        used_count: 0,
        is_active: true,
        expiry_date: expiryDate || null,
        restaurant_id: primaryRestId,
        restaurant_ids: rIds,
      }

      try {
        const res = await fetch('/api/admin/coupons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dbRecord),
        })
        if (!res.ok) throw new Error('API insert failed')
      } catch (apiErr) {
        console.error('Failed to insert coupon via API:', apiErr)
        showToast('Could not create the coupon in the database.')
        return
      }

      const newCoupon: Coupon = {
        id: newId,
        code: formattedCode,
        description: descStr,
        discountType,
        discountValue: dVal,
        minOrderAmount: mOrder,
        maxDiscount: mMax,
        expiryDate,
        usageLimit: uLimit,
        usedCount: 0,
        isActive: true,
        restaurantId: primaryRestId || undefined,
        restaurantIds: rIds,
      }
      updated = [newCoupon, ...coupons]
      showToast(`New Coupon '${formattedCode}' created and published!`)
    }

    setCoupons(await fetchCouponsFromSupabase())
    closeModal()
  }

  async function toggleCouponActive(id: string) {
    const item = coupons.find((c) => c.id === id)
    if (!item) return
    const newStatus = !item.isActive
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: newStatus }),
      })
      if (!res.ok) throw new Error('API toggle failed')
    } catch (apiErr) {
      console.error('Failed to toggle coupon status:', apiErr)
      showToast('Could not update coupon status.')
      return
    }
    setCoupons(await fetchCouponsFromSupabase())
    showToast(`Coupon '${item.code}' status toggled to ${newStatus ? 'Active' : 'Inactive'}.`)
  }

  async function deleteCoupon(id: string) {
    const item = coupons.find((c) => c.id === id)
    if (!confirm(`Are you sure you want to delete coupon '${item?.code}'?`)) return
    try {
      const res = await fetch(`/api/admin/coupons?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('API delete failed')
    } catch (apiErr) {
      console.error('Failed to delete coupon:', apiErr)
      showToast('Could not delete coupon.')
      return
    }
    setCoupons(await fetchCouponsFromSupabase())
    showToast(`Coupon '${item?.code}' deleted successfully.`)
  }

  function openCreateModal() {
    setEditingCoupon(null)
    setCode('')
    setDescription('')
    setDiscountType('percentage')
    setDiscountValue('')
    setMinOrderAmount('')
    setMaxDiscount('')
    setExpiryDate('')
    setUsageLimit('')
    setIsActive(true)
    setSelectedRestaurantIds([])
    setShowModal(true)
  }

  function openEditModal(c: Coupon) {
    setEditingCoupon(c)
    setCode(c.code)
    setDescription(c.description)
    setDiscountType(c.discountType)
    setDiscountValue(c.discountValue)
    setMinOrderAmount(c.minOrderAmount)
    setMaxDiscount(c.maxDiscount !== undefined ? c.maxDiscount : '')
    setExpiryDate(c.expiryDate)
    setUsageLimit(c.usageLimit !== undefined ? c.usageLimit : '')
    setIsActive(c.isActive)
    setSelectedRestaurantIds(
      c.restaurantIds && c.restaurantIds.length > 0
        ? c.restaurantIds
        : c.restaurantId
          ? [c.restaurantId]
          : []
    )
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingCoupon(null)
    setShowRestaurantModal(false)
  }

  // Filtered List
  const filteredCoupons = coupons.filter((c) => {
    const matchesQuery =
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus =
      statusFilter === 'all' ? true : statusFilter === 'active' ? c.isActive : !c.isActive
    return matchesQuery && matchesStatus
  })

  // Metrics
  const activeCount = coupons.filter((c) => c.isActive).length
  const totalRedemptions = coupons.reduce((sum, c) => sum + c.usedCount, 0)
  const totalDiscountGiven = coupons.reduce(
    (sum, c) => sum + c.usedCount * (c.discountType === 'flat' ? c.discountValue : 85),
    0
  )

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-[#e1e6df] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-purple-100 dark:bg-purple-950/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-900 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50">
              Admin Promotional Engine
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Global Customer Discount Codes
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#18201c] dark:text-white">
            Coupons &amp; Discounts Manager
          </h1>
          <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
            Create, edit, deactivate, and monitor performance of platform promo codes.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 rounded-2xl bg-[#121815] dark:bg-[#86a018] px-5 py-3 text-xs font-bold text-white dark:text-[#121815] shadow-md hover:bg-[#232f29] dark:hover:bg-[#97b51b] transition active:scale-95"
        >
          <Plus className="size-4 text-[#d9f447] dark:text-[#121815]" /> Create New Coupon
        </button>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-3xl border border-[#e1e6df] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Total Promo Codes
            </p>
            <Tag className="size-4 text-purple-600 dark:text-purple-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-[#18201c] dark:text-white">{coupons.length}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {activeCount} currently active
          </p>
        </div>

        <div className="rounded-3xl border border-[#e1e6df] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Active Coupons
            </p>
            <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-emerald-700 dark:text-emerald-400">
            {activeCount}
          </p>
          <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            Ready in Customer Checkout
          </p>
        </div>

        <div className="rounded-3xl border border-[#e1e6df] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Total Redemptions
            </p>
            <TrendingUp className="size-4 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-blue-700 dark:text-blue-400">
            {totalRedemptions.toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Orders processed with discounts
          </p>
        </div>

        <div className="rounded-3xl border border-[#e1e6df] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Total Discount Savings
            </p>
            <DollarSign className="size-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-amber-700 dark:text-amber-400">
            ₹{totalDiscountGiven.toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Customer savings delivered
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-[#e1e6df] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-4 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-2.5 size-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search coupon by code or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-gray-200 dark:border-[#27342d] bg-white dark:bg-[#121815] py-2 pl-10 pr-4 text-xs font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-[#86a018]"
          />
        </div>

        <div className="flex items-center gap-1.5 rounded-2xl bg-gray-100 dark:bg-[#121815] p-1 text-xs font-bold">
          {(['all', 'active', 'inactive'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-xl px-4 py-1.5 capitalize transition ${
                statusFilter === st
                  ? 'bg-[#121815] text-white dark:bg-[#86a018] dark:text-[#121815] shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Coupons Table View (hidden md:block) */}
      <div className="hidden md:block rounded-3xl border border-[#e1e6df] dark:border-[#27342d] bg-white dark:bg-[#18201c] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-[#27342d] bg-gray-50/70 dark:bg-[#121815] text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-4">Coupon Code</th>
                <th className="py-3.5 px-4">Offer Description</th>
                <th className="py-3.5 px-4">Applicable Stores</th>
                <th className="py-3.5 px-4">Discount Type &amp; Value</th>
                <th className="py-3.5 px-4">Min Order / Max Cap</th>
                <th className="py-3.5 px-4">Expiry Date</th>
                <th className="py-3.5 px-4">Redemptions</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#27342d] font-medium">
              {filteredCoupons.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-gray-50/60 dark:hover:bg-[#202923]/60 transition"
                >
                  <td className="py-4 px-4 font-bold text-sm">
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 px-3 py-1 text-purple-900 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 font-mono tracking-wider">
                      <Tag className="size-3.5 text-purple-600 dark:text-purple-400" />
                      {c.code}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-gray-700 dark:text-gray-300 max-w-xs">
                    {c.description}
                  </td>
                  <td className="py-4 px-4">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-purple-900 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-xl border border-purple-200 dark:border-purple-800/50">
                      <Store className="size-3.5 text-purple-600 dark:text-purple-400" />
                      {!c.restaurantIds || c.restaurantIds.length === 0
                        ? 'All Stores'
                        : c.restaurantIds.length === 1
                          ? restaurantsList.find((r) => r.id === c.restaurantIds![0])?.name ||
                            '1 Store'
                          : `${c.restaurantIds.length} Stores`}
                    </span>
                  </td>
                  <td className="py-4 px-4 font-bold text-[#18201c] dark:text-white">
                    {c.discountType === 'percentage' ? (
                      <span className="text-purple-700 dark:text-purple-400">
                        {c.discountValue}% OFF
                      </span>
                    ) : (
                      <span className="text-emerald-700 dark:text-emerald-400">
                        Flat ₹{c.discountValue} OFF
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-gray-600 dark:text-gray-400">
                    <div>
                      Min Order:{' '}
                      <strong className="text-[#18201c] dark:text-white">
                        ₹{c.minOrderAmount}
                      </strong>
                    </div>
                    {c.maxDiscount && (
                      <div className="text-[11px] text-gray-500 dark:text-gray-400">
                        Cap: ₹{c.maxDiscount}
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-4 text-gray-600 dark:text-gray-300 font-mono">
                    {c.expiryDate}
                  </td>
                  <td className="py-4 px-4">
                    <span className="font-bold text-[#18201c] dark:text-white">{c.usedCount}</span>
                    {c.usageLimit && <span className="text-gray-400"> / {c.usageLimit}</span>}
                  </td>
                  <td className="py-4 px-4">
                    <button
                      onClick={() => toggleCouponActive(c.id)}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold transition ${
                        c.isActive
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200'
                          : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 hover:bg-rose-200'
                      }`}
                    >
                      {c.isActive ? <Check className="size-3" /> : <X className="size-3" />}
                      {c.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditModal(c)}
                        className="grid size-8 place-items-center rounded-xl bg-gray-100 dark:bg-[#121815] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#202923] transition"
                        title="Edit Coupon"
                      >
                        <Edit3 className="size-3.5" />
                      </button>
                      <button
                        onClick={() => deleteCoupon(c.id)}
                        className="grid size-8 place-items-center rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition"
                        title="Delete Coupon"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCoupons.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="py-12 text-center text-xs text-gray-500 dark:text-gray-400"
                  >
                    No coupons found matching your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Coupon Cards View (block md:hidden) */}
      <div className="block md:hidden flex flex-col gap-4">
        {filteredCoupons.map((c) => (
          <div
            key={c.id}
            className="rounded-3xl border border-[#e1e6df] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-5 shadow-sm flex flex-col gap-3"
          >
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#27342d] pb-3">
              <span className="rounded-xl bg-purple-50 dark:bg-purple-950/40 px-3 py-1 text-xs font-bold text-purple-900 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 font-mono flex items-center gap-1.5">
                <Tag className="size-3.5 text-purple-700 dark:text-purple-400" />
                {c.code}
              </span>
              <button
                onClick={() => toggleCouponActive(c.id)}
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                  c.isActive
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                }`}
              >
                {c.isActive ? 'Active' : 'Inactive'}
              </button>
            </div>

            <p className="text-xs font-bold text-[#18201c] dark:text-white">{c.description}</p>

            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-900 dark:text-purple-300 bg-purple-50/80 dark:bg-purple-950/40 px-2.5 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800/50">
              <Store className="size-3.5 text-purple-600 dark:text-purple-400" />
              <span>
                {!c.restaurantIds || c.restaurantIds.length === 0
                  ? 'Applicable to All Restaurants'
                  : c.restaurantIds.length === 1
                    ? `Store: ${
                        restaurantsList.find((r) => r.id === c.restaurantIds![0])?.name || '1 Store'
                      }`
                    : `Applicable to ${c.restaurantIds.length} Stores`}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-gray-50 dark:bg-[#121815] p-3 text-xs border border-transparent dark:border-[#27342d]">
              <div>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase">
                  Discount
                </span>
                <p className="font-bold text-[#18201c] dark:text-white">
                  {c.discountType === 'percentage'
                    ? `${c.discountValue}% OFF`
                    : `Flat ₹${c.discountValue} OFF`}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase">
                  Min Order
                </span>
                <p className="font-bold text-[#18201c] dark:text-white">₹{c.minOrderAmount}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 text-xs border-t border-gray-100 dark:border-[#27342d]">
              <span className="text-gray-500 dark:text-gray-400">Used {c.usedCount} times</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditModal(c)}
                  className="rounded-xl bg-gray-100 dark:bg-[#121815] px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 border border-transparent dark:border-[#27342d]"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteCoupon(c.id)}
                  className="rounded-xl bg-rose-50 dark:bg-rose-950/40 px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 border border-transparent dark:border-rose-900/50"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Coupon Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#18201c] text-[#18201c] dark:text-white p-6 shadow-2xl border border-transparent dark:border-[#27342d]">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#27342d] pb-3">
              <h3 className="text-lg font-bold text-[#18201c] dark:text-white">
                {editingCoupon ? 'Edit Coupon Code' : 'Create New Promo Coupon'}
              </h3>
              <button
                onClick={closeModal}
                className="grid size-8 place-items-center rounded-full bg-gray-100 dark:bg-[#121815] text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCoupon} className="mt-4 flex flex-col gap-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#18201c] dark:text-white">Coupon Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SUMMER50"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2.5 font-mono uppercase font-bold outline-none focus:border-[#86a018] placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#18201c] dark:text-white">Discount Type</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2.5 font-bold outline-none"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#18201c] dark:text-white">
                  Description / Display Subtitle
                </label>
                <input
                  type="text"
                  placeholder="e.g. 50% OFF up to ₹120 on orders above ₹199"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2.5 font-medium outline-none focus:border-[#86a018] placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-[#18201c] dark:text-white">
                    {discountType === 'percentage' ? 'Discount % *' : 'Flat Amount (₹) *'}
                  </label>
                  <input
                    type="number"
                    required
                    placeholder={discountType === 'percentage' ? '50' : '100'}
                    value={discountValue}
                    onChange={(e) =>
                      setDiscountValue(e.target.value === '' ? '' : parseFloat(e.target.value))
                    }
                    className="mt-1 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2.5 font-bold outline-none focus:border-[#86a018] placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#18201c] dark:text-white">
                    Min Order (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="199"
                    value={minOrderAmount}
                    onChange={(e) =>
                      setMinOrderAmount(e.target.value === '' ? '' : parseFloat(e.target.value))
                    }
                    className="mt-1 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2.5 font-bold outline-none focus:border-[#86a018] placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#18201c] dark:text-white">Max Cap (₹)</label>
                  <input
                    type="number"
                    placeholder="120"
                    value={maxDiscount}
                    onChange={(e) =>
                      setMaxDiscount(e.target.value === '' ? '' : parseFloat(e.target.value))
                    }
                    className="mt-1 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2.5 font-medium outline-none focus:border-[#86a018] placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#18201c] dark:text-white">Expiry Date</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2.5 font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#18201c] dark:text-white">
                    Usage Limit (Optional)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 500"
                    value={usageLimit}
                    onChange={(e) =>
                      setUsageLimit(e.target.value === '' ? '' : parseInt(e.target.value))
                    }
                    className="mt-1 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2.5 font-medium outline-none placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
              </div>

              {/* Applicable Restaurants Section */}
              <div className="rounded-2xl border border-gray-200 dark:border-[#27342d] bg-gray-50/80 dark:bg-[#121815] p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-bold text-[#18201c] dark:text-white flex items-center gap-1.5">
                      <Store className="size-4 text-purple-600 dark:text-purple-400" /> Applicable
                      Restaurants
                    </label>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Restrict to specific restaurants or allow platform-wide
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRestaurantModal(true)}
                    className="flex items-center gap-1.5 rounded-xl bg-[#121815] dark:bg-[#86a018] px-3 py-1.5 text-[11px] font-bold text-white dark:text-[#121815] hover:bg-[#232f29] dark:hover:bg-[#97b41e] transition active:scale-95 shadow-sm"
                  >
                    <Building2 className="size-3.5 text-[#d9f447] dark:text-[#121815]" /> Select
                    Restaurants
                  </button>
                </div>

                <div className="pt-1">
                  {selectedRestaurantIds.length === 0 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-3 py-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50">
                      <Sparkles className="size-3 text-emerald-600 dark:text-emerald-400" />{' '}
                      Platform-Wide (All Restaurants Allowed)
                    </span>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-purple-900 dark:text-purple-300">
                          {selectedRestaurantIds.length} Restaurant(s) Selected:
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedRestaurantIds([])}
                          className="text-[10px] text-rose-600 dark:text-rose-400 font-bold hover:underline"
                        >
                          Clear Selection (Allow All)
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pr-1">
                        {selectedRestaurantIds.map((rId) => {
                          const rest = restaurantsList.find((r) => r.id === rId)
                          return (
                            <span
                              key={rId}
                              className="inline-flex items-center gap-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 text-[10px] font-bold text-purple-900 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50"
                            >
                              {rest?.name || rId}
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedRestaurantIds((prev) =>
                                    prev.filter((id) => id !== rId)
                                  )
                                }
                                className="text-purple-500 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-200"
                              >
                                <X className="size-3" />
                              </button>
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-[#121815] p-3 border border-transparent dark:border-[#27342d]">
                <div>
                  <p className="font-bold text-[#18201c] dark:text-white">Active Status</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Customers can use this coupon immediately in cart
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="size-5 accent-[#86a018] cursor-pointer"
                />
              </div>

              <button
                type="submit"
                className="mt-2 w-full rounded-full bg-[#121815] dark:bg-[#86a018] py-3 font-bold text-white dark:text-[#121815] shadow-md hover:bg-[#232f29] dark:hover:bg-[#97b41e] transition"
              >
                {editingCoupon ? 'Save Coupon Changes' : 'Publish Coupon'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Restaurant Selection Popup Modal */}
      {showRestaurantModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#18201c] text-[#18201c] dark:text-white p-6 shadow-2xl border border-transparent dark:border-[#27342d] flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#27342d] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#18201c] dark:text-white flex items-center gap-2">
                  <Store className="size-5 text-purple-600 dark:text-purple-400" /> Select
                  Applicable Restaurants
                </h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  Choose restaurants where customers can redeem this coupon
                </p>
              </div>
              <button
                onClick={() => setShowRestaurantModal(false)}
                className="grid size-8 place-items-center rounded-full bg-gray-100 dark:bg-[#121815] text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative mt-4">
              <Search className="absolute left-3 top-3 size-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search restaurant by name or address..."
                value={restaurantSearchQuery}
                onChange={(e) => setRestaurantSearchQuery(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 dark:border-[#27342d] bg-gray-50/80 dark:bg-[#121815] py-2.5 pl-9 pr-4 text-xs font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-[#86a018]"
              />
            </div>

            {/* Quick Actions & Selection Counter */}
            <div className="mt-3 flex items-center justify-between text-xs border-b border-gray-100 dark:border-[#27342d] pb-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRestaurantIds(restaurantsList.map((r) => r.id))}
                  className="rounded-lg bg-gray-100 dark:bg-[#121815] px-2.5 py-1 text-[11px] font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 border border-transparent dark:border-[#27342d]"
                >
                  Select All ({restaurantsList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRestaurantIds([])}
                  className="rounded-lg bg-gray-100 dark:bg-[#121815] px-2.5 py-1 text-[11px] font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 border border-transparent dark:border-[#27342d]"
                >
                  Deselect All
                </button>
              </div>
              <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-full border border-purple-200 dark:border-purple-800/50">
                {selectedRestaurantIds.length} Selected
              </span>
            </div>

            {/* Scrollable Restaurant List */}
            <div className="mt-3 flex-1 overflow-y-auto space-y-2 pr-1 max-h-72">
              {restaurantsList.filter(
                (r) =>
                  r.name.toLowerCase().includes(restaurantSearchQuery.toLowerCase()) ||
                  r.address.toLowerCase().includes(restaurantSearchQuery.toLowerCase())
              ).length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400 font-medium">
                  No restaurants match "{restaurantSearchQuery}"
                </div>
              ) : (
                restaurantsList
                  .filter(
                    (r) =>
                      r.name.toLowerCase().includes(restaurantSearchQuery.toLowerCase()) ||
                      r.address.toLowerCase().includes(restaurantSearchQuery.toLowerCase())
                  )
                  .map((rest) => {
                    const isChecked = selectedRestaurantIds.includes(rest.id)
                    return (
                      <label
                        key={rest.id}
                        className={`flex items-start gap-3 rounded-2xl p-3 border transition cursor-pointer ${
                          isChecked
                            ? 'border-purple-300 dark:border-purple-800/50 bg-purple-50/40 dark:bg-purple-950/40 shadow-sm'
                            : 'border-gray-200 dark:border-[#27342d] hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-[#121815]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRestaurantIds((prev) => [...prev, rest.id])
                            } else {
                              setSelectedRestaurantIds((prev) =>
                                prev.filter((id) => id !== rest.id)
                              )
                            }
                          }}
                          className="mt-0.5 size-4 accent-purple-700 cursor-pointer rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-[#18201c] dark:text-white truncate">
                            {rest.name}
                          </p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                            📍 {rest.address}
                          </p>
                        </div>
                      </label>
                    )
                  })
              )}
            </div>

            {/* Modal Footer */}
            <div className="mt-4 border-t border-gray-100 dark:border-[#27342d] pt-3">
              <button
                type="button"
                onClick={() => setShowRestaurantModal(false)}
                className="w-full rounded-full bg-[#121815] dark:bg-[#86a018] py-2.5 text-xs font-bold text-white dark:text-[#121815] shadow-md hover:bg-[#232f29] dark:hover:bg-[#97b41e] transition"
              >
                Confirm &amp; Apply Selection ({selectedRestaurantIds.length} Selected)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
