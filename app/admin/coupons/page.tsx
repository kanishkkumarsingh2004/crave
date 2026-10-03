'use client'

import { Coupon, fetchCouponsFromSupabase } from '@/lib/coupons'
import { supabase } from '@/lib/supabase'
import {
  Check,
  CheckCircle2,
  DollarSign,
  Edit3,
  Plus,
  Search,
  Sparkles,
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

  // Notification Banner
  const [toastMsg, setToastMsg] = useState('')

  useEffect(() => {
    async function load() {
      const data = await fetchCouponsFromSupabase()
      setCoupons(data)
    }
    load()
  }, [])

  function showToast(msg: string) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 3000)
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
      }
      try {
        const { error } = await supabase.from('coupons').update(dbRecord).eq('id', editingCoupon.id)
        if (error) throw error
      } catch (err) {
        console.error('Failed to update coupon in Supabase:', err)
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
      }

      try {
        const { error } = await supabase.from('coupons').insert([dbRecord])
        if (error) throw error
      } catch (err) {
        console.error('Failed to insert coupon into Supabase:', err)
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
      const { error } = await supabase.from('coupons').update({ is_active: newStatus }).eq('id', id)
      if (error) throw error
    } catch (err) {
      console.error('Failed to toggle coupon in Supabase:', err)
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
      const { error } = await supabase.from('coupons').delete().eq('id', id)
      if (error) throw error
    } catch (err) {
      console.error('Failed to delete coupon in Supabase:', err)
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
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-5 z-50 flex items-center gap-2 rounded-2xl bg-[#121815] px-4 py-3 text-xs font-bold text-white shadow-2xl border border-white/20 animate-in fade-in slide-in-from-top-4 duration-300">
          <Sparkles className="size-4 text-[#d9f447]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-[#e1e6df] bg-white p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-900 border border-purple-200">
              Admin Promotional Engine
            </span>
            <span className="text-xs text-gray-500">Global Customer Discount Codes</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#18201c]">
            Coupons &amp; Discounts Manager
          </h1>
          <p className="mt-0.5 text-xs text-gray-600">
            Create, edit, deactivate, and monitor performance of platform promo codes.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 rounded-2xl bg-[#121815] px-5 py-3 text-xs font-bold text-white shadow-md hover:bg-[#232f29] transition active:scale-95"
        >
          <Plus className="size-4 text-[#d9f447]" /> Create New Coupon
        </button>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-3xl border border-[#e1e6df] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Total Promo Codes
            </p>
            <Tag className="size-4 text-purple-600" />
          </div>
          <p className="mt-2 text-3xl font-bold text-[#18201c]">{coupons.length}</p>
          <p className="mt-1 text-xs text-gray-500">{activeCount} currently active</p>
        </div>

        <div className="rounded-3xl border border-[#e1e6df] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Active Coupons
            </p>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-3xl font-bold text-emerald-700">{activeCount}</p>
          <p className="mt-1 text-xs text-emerald-600 font-medium">Ready in Customer Checkout</p>
        </div>

        <div className="rounded-3xl border border-[#e1e6df] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Total Redemptions
            </p>
            <TrendingUp className="size-4 text-blue-600" />
          </div>
          <p className="mt-2 text-3xl font-bold text-blue-700">
            {totalRedemptions.toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-xs text-gray-500">Orders processed with discounts</p>
        </div>

        <div className="rounded-3xl border border-[#e1e6df] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Total Discount Savings
            </p>
            <DollarSign className="size-4 text-amber-600" />
          </div>
          <p className="mt-2 text-3xl font-bold text-amber-700">
            ₹{totalDiscountGiven.toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-xs text-gray-500">Customer savings delivered</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-[#e1e6df] bg-white p-4 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-2.5 size-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search coupon by code or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-gray-200 py-2 pl-10 pr-4 text-xs font-medium outline-none focus:border-[#121815]"
          />
        </div>

        <div className="flex items-center gap-1.5 rounded-2xl bg-gray-100 p-1 text-xs font-bold">
          {(['all', 'active', 'inactive'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-xl px-4 py-1.5 capitalize transition ${
                statusFilter === st
                  ? 'bg-[#121815] text-white shadow-sm'
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Coupons Table View (hidden md:block) */}
      <div className="hidden md:block rounded-3xl border border-[#e1e6df] bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/70 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-4">Coupon Code</th>
                <th className="py-3.5 px-4">Offer Description</th>
                <th className="py-3.5 px-4">Discount Type &amp; Value</th>
                <th className="py-3.5 px-4">Min Order / Max Cap</th>
                <th className="py-3.5 px-4">Expiry Date</th>
                <th className="py-3.5 px-4">Redemptions</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {filteredCoupons.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/60 transition">
                  <td className="py-4 px-4 font-bold text-sm">
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-purple-50 px-3 py-1 text-purple-900 border border-purple-200 font-mono tracking-wider">
                      <Tag className="size-3.5 text-purple-600" />
                      {c.code}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-gray-700 max-w-xs">{c.description}</td>
                  <td className="py-4 px-4 font-bold text-[#18201c]">
                    {c.discountType === 'percentage' ? (
                      <span className="text-purple-700">{c.discountValue}% OFF</span>
                    ) : (
                      <span className="text-emerald-700">Flat ₹{c.discountValue} OFF</span>
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
            className="rounded-3xl border border-[#e1e6df] bg-white p-5 shadow-sm flex flex-col gap-3"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <span className="rounded-xl bg-purple-50 px-3 py-1 text-xs font-bold text-purple-900 border border-purple-200 font-mono flex items-center gap-1.5">
                <Tag className="size-3.5 text-purple-700" />
                {c.code}
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

      {/* Create / Edit Coupon Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#121815]/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-[#18201c]">
                {editingCoupon ? 'Edit Coupon Code' : 'Create New Promo Coupon'}
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
                    placeholder="e.g. SUMMER50"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 p-2.5 font-mono uppercase font-bold outline-none focus:border-[#121815]"
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
                <label className="font-bold text-[#18201c]">Description / Display Subtitle</label>
                <input
                  type="text"
                  placeholder="e.g. 50% OFF up to ₹120 on orders above ₹199"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-300 p-2.5 font-medium outline-none focus:border-[#121815]"
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
                    placeholder={discountType === 'percentage' ? '50' : '100'}
                    value={discountValue}
                    onChange={(e) =>
                      setDiscountValue(e.target.value === '' ? '' : parseFloat(e.target.value))
                    }
                    className="mt-1 w-full rounded-xl border border-gray-300 p-2.5 font-bold outline-none focus:border-[#121815]"
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
                    className="mt-1 w-full rounded-xl border border-gray-300 p-2.5 font-bold outline-none focus:border-[#121815]"
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
                    className="mt-1 w-full rounded-xl border border-gray-300 p-2.5 font-medium outline-none focus:border-[#121815]"
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
                  <label className="font-bold text-[#18201c]">Usage Limit (Optional)</label>
                  <input
                    type="number"
                    placeholder="e.g. 500"
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
                    Customers can use this coupon immediately in cart
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="size-5 accent-[#121815] cursor-pointer"
                />
              </div>

              <button
                type="submit"
                className="mt-2 w-full rounded-full bg-[#121815] py-3 font-bold text-white shadow-md hover:bg-[#232f29] transition"
              >
                {editingCoupon ? 'Save Coupon Changes' : 'Publish Coupon'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
