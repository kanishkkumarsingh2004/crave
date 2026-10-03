'use client'

import { useAuth } from '@/lib/auth-context'
import { Coupon, fetchCouponsFromSupabase } from '@/lib/coupons'
import { supabase } from '@/lib/supabase'
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChefHat,
  Copy,
  Edit3,
  LogOut,
  Plus,
  Search,
  Settings,
  Sparkles,
  Store,
  Tag,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'

export default function VendorCouponsPage() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(true)
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

  // Notification Toast
  const [toastMsg, setToastMsg] = useState('')

  useEffect(() => {
    if (!user?.id) {
      setCoupons([])
      setRestaurantId(null)
      setIsLoadingCoupons(false)
      return
    }

    const loadStoreCoupons = async () => {
      setIsLoadingCoupons(true)
      const { data: restaurant, error } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle()
      if (error || !restaurant) {
        setRestaurantId(null)
        setCoupons([])
        setIsLoadingCoupons(false)
        return
      }
      setRestaurantId(restaurant.id)
      setCoupons(await fetchCouponsFromSupabase(restaurant.id))
      setIsLoadingCoupons(false)
    }

    loadStoreCoupons()
  }, [user?.id])

  function showToast(msg: string) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 3000)
  }

  function handleCopyCode(cCode: string) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(cCode)
      showToast(`Copied code '${cCode}' to clipboard!`)
    }
  }

  async function handleSaveCoupon(e: React.FormEvent) {
    e.preventDefault()
    if (!restaurantId || !code.trim() || discountValue === '' || minOrderAmount === '') return

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

    const dbRecord = {
      restaurant_id: restaurantId,
      code: formattedCode,
      description: description.trim(),
      discount_type: discountType,
      discount_value: dVal,
      min_order_amount: mOrder,
      max_discount: mMax ?? null,
      expiry_date: expiryDate || null,
      usage_limit: uLimit ?? null,
      is_active: isActive,
    }

    const result = editingCoupon
      ? await supabase
          .from('coupons')
          .update(dbRecord)
          .eq('id', editingCoupon.id)
          .eq('restaurant_id', restaurantId)
      : await supabase
          .from('coupons')
          .insert([{ id: crypto.randomUUID(), ...dbRecord, used_count: 0 }])

    if (result.error) {
      showToast('Could not save the coupon to the database.')
      return
    }

    setCoupons(await fetchCouponsFromSupabase(restaurantId))
    showToast(
      editingCoupon ? `Coupon '${formattedCode}' updated.` : `Coupon '${formattedCode}' created.`
    )
    closeModal()
  }

  async function toggleCouponActive(id: string) {
    if (!restaurantId) return
    const item = coupons.find((c) => c.id === id)
    if (!item) return
    const { error } = await supabase
      .from('coupons')
      .update({ is_active: !item.isActive })
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
    if (error) {
      showToast('Could not update coupon status.')
      return
    }
    setCoupons(await fetchCouponsFromSupabase(restaurantId))
    showToast(`Coupon '${item.code}' status updated.`)
  }

  async function deleteCoupon(id: string) {
    if (!restaurantId) return
    const item = coupons.find((c) => c.id === id)
    if (!confirm(`Are you sure you want to delete promo code '${item?.code}'?`)) return
    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
    if (error) {
      showToast('Could not delete coupon.')
      return
    }
    setCoupons(await fetchCouponsFromSupabase(restaurantId))
    showToast(`Coupon '${item?.code}' deleted.`)
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
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingCoupon(null)
  }

  const filteredCoupons = coupons.filter((c) => {
    const matchesQuery =
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus =
      statusFilter === 'all' ? true : statusFilter === 'active' ? c.isActive : !c.isActive
    return matchesQuery && matchesStatus
  })

  const activeCount = coupons.filter((c) => c.isActive).length
  const totalRedemptions = coupons.reduce((sum, c) => sum + c.usedCount, 0)
  return (
    <div className="min-h-screen bg-[#f8f9f7] text-[#18201c] flex flex-col justify-between">
      {/* Top Vendor Header Navigation Bar */}
      <div className="sticky top-0 z-30 border-b border-[#eaefe5] bg-white/95 backdrop-blur-md px-4 py-3.5 sm:px-8 shadow-xs">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between sm:justify-start gap-3 min-w-0">
            <Link
              href="/"
              className="font-black text-2xl sm:text-3xl tracking-tighter text-[#18201c] shrink-0"
            >
              crave<span className="text-[#86a018]">.</span>
            </Link>
            <span className="rounded-full bg-[#18201c] px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-[#d9f447]">
              VENDOR
            </span>

            <div className="hidden sm:block h-6 w-px bg-gray-200 mx-1 shrink-0" />

            <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-[#18201c] truncate">
              <Store className="size-4 text-[#86a018] shrink-0" />
              <span className="truncate max-w-[200px]">
                {user?.restaurantName || 'Your restaurant'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar text-xs font-bold">
            <Link
              href="/vendor/dashboard"
              className="rounded-2xl bg-white text-gray-700 border border-gray-200 px-4 py-2 transition shrink-0 hover:bg-gray-50 flex items-center gap-1.5"
            >
              <ArrowLeft className="size-3.5" />
              <span>Kitchen Orders</span>
            </Link>
            <Link
              href="/vendor/menu"
              className="rounded-2xl bg-white text-gray-700 border border-gray-200 px-4 py-2 transition shrink-0 hover:bg-gray-50"
            >
              Menu Management
            </Link>
            <Link
              href="/vendor/sales"
              className="rounded-2xl bg-white text-gray-700 border border-gray-200 px-4 py-2 transition shrink-0 hover:bg-gray-50"
            >
              Sales &amp; Earnings
            </Link>
            <button
              onClick={() => router.push('/vendor/coupons')}
              className="rounded-2xl bg-[#18201c] text-white px-4 py-2 transition shrink-0 shadow-xs"
            >
              Store Offers
            </button>
            <Link
              href="/vendor/settings"
              className="rounded-2xl bg-white text-gray-700 border border-gray-200 px-4 py-2 transition shrink-0 hover:bg-gray-50 flex items-center gap-1.5"
            >
              <Settings className="size-3.5 text-gray-600" />
              <span>Bank &amp; Settings</span>
            </Link>
            <button
              onClick={() => logout && logout()}
              className="rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 px-3.5 py-2 transition shrink-0 hover:bg-rose-100 flex items-center gap-1"
              title="Sign Out"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1240px] px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Toast Notification */}
        {toastMsg && (
          <div className="fixed top-20 right-5 z-50 flex items-center gap-2.5 rounded-2xl bg-[#18201c] px-4 py-3 text-xs font-bold text-white shadow-2xl border border-white/20 animate-in fade-in slide-in-from-top-4 duration-300">
            <Sparkles className="size-4 text-[#d9f447]" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Header Card */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-100 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900 border border-amber-200">
                <ChefHat className="inline size-3 mr-1" /> Kitchen Promotions
              </span>
              <span className="text-xs text-gray-500">{user?.restaurantName || 'Your store'}</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#18201c]">
              Store Coupons &amp; Discount Offers
            </h1>
            <p className="mt-1 text-xs text-gray-600">
              Issue discount codes to attract customers, increase cart size, and boost repeat
              orders.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/vendor/dashboard"
              className="rounded-2xl border border-[#dfe4dc] bg-white px-4 py-2.5 text-xs font-bold text-[#18201c] hover:bg-[#f3f6ee] transition"
            >
              Back to Console
            </Link>
            <button
              onClick={openCreateModal}
              className="flex items-center justify-center gap-2 rounded-2xl bg-[#18201c] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#323d36] transition active:scale-95"
            >
              <Plus className="size-4 text-[#d9f447]" /> Create Kitchen Coupon
            </button>
          </div>
        </div>

        {/* KPI Metrics */}
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-3xl border border-[#dfe4dc] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Total Store Codes
              </p>
              <Tag className="size-4 text-amber-600" />
            </div>
            <p className="mt-2 text-3xl font-bold text-[#18201c]">{coupons.length}</p>
            <p className="mt-1 text-xs text-gray-500">{activeCount} active in app</p>
          </div>

          <div className="rounded-3xl border border-[#dfe4dc] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Active Promos
              </p>
              <CheckCircle2 className="size-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-3xl font-bold text-emerald-700">{activeCount}</p>
            <p className="mt-1 text-xs text-emerald-600 font-semibold">Live in Customer Menu</p>
          </div>

          <div className="rounded-3xl border border-[#dfe4dc] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Total Redemptions
              </p>
              <TrendingUp className="size-4 text-blue-600" />
            </div>
            <p className="mt-2 text-3xl font-bold text-blue-700">
              {totalRedemptions.toLocaleString('en-IN')}
            </p>
            <p className="mt-1 text-xs text-gray-500">Discounts claimed by customers</p>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-[#dfe4dc] bg-white p-4 shadow-sm">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-2.5 size-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search promo code or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 py-2 pl-10 pr-4 text-xs font-medium outline-none focus:border-[#18201c]"
            />
          </div>

          <div className="flex items-center gap-1.5 rounded-2xl bg-gray-100 p-1 text-xs font-bold">
            {(['all', 'active', 'inactive'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded-xl px-4 py-1.5 capitalize transition ${
                  statusFilter === st
                    ? 'bg-[#18201c] text-white shadow-sm'
                    : 'text-gray-600 hover:text-black'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Coupons Table View */}
        <div className="hidden md:block rounded-3xl border border-[#dfe4dc] bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/70 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">Coupon Code</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4">Discount</th>
                  <th className="py-3.5 px-4">Min Order / Cap</th>
                  <th className="py-3.5 px-4">Expiry</th>
                  <th className="py-3.5 px-4">Redemptions</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filteredCoupons.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/60 transition">
                    <td className="py-4 px-4 font-bold text-sm">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-1 text-amber-950 border border-amber-200 font-mono tracking-wider">
                          <Tag className="size-3.5 text-amber-600" />
                          {c.code}
                        </span>
                        <button
                          onClick={() => handleCopyCode(c.code)}
                          className="text-gray-400 hover:text-black transition"
                          title="Copy Code"
                        >
                          <Copy className="size-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-700 max-w-xs">{c.description}</td>
                    <td className="py-4 px-4 font-bold text-[#18201c]">
                      {c.discountType === 'percentage' ? (
                        <span className="text-amber-800">{c.discountValue}% OFF</span>
                      ) : (
                        <span className="text-emerald-800">Flat ₹{c.discountValue} OFF</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-gray-600">
                      <div>
                        Min Order: <strong className="text-[#18201c]">₹{c.minOrderAmount}</strong>
                      </div>
                      {c.maxDiscount && (
                        <div className="text-[11px] text-gray-500">Cap: ₹{c.maxDiscount}</div>
                      )}
                    </td>
                    <td className="py-4 px-4 text-gray-600 font-mono">{c.expiryDate}</td>
                    <td className="py-4 px-4">
                      <span className="font-bold text-[#18201c]">{c.usedCount}</span>
                      {c.usageLimit && <span className="text-gray-400"> / {c.usageLimit}</span>}
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => toggleCouponActive(c.id)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold transition ${
                          c.isActive
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
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
                          className="grid size-8 place-items-center rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                          title="Edit Coupon"
                        >
                          <Edit3 className="size-3.5" />
                        </button>
                        <button
                          onClick={() => deleteCoupon(c.id)}
                          className="grid size-8 place-items-center rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
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
                    <td colSpan={8} className="py-12 text-center text-xs text-gray-500">
                      No promo codes found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="block md:hidden flex flex-col gap-4">
          {filteredCoupons.map((c) => (
            <div
              key={c.id}
              className="rounded-3xl border border-[#dfe4dc] bg-white p-5 shadow-sm flex flex-col gap-3"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <span className="rounded-xl bg-amber-50 px-3 py-1 text-xs font-bold text-amber-950 border border-amber-200 font-mono">
                  🏷️ {c.code}
                </span>
                <button
                  onClick={() => toggleCouponActive(c.id)}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                    c.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {c.isActive ? 'Active' : 'Inactive'}
                </button>
              </div>

              <p className="text-xs font-bold text-[#18201c]">{c.description}</p>

              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-gray-50 p-3 text-xs">
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase">Discount</span>
                  <p className="font-bold text-[#18201c]">
                    {c.discountType === 'percentage'
                      ? `${c.discountValue}% OFF`
                      : `Flat ₹${c.discountValue} OFF`}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase">Min Order</span>
                  <p className="font-bold text-[#18201c]">₹{c.minOrderAmount}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 text-xs border-t border-gray-100">
                <span className="text-gray-500">Used {c.usedCount} times</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(c)}
                    className="rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteCoupon(c.id)}
                    className="rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Create/Edit Coupon Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18201c]/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-lg font-bold text-[#18201c]">
                  {editingCoupon ? 'Edit Store Coupon' : 'Create Store Promo Code'}
                </h3>
                <button
                  onClick={closeModal}
                  className="grid size-8 place-items-center rounded-full bg-gray-100 hover:bg-gray-200"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={handleSaveCoupon} className="mt-4 flex flex-col gap-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-[#18201c]">Coupon Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. GREENTABLE20"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-gray-300 p-2.5 font-mono uppercase font-bold outline-none focus:border-[#18201c]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#18201c]">Discount Type</label>
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as any)}
                      className="mt-1 w-full rounded-xl border border-gray-300 p-2.5 font-bold outline-none bg-white"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="flat">Flat Amount (₹)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-[#18201c]">Offer Description</label>
                  <input
                    type="text"
                    placeholder="e.g. 20% OFF on all organic salad bowls"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 p-2.5 font-medium outline-none focus:border-[#18201c]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-[#18201c]">
                      {discountType === 'percentage' ? 'Discount % *' : 'Flat Amount (₹) *'}
                    </label>
                    <input
                      type="number"
                      required
                      placeholder={discountType === 'percentage' ? '20' : '50'}
                      value={discountValue}
                      onChange={(e) =>
                        setDiscountValue(e.target.value === '' ? '' : parseFloat(e.target.value))
                      }
                      className="mt-1 w-full rounded-xl border border-gray-300 p-2.5 font-bold outline-none focus:border-[#18201c]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#18201c]">Min Order (₹) *</label>
                    <input
                      type="number"
                      required
                      placeholder="199"
                      value={minOrderAmount}
                      onChange={(e) =>
                        setMinOrderAmount(e.target.value === '' ? '' : parseFloat(e.target.value))
                      }
                      className="mt-1 w-full rounded-xl border border-gray-300 p-2.5 font-bold outline-none focus:border-[#18201c]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#18201c]">Max Cap (₹)</label>
                    <input
                      type="number"
                      placeholder="120"
                      value={maxDiscount}
                      onChange={(e) =>
                        setMaxDiscount(e.target.value === '' ? '' : parseFloat(e.target.value))
                      }
                      className="mt-1 w-full rounded-xl border border-gray-300 p-2.5 font-medium outline-none focus:border-[#18201c]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-[#18201c]">Expiry Date</label>
                    <input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-gray-300 p-2.5 font-mono outline-none bg-white"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#18201c]">Usage Limit</label>
                    <input
                      type="number"
                      placeholder="e.g. 300"
                      value={usageLimit}
                      onChange={(e) =>
                        setUsageLimit(e.target.value === '' ? '' : parseInt(e.target.value))
                      }
                      className="mt-1 w-full rounded-xl border border-gray-300 p-2.5 font-medium outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
                  <div>
                    <p className="font-bold text-[#18201c]">Active Status</p>
                    <p className="text-[11px] text-gray-500">
                      Allow customers to apply this code at checkout
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="size-5 accent-[#18201c] cursor-pointer"
                  />
                </div>

                <button
                  type="submit"
                  className="mt-2 w-full rounded-full bg-[#18201c] py-3 font-bold text-white shadow-md hover:bg-[#323d36] transition"
                >
                  {editingCoupon ? 'Save Coupon Changes' : 'Publish Store Coupon'}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      <footer className="py-6 text-center text-xs text-gray-400 border-t border-gray-200 bg-white">
        © 2026 crave. Kitchen Promotions &amp; Coupon Management Console.
      </footer>
    </div>
  )
}
