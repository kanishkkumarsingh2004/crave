'use client'

import React, { useEffect, useState } from 'react'
import { Building2, DollarSign, Store, X } from 'lucide-react'
import AppleToggle from '@/components/ui/AppleToggle'
import { Coupon } from '@/lib/coupons'
import { RestaurantItem } from './types'
import { RestaurantSelectorModal } from './RestaurantSelectorModal'

interface CreateEditCouponModalProps {
  isOpen: boolean
  onClose: () => void
  editingCoupon: Coupon | null
  restaurantsList: RestaurantItem[]
  onSaved: () => void
  showToast: (msg: string) => void
}

export function CreateEditCouponModal({
  isOpen,
  onClose,
  editingCoupon,
  restaurantsList,
  onSaved,
  showToast,
}: CreateEditCouponModalProps) {
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('percentage')
  const [discountValue, setDiscountValue] = useState<number | ''>('')
  const [minOrderAmount, setMinOrderAmount] = useState<number | ''>('')
  const [maxDiscount, setMaxDiscount] = useState<number | ''>('')
  const [expiryDate, setExpiryDate] = useState('')
  const [usageLimit, setUsageLimit] = useState<number | ''>('')
  const [isActive, setIsActive] = useState(true)
  const [fundingSource, setFundingSource] = useState<'RESTAURANT' | 'PLATFORM' | 'SHARED' | 'BANK'>(
    'SHARED'
  )
  const [restaurantContributionPct, setRestaurantContributionPct] = useState<number>(60)
  const [selectedRestaurantIds, setSelectedRestaurantIds] = useState<string[]>([])
  const [showRestaurantModal, setShowRestaurantModal] = useState(false)

  useEffect(() => {
    if (editingCoupon) {
      setCode(editingCoupon.code)
      setDescription(editingCoupon.description)
      setDiscountType(editingCoupon.discountType)
      setDiscountValue(editingCoupon.discountValue)
      setMinOrderAmount(editingCoupon.minOrderAmount)
      setMaxDiscount(editingCoupon.maxDiscount !== undefined ? editingCoupon.maxDiscount : '')
      setExpiryDate(editingCoupon.expiryDate)
      setUsageLimit(editingCoupon.usageLimit !== undefined ? editingCoupon.usageLimit : '')
      setIsActive(editingCoupon.isActive)
      setSelectedRestaurantIds(
        editingCoupon.restaurantIds && editingCoupon.restaurantIds.length > 0
          ? editingCoupon.restaurantIds
          : editingCoupon.restaurantId
            ? [editingCoupon.restaurantId]
            : []
      )
      setFundingSource(editingCoupon.fundingSource)
      setRestaurantContributionPct(editingCoupon.restaurantContributionPct)
    } else {
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
      setFundingSource('SHARED')
      setRestaurantContributionPct(50)
    }
  }, [editingCoupon, isOpen])

  if (!isOpen) return null

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
    const primaryRestId = rIds.length > 0 ? rIds[0] : null

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
        funding_source: fundingSource,
        restaurant_share: restaurantContributionPct,
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
        funding_source: fundingSource,
        restaurant_share: restaurantContributionPct,
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

      showToast(`New Coupon '${formattedCode}' created and published!`)
    }

    onSaved()
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#18201c] text-[#18201c] dark:text-white p-6 shadow-2xl border border-gray-200 dark:border-[#27342d] max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#27342d] pb-3">
            <h3 className="text-lg font-bold text-[#18201c] dark:text-white">
              {editingCoupon ? 'Edit Coupon Code' : 'Create New Promo Coupon'}
            </h3>
            <button
              onClick={onClose}
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
                <label className="font-bold text-[#18201c] dark:text-white">Min Order (₹) *</label>
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

            {/* Commercial Discount Funding Allocation */}
            <div className="rounded-2xl border border-purple-200 dark:border-purple-800/50 bg-purple-50/50 dark:bg-purple-950/30 p-3.5 space-y-2 text-xs">
              <label className="font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                <DollarSign className="size-3.5 text-purple-600 dark:text-purple-400" /> Commercial
                Funding Source Allocation
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                    Funding Source
                  </label>
                  <select
                    value={fundingSource}
                    onChange={(e) => setFundingSource(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2 font-bold outline-none"
                  >
                    <option value="SHARED">SHARED (Vendor + Platform)</option>
                    <option value="RESTAURANT">RESTAURANT FUNDED (100%)</option>
                    <option value="PLATFORM">PLATFORM FUNDED (100%)</option>
                    <option value="BANK">BANK OFFER (Sponsored)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                    Vendor Funding Share (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={restaurantContributionPct}
                    onChange={(e) =>
                      setRestaurantContributionPct(
                        Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2 font-bold outline-none"
                  />
                </div>
              </div>
              <p className="text-[10px] text-purple-800 dark:text-purple-300 italic">
                Vendor bears {restaurantContributionPct}% of discount (₹
                {Math.round(
                  ((typeof discountValue === 'number' ? discountValue : 50) *
                    restaurantContributionPct) /
                    100
                )}
                ), Platform bears {100 - restaurantContributionPct}%.
              </p>
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
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
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
                                setSelectedRestaurantIds((prev) => prev.filter((id) => id !== rId))
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

            <div className="flex items-center justify-between rounded-2xl bg-gray-50 dark:bg-[#121815] p-4 border border-gray-200 dark:border-[#27342d]">
              <div>
                <p className="font-bold text-[#18201c] dark:text-white">Active Status</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Customers can use this coupon immediately in cart
                </p>
              </div>
              <AppleToggle
                checked={isActive}
                onChange={setIsActive}
                iconVariant="check"
                activeColor="bg-[#34c759]"
                ariaLabel="Coupon active status"
              />
            </div>

            <button
              type="submit"
              className="mt-2 w-full rounded-full bg-[#18201c] text-white hover:bg-black dark:bg-[#d9f447] dark:text-[#121815] py-3 font-bold shadow-md dark:hover:bg-[#c2dc3a] transition"
            >
              {editingCoupon ? 'Save Coupon Changes' : 'Publish Coupon'}
            </button>
          </form>
        </div>
      </div>

      <RestaurantSelectorModal
        isOpen={showRestaurantModal}
        onClose={() => setShowRestaurantModal(false)}
        restaurantsList={restaurantsList}
        selectedRestaurantIds={selectedRestaurantIds}
        onSelectRestaurantIds={setSelectedRestaurantIds}
      />
    </>
  )
}
