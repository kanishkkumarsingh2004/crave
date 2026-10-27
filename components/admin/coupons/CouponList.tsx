'use client'

import React from 'react'
import { Edit3, Store, Trash2 } from 'lucide-react'
import { Coupon } from '@/lib/coupons'
import { RestaurantItem } from './types'

interface CouponListProps {
  coupons: Coupon[]
  restaurantsList: RestaurantItem[]
  onToggleActive: (id: string) => void
  onEdit: (c: Coupon) => void
  onDelete: (id: string) => void
}

export function CouponList({
  coupons,
  restaurantsList,
  onToggleActive,
  onEdit,
  onDelete,
}: CouponListProps) {
  return (
    <>
      {/* Desktop Coupons Table View */}
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
              {coupons.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-gray-50/60 dark:hover:bg-[#202923]/60 transition"
                >
                  <td className="py-4 px-4 font-bold text-sm">
                    <span className="font-mono font-bold text-sm text-purple-700 dark:text-purple-300 tracking-wider">
                      {c.code}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-gray-700 dark:text-gray-300 max-w-xs">
                    {c.description}
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-xs font-medium text-stone-600 dark:text-gray-300">
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
                      onClick={() => onToggleActive(c.id)}
                      className={`text-xs font-bold uppercase transition hover:underline ${
                        c.isActive
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {c.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onEdit(c)}
                        className="grid size-8 place-items-center rounded-xl bg-gray-100 dark:bg-[#121815] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#202923] transition"
                        title="Edit Coupon"
                      >
                        <Edit3 className="size-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(c.id)}
                        className="grid size-8 place-items-center rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition"
                        title="Delete Coupon"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {coupons.length === 0 && (
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

      {/* Mobile Coupon Cards View */}
      <div className="block md:hidden flex flex-col gap-4">
        {coupons.map((c) => (
          <div
            key={c.id}
            className="rounded-3xl border border-[#e1e6df] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-5 shadow-sm flex flex-col gap-3"
          >
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#27342d] pb-3">
              <span className="font-mono font-bold text-xs text-purple-700 dark:text-purple-300">
                {c.code}
              </span>
              <button
                onClick={() => onToggleActive(c.id)}
                className={`text-xs font-bold uppercase transition hover:underline ${
                  c.isActive
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
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
                  onClick={() => onEdit(c)}
                  className="rounded-xl bg-gray-100 dark:bg-[#121815] px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 border border-transparent dark:border-[#27342d]"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(c.id)}
                  className="rounded-xl bg-rose-50 dark:bg-rose-950/40 px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 border border-transparent dark:border-rose-900/50"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
