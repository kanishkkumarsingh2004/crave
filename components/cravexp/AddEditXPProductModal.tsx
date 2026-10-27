'use client'

import { Camera, CheckCircle2, PackageOpen, X } from 'lucide-react'
import type React from 'react'
import type { emptyProductForm } from './admin-types'

interface AddEditXPProductModalProps {
  isOpen: boolean
  onClose: () => void
  productForm: typeof emptyProductForm
  setProductForm: React.Dispatch<React.SetStateAction<typeof emptyProductForm>>
  editingProductId: string | null
  generatedSku: string
  submitting: boolean
  onOpenBarcodeScanner: () => void
  onSubmit: (event: React.FormEvent) => Promise<void>
}

export default function AddEditXPProductModal({
  isOpen,
  onClose,
  productForm,
  setProductForm,
  editingProductId,
  generatedSku,
  submitting,
  onOpenBarcodeScanner,
  onSubmit,
}: AddEditXPProductModalProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-xp-product-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose()
      }}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-[#27342d] dark:bg-[#18201c]">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 bg-gray-50/80 px-5 py-4 dark:border-white/5 dark:bg-[#121815] sm:px-6">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#d9f447] text-[#121815] shadow-sm">
              <PackageOpen className="size-5" />
            </span>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#6f8817] dark:text-[#d9f447]">
                Customer XP Catalog
              </span>
              <h3 id="add-xp-product-title" className="mt-0.5 text-lg font-black">
                {editingProductId ? 'Edit XP Product' : 'Add XP Product'}
              </h3>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Products added here show directly on the customer&apos;s `/user/cravexp` grocery
                storefront.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="grid size-9 shrink-0 place-items-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-100 disabled:opacity-40 dark:border-[#27342d] dark:bg-[#18201c] dark:hover:bg-white/5"
            aria-label="Close product dialog"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="max-h-[75vh] overflow-y-auto p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-bold sm:col-span-2">
              Item name
              <input
                type="text"
                required
                value={productForm.name}
                onChange={(event) =>
                  setProductForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Nandini Toned Fresh Milk"
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-medium outline-none transition focus:border-[#86a018] focus:ring-4 focus:ring-[#d9f447]/15 dark:border-[#27342d] dark:bg-[#121815]"
              />
            </label>

            <label className="block text-xs font-bold">
              Category
              <select
                value={productForm.category}
                onChange={(event) =>
                  setProductForm((current) => ({ ...current, category: event.target.value }))
                }
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-xs font-medium outline-none transition focus:border-[#86a018] dark:border-[#27342d] dark:bg-[#121815]"
              >
                {[
                  'Grocery Essentials',
                  'Dairy & Breakfast',
                  'Snacks & Munchies',
                  'Instant & Frozen Food',
                  'Beverages & Drinks',
                  'Personal Care',
                  'Household & Cleaning',
                ].map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-bold">
              Pack unit
              <input
                type="text"
                required
                value={productForm.unit}
                onChange={(event) =>
                  setProductForm((current) => ({ ...current, unit: event.target.value }))
                }
                placeholder="500 ml"
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-medium outline-none transition focus:border-[#86a018] focus:ring-4 focus:ring-[#d9f447]/15 dark:border-[#27342d] dark:bg-[#121815]"
              />
            </label>

            <label className="block text-xs font-bold sm:col-span-2">
              Catalog SKU (system generated)
              <input
                type="text"
                readOnly
                value={generatedSku}
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 font-mono text-xs font-bold text-gray-600 outline-none dark:border-[#27342d] dark:bg-[#121815] dark:text-gray-300"
              />
              <span className="mt-1 block text-[9px] font-medium text-gray-400">
                Generated from product details and barcode
              </span>
            </label>

            <label className="block text-xs font-bold">
              Selling price (₹)
              <input
                type="number"
                min="0"
                step="1"
                required
                value={productForm.price}
                onChange={(event) =>
                  setProductForm((current) => ({ ...current, price: event.target.value }))
                }
                placeholder="89"
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-medium outline-none transition focus:border-[#86a018] dark:border-[#27342d] dark:bg-[#121815]"
              />
            </label>

            <label className="block text-xs font-bold">
              MRP (₹)
              <input
                type="number"
                min="0"
                step="1"
                value={productForm.mrp}
                onChange={(event) =>
                  setProductForm((current) => ({ ...current, mrp: event.target.value }))
                }
                placeholder="110"
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-medium outline-none transition focus:border-[#86a018] dark:border-[#27342d] dark:bg-[#121815]"
              />
            </label>

            <label className="block text-xs font-bold">
              Stock count
              <input
                type="number"
                min="0"
                step="1"
                required
                value={productForm.stockCount}
                onChange={(event) =>
                  setProductForm((current) => ({ ...current, stockCount: event.target.value }))
                }
                placeholder="50"
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-medium outline-none transition focus:border-[#86a018] dark:border-[#27342d] dark:bg-[#121815]"
              />
            </label>

            <label className="block text-xs font-bold">
              Image URL
              <input
                type="text"
                value={productForm.image}
                onChange={(event) =>
                  setProductForm((current) => ({ ...current, image: event.target.value }))
                }
                placeholder="https://…"
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-medium outline-none transition focus:border-[#86a018] dark:border-[#27342d] dark:bg-[#121815]"
              />
            </label>

            <label className="block text-xs font-bold sm:col-span-2">
              Barcode
              <div className="mt-1.5 flex gap-2">
                <input
                  type="text"
                  value={productForm.barcode}
                  onChange={(event) =>
                    setProductForm((current) => ({
                      ...current,
                      barcode: event.target.value,
                    }))
                  }
                  placeholder="Type barcode, e.g. 8901058852314"
                  inputMode="numeric"
                  autoComplete="off"
                  minLength={4}
                  maxLength={128}
                  className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 font-mono text-xs font-medium outline-none transition focus:border-[#86a018] focus:ring-4 focus:ring-[#d9f447]/15 dark:border-[#27342d] dark:bg-[#121815]"
                />
                <button
                  type="button"
                  onClick={onOpenBarcodeScanner}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[#86a018]/40 bg-[#d9f447]/15 px-3 py-2.5 text-[11px] font-black text-[#52660b] transition hover:bg-[#d9f447]/30 dark:text-[#d9f447]"
                >
                  <Camera className="size-4" />
                  <span className="hidden sm:inline">Scan camera</span>
                </button>
              </div>
              <span className="mt-1 block text-[9px] font-medium text-gray-400">
                Optional. Enter it manually or scan the product packaging.
              </span>
            </label>

            <label className="flex items-center gap-2 self-end rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-xs font-bold dark:border-[#27342d] dark:bg-[#121815] sm:col-span-2">
              <input
                type="checkbox"
                checked={productForm.inStock}
                onChange={(event) =>
                  setProductForm((current) => ({ ...current, inStock: event.target.checked }))
                }
                className="size-4 accent-[#86a018]"
              />
              Available to customers
            </label>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 dark:border-white/5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-bold transition hover:bg-gray-50 disabled:opacity-40 dark:border-[#27342d] dark:hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#18201c] px-5 py-2.5 text-xs font-black text-white transition hover:bg-black disabled:opacity-50 dark:bg-[#d9f447] dark:text-[#121815]"
            >
              <CheckCircle2 className="size-4" />
              {submitting
                ? 'Saving…'
                : editingProductId
                  ? 'Update Customer Product'
                  : 'Publish to XP Store'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
