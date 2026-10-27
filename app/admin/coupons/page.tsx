'use client'

import React, { useEffect, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { Coupon, fetchCoupons } from '@/lib/coupons'
import { useToast } from '@/lib/toast-context'
import { CouponKpis } from '@/components/admin/coupons/CouponKpis'
import { CouponList } from '@/components/admin/coupons/CouponList'
import { CreateEditCouponModal } from '@/components/admin/coupons/CreateEditCouponModal'
import { RestaurantItem, StatusFilter } from '@/components/admin/coupons/types'

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)

  // Restaurants State
  const [restaurantsList, setRestaurantsList] = useState<RestaurantItem[]>([])

  const { toast } = useToast()

  async function loadCoupons() {
    const data = await fetchCoupons()
    setCoupons(data)
  }

  useEffect(() => {
    async function load() {
      await loadCoupons()
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
    await loadCoupons()
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
    await loadCoupons()
    showToast(`Coupon '${item?.code}' deleted successfully.`)
  }

  function openCreateModal() {
    setEditingCoupon(null)
    setShowModal(true)
  }

  function openEditModal(c: Coupon) {
    setEditingCoupon(c)
    setShowModal(true)
  }

  const filteredCoupons = coupons.filter((c) => {
    const matchesQuery =
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus =
      statusFilter === 'all' ? true : statusFilter === 'active' ? c.isActive : !c.isActive
    return matchesQuery && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-[#e1e6df] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
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
      <CouponKpis coupons={coupons} />

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

      {/* Coupons Table & Mobile Cards */}
      <CouponList
        coupons={filteredCoupons}
        restaurantsList={restaurantsList}
        onToggleActive={toggleCouponActive}
        onEdit={openEditModal}
        onDelete={deleteCoupon}
      />

      {/* Create / Edit Coupon Modal */}
      <CreateEditCouponModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        editingCoupon={editingCoupon}
        restaurantsList={restaurantsList}
        onSaved={loadCoupons}
        showToast={showToast}
      />
    </div>
  )
}
