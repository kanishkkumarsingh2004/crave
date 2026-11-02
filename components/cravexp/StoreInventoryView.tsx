'use client'

import React, { useMemo } from 'react'
import { Camera, Plus, Search, Tag } from 'lucide-react'
import { InventoryItem } from './types'

interface StoreInventoryViewProps {
  inventory: InventoryItem[]
  categoryFilter: string
  setCategoryFilter: (c: string) => void
  stockFilter: 'all' | 'instock' | 'lowstock' | 'outofstock'
  setStockFilter: (s: 'all' | 'instock' | 'lowstock' | 'outofstock') => void
  searchQuery: string
  setSearchQuery: (q: string) => void
  onOpenScanner: () => void
  onOpenAddModal: () => void
  onToggleStock: (itemId: string) => void
  onAdjustStock: (itemId: string, delta: number) => void
}

const CATEGORIES = [
  'All',
  'Dairy & Eggs',
  'Fruits & Veggies',
  'Snacks & Munchies',
  'Drinks & Juices',
  'Instant Food',
  'Cleaning & Household',
  'Personal Care',
]

export default function StoreInventoryView({
  inventory,
  categoryFilter,
  setCategoryFilter,
  stockFilter,
  setStockFilter,
  searchQuery,
  setSearchQuery,
  onOpenScanner,
  onOpenAddModal,
  onToggleStock,
  onAdjustStock,
}: StoreInventoryViewProps) {
  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const matchesCat = categoryFilter === 'All' || item.category === categoryFilter
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.skuCode || '').toLowerCase().includes(q)
      const stockCount = item.stockCount || 0
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#18201c]">
            craveXP Inventory &amp; Stock Manager
          </h2>
          <p className="text-xs text-[#5c6861]">
            Manage SKU availability, stock counts, shelf expiry, and prices in real-time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenScanner}
            className="flex items-center gap-2 rounded-2xl border border-[#e2e7dc] bg-white px-4 py-3 text-xs font-bold text-[#18201c] shadow-xs hover:bg-gray-50 transition shrink-0 cursor-pointer"
          >
            <Camera className="size-4 text-emerald-600" />
            <span>Scan Camera Barcode</span>
          </button>
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-2 rounded-2xl bg-[#18201c] px-5 py-3 text-xs font-black text-[#d9f447] shadow hover:bg-[#323f37] transition shrink-0 cursor-pointer"
          >
            <Plus className="size-4" /> Add New SKU Product
          </button>
        </div>
      </div>

      {/* Filter Bar & Search */}
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        {/* Category Pills */}
        <div className="scrollbar-none flex w-full min-w-0 items-center gap-2 overflow-x-auto pb-2 text-xs font-bold sm:w-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`min-h-10 shrink-0 rounded-xl px-3.5 py-2 transition whitespace-nowrap touch-manipulation cursor-pointer ${
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
              className={`min-h-10 shrink-0 rounded-xl px-3 py-2 uppercase tracking-wider text-[10px] transition touch-manipulation cursor-pointer ${
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
          placeholder="Search by product name, category, or barcode..."
          className="w-full bg-transparent font-medium text-[#18201c] outline-none placeholder:text-gray-400"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs font-bold text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Inventory Grid */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {filteredInventory.length === 0 ? (
          <div className="col-span-full py-16 text-center rounded-3xl border border-dashed border-[#e2e7dc] bg-white">
            <Tag className="mx-auto size-10 text-gray-300 mb-3" />
            <p className="text-base font-bold text-[#18201c]">
              No inventory products matched your query.
            </p>
          </div>
        ) : (
          filteredInventory.map((item) => (
            <div
              key={item.id}
              className={`group relative flex flex-col justify-between rounded-2xl border bg-white p-4 shadow-xs transition hover:border-[#18201c] hover:shadow-md ${
                !item.inStock ? 'opacity-60 bg-gray-50 border-gray-200' : 'border-[#e2e7dc]'
              }`}
            >
              <div>
                <div className="relative aspect-square w-full mb-3 rounded-xl overflow-hidden bg-[#f8f9f6] flex items-center justify-center">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-full w-full object-contain p-2"
                    />
                  ) : (
                    <Tag className="size-8 text-gray-300" />
                  )}
                  {item.discount && (
                    <span className="absolute top-2 left-2 rounded-md bg-[#d9f447] px-2 py-0.5 text-[9px] font-black text-[#18201c]">
                      {item.discount}
                    </span>
                  )}
                </div>

                <p className="text-xs font-bold text-[#18201c] line-clamp-1">{item.name}</p>
                <p className="text-[11px] text-[#627068] mt-0.5">{item.unit}</p>

                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-bold text-sm text-[#18201c]">₹{item.price}</span>
                  {item.mrp > item.price && (
                    <span className="text-[11px] text-gray-400 line-through">₹{item.mrp}</span>
                  )}
                </div>

                <p className="text-[10px] font-mono text-gray-400 mt-1 truncate">
                  Barcode: {item.skuCode}
                </p>
              </div>

              {/* Stock Controls */}
              <div className="mt-4 border-t border-[#f0f4eb] pt-3">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-[11px] text-[#627068]">Stock Units:</span>
                  <div className="flex items-center gap-1.5 font-bold">
                    <button
                      onClick={() => onAdjustStock(item.id, -1)}
                      className="size-6 rounded-lg border border-gray-300 grid place-items-center hover:bg-gray-100 text-xs cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-mono">{item.stockCount}</span>
                    <button
                      onClick={() => onAdjustStock(item.id, 1)}
                      className="size-6 rounded-lg border border-gray-300 grid place-items-center hover:bg-gray-100 text-xs cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => onToggleStock(item.id)}
                  className={`w-full rounded-xl py-2 text-[11px] font-bold transition cursor-pointer ${
                    item.inStock
                      ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  {item.inStock ? 'Mark Out of Stock' : 'Mark Available'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
