'use client'

import { Camera, CheckCircle2, ImageIcon, PackageOpen, Upload, X } from 'lucide-react'
import type React from 'react'
import { useRef, useState } from 'react'
import type { emptyProductForm } from './admin-types'

/** Canonical CraveXP categories — must match CRAVEXP_CATEGORIES in CraveXPStore.tsx */
export const CRAVEXP_PRODUCT_CATEGORIES = [
  'Fruits & Veggies',
  'Dairy, Bread & Eggs',
  'Cold Drinks & Juices',
  'Snacks & Munchies',
  'Instant Food & Noodles',
  'Sweet Tooth & Ice Creams',
] as const

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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadError, setUploadError] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(productForm.image || '')

  if (!isOpen) return null

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, WebP…)')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be smaller than 5 MB')
      return
    }

    setUploadError('')
    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/upload-image', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const { url } = (await response.json()) as { url: string }
        setPreviewUrl(url)
        setProductForm((current) => ({ ...current, image: url }))
      } else {
        throw new Error('upload-endpoint-missing')
      }
    } catch {
      // Graceful fallback: convert to data-URI for preview
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        setPreviewUrl(dataUrl)
        setProductForm((current) => ({ ...current, image: dataUrl }))
      }
      reader.readAsDataURL(file)
    } finally {
      setIsUploading(false)
    }
  }

  function handleUrlChange(url: string) {
    setProductForm((current) => ({ ...current, image: url }))
    setPreviewUrl(url)
    setUploadError('')
  }

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
        {/* Header */}
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
                Products added here show directly on the customer&apos;s{' '}
                <code className="font-mono">/user/cravexp</code> grocery storefront.
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
            {/* Item Name */}
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

            {/* Category — exact canonical CraveXP category IDs */}
            <label className="block text-xs font-bold">
              Category
              <select
                value={productForm.category}
                onChange={(event) =>
                  setProductForm((current) => ({ ...current, category: event.target.value }))
                }
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-xs font-medium outline-none transition focus:border-[#86a018] dark:border-[#27342d] dark:bg-[#121815]"
              >
                {CRAVEXP_PRODUCT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            {/* Pack unit */}
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

            {/* Catalog SKU */}
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

            {/* Selling price */}
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

            {/* MRP */}
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

            {/* Stock count */}
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

            {/* Product image — upload photo OR paste URL */}
            <div className="sm:col-span-2 space-y-2">
              <span className="block text-xs font-bold">Product image</span>

              {/* Preview */}
              {previewUrl && (
                <div className="relative w-full aspect-[3/1] rounded-xl overflow-hidden border border-gray-200 bg-gray-50 dark:border-[#27342d] dark:bg-[#121815]">
                  <img
                    src={previewUrl}
                    alt="Product preview"
                    className="size-full object-contain p-2"
                    onError={() => setPreviewUrl('')}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewUrl('')
                      setProductForm((c) => ({ ...c, image: '' }))
                    }}
                    className="absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition"
                    aria-label="Remove image"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              )}

              {/* Upload button */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#86a018]/40 bg-[#d9f447]/10 px-3 py-3 text-xs font-bold text-[#52660b] transition hover:bg-[#d9f447]/20 disabled:opacity-50 dark:text-[#d9f447]"
              >
                {isUploading ? (
                  <>
                    <Upload className="size-4 animate-bounce" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <ImageIcon className="size-4" />
                    {previewUrl ? 'Replace photo' : 'Upload product photo'}
                  </>
                )}
              </button>

              {uploadError && (
                <p className="text-[10px] font-bold text-red-500">{uploadError}</p>
              )}

              {/* OR paste URL divider */}
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  or paste URL
                </span>
                <div className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
              </div>
              <input
                type="text"
                value={productForm.image}
                onChange={(event) => handleUrlChange(event.target.value)}
                placeholder="https://…"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-medium outline-none transition focus:border-[#86a018] dark:border-[#27342d] dark:bg-[#121815]"
              />
            </div>

            {/* Barcode */}
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

            {/* Available toggle */}
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
