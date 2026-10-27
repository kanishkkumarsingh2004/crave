'use client'

import React, { useState } from 'react'
import { Store, X, Search } from 'lucide-react'
import { RestaurantItem } from './types'

interface RestaurantSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  restaurantsList: RestaurantItem[]
  selectedRestaurantIds: string[]
  onSelectRestaurantIds: (ids: string[]) => void
}

export function RestaurantSelectorModal({
  isOpen,
  onClose,
  restaurantsList,
  selectedRestaurantIds,
  onSelectRestaurantIds,
}: RestaurantSelectorModalProps) {
  const [restaurantSearchQuery, setRestaurantSearchQuery] = useState('')

  if (!isOpen) return null

  const filtered = restaurantsList.filter(
    (r) =>
      r.name.toLowerCase().includes(restaurantSearchQuery.toLowerCase()) ||
      r.address.toLowerCase().includes(restaurantSearchQuery.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#18201c] text-[#18201c] dark:text-white p-6 shadow-2xl border border-gray-200 dark:border-[#27342d] flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#27342d] pb-3">
          <div>
            <h3 className="text-base font-bold text-[#18201c] dark:text-white flex items-center gap-2">
              <Store className="size-5 text-purple-600 dark:text-purple-400" /> Select Applicable
              Restaurants
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              Choose restaurants where customers can redeem this coupon
            </p>
          </div>
          <button
            onClick={onClose}
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
              onClick={() => onSelectRestaurantIds(restaurantsList.map((r) => r.id))}
              className="rounded-lg bg-gray-100 dark:bg-[#121815] px-2.5 py-1 text-[11px] font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 border border-transparent dark:border-[#27342d]"
            >
              Select All ({restaurantsList.length})
            </button>
            <button
              type="button"
              onClick={() => onSelectRestaurantIds([])}
              className="rounded-lg bg-gray-100 dark:bg-[#121815] px-2.5 py-1 text-[11px] font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 border border-transparent dark:border-[#27342d]"
            >
              Deselect All
            </button>
          </div>
          <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
            {selectedRestaurantIds.length} Selected
          </span>
        </div>

        {/* Scrollable Restaurant List */}
        <div className="mt-3 flex-1 overflow-y-auto space-y-2 pr-1 max-h-72">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400 font-medium">
              No restaurants match &quot;{restaurantSearchQuery}&quot;
            </div>
          ) : (
            filtered.map((rest) => {
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
                        onSelectRestaurantIds([...selectedRestaurantIds, rest.id])
                      } else {
                        onSelectRestaurantIds(selectedRestaurantIds.filter((id) => id !== rest.id))
                      }
                    }}
                    className="mt-0.5 size-4 accent-purple-700 cursor-pointer rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#18201c] dark:text-white truncate">
                      {rest.name}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {rest.address}
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
            onClick={onClose}
            className="w-full rounded-full bg-[#121815] dark:bg-[#86a018] py-2.5 text-xs font-bold text-white dark:text-[#121815] shadow-md hover:bg-[#232f29] dark:hover:bg-[#97b41e] transition"
          >
            Confirm &amp; Apply Selection ({selectedRestaurantIds.length} Selected)
          </button>
        </div>
      </div>
    </div>
  )
}
