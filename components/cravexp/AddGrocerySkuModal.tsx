'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Camera, X } from 'lucide-react'
import { useToast } from '@/lib/toast-context'
import { GroceryItem } from '@/components/dashboards/CraveXPStore'

interface AddGrocerySkuModalProps {
  isOpen: boolean
  onClose: () => void
  restaurantId: string | null
  restaurantName: string
  initialBarcode: string
  onOpenScanner: () => void
  onItemAdded: (item: GroceryItem & { skuCode: string; expiryDate: string | null }) => void
}

export default function AddGrocerySkuModal({
  isOpen,
  onClose,
  restaurantId,
  restaurantName,
  initialBarcode,
  onOpenScanner,
  onItemAdded,
}: AddGrocerySkuModalProps) {
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Dairy & Eggs')
  const [unit, setUnit] = useState('')
  const [price, setPrice] = useState('')
  const [mrp, setMrp] = useState('')
  const [stock, setStock] = useState('50')
  const [image, setImage] = useState('')
  const [barcode, setBarcode] = useState('')

  useEffect(() => {
    if (initialBarcode) {
      setBarcode(initialBarcode)
    }
  }, [initialBarcode])

  if (!isOpen) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!restaurantId || !name.trim() || !price || !stock) return
    const customBarcode = barcode.trim().toUpperCase()
    const skuCode = customBarcode || crypto.randomUUID()

    const newItem: GroceryItem & { skuCode: string; expiryDate: string | null } = {
      id: crypto.randomUUID(),
      name,
      category,
      unit,
      price: Number(price),
      mrp: Number(mrp) || Number(price),
      image,
      inStock: true,
      restaurantId,
      restaurantName,
      stockCount: Number(stock),
      skuCode,
      expiryDate: null,
      discount:
        mrp && Number(mrp) > Number(price)
          ? `${Math.round(((Number(mrp) - Number(price)) / Number(mrp)) * 100)}% OFF`
          : undefined,
    }

    try {
      const response = await fetch('/api/menu-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newItem.id,
          restaurant_id: restaurantId,
          name: newItem.name,
          category: newItem.category,
          unit: newItem.unit,
          price: newItem.price,
          mrp: newItem.mrp,
          image: newItem.image || null,
          in_stock: newItem.inStock,
          stock_count: newItem.stockCount,
          sku_code: newItem.skuCode,
        }),
      })

      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        toast(`Could not add product: ${result.error || 'Database error'}`, 'error')
        return
      }

      onItemAdded(newItem)
      setName('')
      setPrice('')
      setMrp('')
      setStock('50')
      setImage('')
      setBarcode('')
      onClose()
      toast(`Added "${newItem.name}" with Barcode [${skuCode}] to inventory!`, 'success')
    } catch (err: any) {
      toast(`Error adding product: ${err.message}`, 'error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-xs sm:p-4 animate-in fade-in duration-200">
      <div className="max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-3xl border border-[#e2e7dc] bg-white p-4 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:p-6 custom-scrollbar">
        <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
          <h3 className="font-bold text-base text-[#18201c]">Add New Grocery SKU to craveXP</h3>
          <button
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-bold text-[#18201c]">Product SKU Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Amul Butter 100g"
              className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-xs outline-none focus:border-[#18201c]"
            />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold text-[#18201c]">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-xs outline-none focus:border-[#18201c] bg-white cursor-pointer"
              >
                <option>Dairy &amp; Eggs</option>
                <option>Fruits &amp; Veggies</option>
                <option>Snacks &amp; Munchies</option>
                <option>Drinks &amp; Juices</option>
                <option>Instant Food</option>
                <option>Cleaning &amp; Household</option>
                <option>Personal Care</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-[#18201c]">Unit / Pack Size *</label>
              <input
                type="text"
                required
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g. 100 g or 1 L"
                className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-xs outline-none focus:border-[#18201c]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div>
              <label className="text-xs font-bold text-[#18201c]">Price (₹) *</label>
              <input
                type="number"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="45"
                className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-xs outline-none focus:border-[#18201c]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#18201c]">MRP (₹)</label>
              <input
                type="number"
                value={mrp}
                onChange={(e) => setMrp(e.target.value)}
                placeholder="50"
                className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-xs outline-none focus:border-[#18201c]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#18201c]">Stock Count</label>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="50"
                className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-xs outline-none focus:border-[#18201c]"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-[#18201c]">Barcode / EAN</label>
              <button
                type="button"
                onClick={onOpenScanner}
                className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg transition cursor-pointer"
              >
                <Camera className="size-3" />
                <span>Scan Camera</span>
              </button>
            </div>
            <input
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="e.g. 8901058852314 (Optional - Auto-generated if empty)"
              className="w-full rounded-xl border border-gray-200 p-3 text-xs font-mono outline-none focus:border-[#18201c]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[#18201c]">Image URL (Optional)</label>
            <input
              type="url"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://..."
              className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-xs outline-none focus:border-[#18201c]"
            />
          </div>

          <button
            type="submit"
            className="mt-3 w-full rounded-2xl bg-[#18201c] py-3.5 text-xs font-black text-[#d9f447] hover:bg-[#323f37] transition shadow cursor-pointer"
          >
            Add Product SKU to craveXP Store
          </button>
        </form>
      </div>
    </div>
  )
}
