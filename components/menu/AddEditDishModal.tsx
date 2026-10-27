'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Check, Image as ImageIcon, Sparkles, Trash2, X } from 'lucide-react'
import { useToast } from '@/lib/toast-context'
import {
  ALL_PRESET_CATEGORIES,
  MENU_CATEGORY_GROUPS,
  PORTION_PRESETS,
  QUICK_IMAGE_PRESETS,
} from './constants'
import { MenuItemRecord, MenuItemVariantRecord } from './types'

interface AddEditDishModalProps {
  isOpen: boolean
  onClose: () => void
  editingItem: MenuItemRecord | null
  restaurantId: string
  onSaved: (item: MenuItemRecord, isEdit: boolean) => void
}

export default function AddEditDishModal({
  isOpen,
  onClose,
  editingItem,
  restaurantId,
  onSaved,
}: AddEditDishModalProps) {
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)

  const [name, setName] = useState('')
  const [category, setCategory] = useState('Biryani, Rice & Pulao')
  const [isCustomCategory, setIsCustomCategory] = useState(false)
  const [customCategory, setCustomCategory] = useState('')
  const [price, setPrice] = useState<number | ''>('')
  const [restaurantPrice, setRestaurantPrice] = useState<number | ''>('')
  const [variants, setVariants] = useState<MenuItemVariantRecord[]>([])
  const [description, setDescription] = useState('')
  const [image, setImage] = useState('')
  const [isVeg, setIsVeg] = useState(true)
  const [inStock, setInStock] = useState(true)
  const [stockCount, setStockCount] = useState<number | ''>(50)
  const [unit, setUnit] = useState('Serves 1')
  const [skuCode, setSkuCode] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [hsnSac, setHsnSac] = useState('996331')
  const [priceTaxMode, setPriceTaxMode] = useState<'TAX_INCLUSIVE' | 'TAX_EXCLUSIVE'>('TAX_INCLUSIVE')

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name)
      const isPreset = ALL_PRESET_CATEGORIES.includes(editingItem.category)
      if (isPreset) {
        setCategory(editingItem.category)
        setIsCustomCategory(false)
        setCustomCategory('')
      } else {
        setCategory('__CUSTOM__')
        setIsCustomCategory(true)
        setCustomCategory(editingItem.category)
      }
      setPrice(editingItem.price)
      setRestaurantPrice(editingItem.restaurant_price ?? editingItem.price)
      setVariants(editingItem.variants || [])
      setDescription(editingItem.description || '')
      setImage(editingItem.image || '')
      setIsVeg(editingItem.veg !== false)
      setInStock(editingItem.in_stock !== false)
      setStockCount(editingItem.stock_count != null ? editingItem.stock_count : 50)
      setUnit(editingItem.unit || '')
      setSkuCode(editingItem.sku_code || '')
      setHsnSac(editingItem.hsn_sac_code || '996331')
      setPriceTaxMode(editingItem.price_tax_mode || 'TAX_INCLUSIVE')
      setExpiryDate(editingItem.expiry_date || '')
    } else {
      setName('')
      setCategory('Biryani, Rice & Pulao')
      setIsCustomCategory(false)
      setCustomCategory('')
      setPrice('')
      setRestaurantPrice('')
      setVariants([])
      setDescription('')
      setImage('')
      setIsVeg(true)
      setInStock(true)
      setStockCount(50)
      setUnit('Serves 1')
      setSkuCode('')
      setHsnSac('996331')
      setPriceTaxMode('TAX_INCLUSIVE')
      setExpiryDate('')
    }
  }, [editingItem, isOpen])

  if (!isOpen) return null

  const addStandardSizes = () => {
    if (variants.length > 0) return
    const baseRestPrice = Number(restaurantPrice || 0)
    const baseAppPrice = Number(price || baseRestPrice)
    setVariants(
      ['Small', 'Medium', 'Large'].map((sName, idx) => ({
        id: crypto.randomUUID(),
        name: sName,
        restaurant_price: baseRestPrice,
        price: baseAppPrice,
        in_stock: true,
        is_default: idx === 0,
      }))
    )
  }

  const updateVariant = (id: string, changes: Partial<MenuItemVariantRecord>) => {
    setVariants((current) =>
      current.map((v) =>
        v.id === id
          ? { ...v, ...changes, ...(changes.is_default ? { is_default: true } : {}) }
          : changes.is_default
            ? { ...v, is_default: false }
            : v
      )
    )
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || price === '' || restaurantPrice === '' || !restaurantId) {
      toast('Please provide dish name, restaurant price, and app price.', 'error')
      return
    }
    if (Number(price) < Number(restaurantPrice)) {
      toast('App selling price cannot be lower than restaurant price.', 'error')
      return
    }
    if (
      variants.some(
        (v) => !v.name.trim() || v.restaurant_price < 0 || v.price < v.restaurant_price
      )
    ) {
      toast('Every size needs a name and an app price at least equal to its restaurant price.', 'error')
      return
    }

    setSubmitting(true)
    const resolvedCat = isCustomCategory ? customCategory.trim() || 'General' : category
    const itemId = editingItem ? editingItem.id : `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    const defaultImg = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'

    const itemData: MenuItemRecord = {
      id: itemId,
      restaurant_id: restaurantId,
      name: name.trim(),
      category: resolvedCat,
      price: Number(price),
      restaurant_price: Number(restaurantPrice),
      description: description.trim(),
      in_stock: inStock,
      image: image.trim() || defaultImg,
      veg: isVeg,
      unit: unit.trim() || null,
      stock_count: stockCount !== '' ? Number(stockCount) : 0,
      sku_code: skuCode.trim() || null,
      hsn_sac_code: hsnSac.trim() || '996331',
      price_tax_mode: priceTaxMode,
      expiry_date: expiryDate || null,
      variants: variants.map((v, idx) => ({
        ...v,
        is_default: variants.some((entry) => entry.is_default) ? v.is_default : idx === 0,
      })),
    }

    try {
      const payload = {
        id: itemId,
        restaurant_id: restaurantId,
        name: itemData.name,
        category: itemData.category,
        price: itemData.price,
        restaurant_price: itemData.restaurant_price,
        description: itemData.description || null,
        image: itemData.image || null,
        in_stock: itemData.in_stock,
        is_veg: itemData.veg ?? true,
        unit: itemData.unit || null,
        mrp: null,
        stock_count: itemData.stock_count || 0,
        sku_code: itemData.sku_code || null,
        hsn_sac_code: itemData.hsn_sac_code || '996331',
        price_tax_mode: itemData.price_tax_mode || 'TAX_INCLUSIVE',
        expiry_date: itemData.expiry_date || null,
        variants: itemData.variants,
      }

      const res = await fetch('/api/menu-items', {
        method: editingItem ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        throw new Error(await res.text())
      }

      const result = await res.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to save menu item')
      }

      let savedItem = itemData
      if (result.item) {
        savedItem = {
          ...itemData,
          price: Number(result.item.price),
          restaurant_price: Number(result.item.restaurant_price ?? result.item.price),
          variants: Array.isArray(result.item.variants)
            ? result.item.variants.map((v: any) => ({
                id: v.id,
                name: v.name,
                restaurant_price: Number(v.restaurant_price),
                price: Number(v.price),
                in_stock: v.in_stock !== false,
                is_default: v.is_default === true,
              }))
            : [],
        }
      }

      onSaved(savedItem, !!editingItem)
      toast(editingItem ? `Updated dish '${savedItem.name}'!` : `Added '${savedItem.name}' to menu!`, 'success')
      onClose()
    } catch (err: any) {
      toast(err.message || 'Could not save dish.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-[#121815] border border-stone-200 dark:border-[#233027] p-6 sm:p-7 shadow-2xl max-h-[92vh] overflow-y-auto text-[#121815] dark:text-white custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-[#202b24] pb-4">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#86a018] dark:text-[#d9f447] flex items-center gap-1.5">
              <Sparkles className="size-3" />
              {editingItem ? 'Edit Dish Details' : 'Create New Menu Item'}
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-[#121815] dark:text-white mt-0.5">
              {editingItem ? editingItem.name : 'Add Dish to Menu'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full bg-stone-100 dark:bg-[#1c2620] text-stone-500 dark:text-gray-400 hover:bg-stone-200 dark:hover:bg-[#25332a] cursor-pointer transition"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5 text-xs">
          {/* Dietary Indicator */}
          <div>
            <label className="font-bold text-stone-700 dark:text-gray-200 block mb-1.5">
              Dietary Classification <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsVeg(true)}
                className={`flex items-center justify-center gap-2 rounded-2xl p-3 border font-extrabold transition cursor-pointer ${
                  isVeg
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shadow-sm ring-1 ring-emerald-500'
                    : 'border-stone-200 dark:border-[#233027] bg-stone-50 dark:bg-[#0d1210] text-stone-600 dark:text-gray-400 hover:border-emerald-500/40'
                }`}
              >
                <span className="grid size-4 place-items-center rounded-sm border border-emerald-600 dark:border-emerald-400 p-0.5">
                  <span className="size-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                </span>
                <span>Pure Veg</span>
                {isVeg && <Check className="size-3.5 text-emerald-600 ml-1" />}
              </button>

              <button
                type="button"
                onClick={() => setIsVeg(false)}
                className={`flex items-center justify-center gap-2 rounded-2xl p-3 border font-extrabold transition cursor-pointer ${
                  !isVeg
                    ? 'border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-400 shadow-sm ring-1 ring-rose-500'
                    : 'border-stone-200 dark:border-[#233027] bg-stone-50 dark:bg-[#0d1210] text-stone-600 dark:text-gray-400 hover:border-rose-500/40'
                }`}
              >
                <span className="grid size-4 place-items-center rounded-sm border border-rose-600 dark:border-rose-400 p-0.5">
                  <span className="size-2 rounded-full bg-rose-600 dark:bg-rose-400" />
                </span>
                <span>Non-Veg</span>
                {!isVeg && <Check className="size-3.5 text-rose-600 ml-1" />}
              </button>
            </div>
          </div>

          {/* Dish Name */}
          <div>
            <label className="font-bold text-stone-700 dark:text-gray-200">
              Dish Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Classic Hyderabadi Dum Biryani"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-stone-200 dark:border-[#233027] bg-stone-50 dark:bg-[#0d1210] p-3 font-medium text-[#121815] dark:text-white outline-none focus:border-[#86a018] dark:focus:border-[#d9f447]"
            />
          </div>

          {/* Category & Portion Size */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between">
                <label className="font-bold text-stone-700 dark:text-gray-200">
                  Category <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomCategory(!isCustomCategory)}
                  className="text-[10px] font-bold text-[#86a018] dark:text-[#d9f447] hover:underline cursor-pointer"
                >
                  {isCustomCategory ? 'Choose from List' : '+ Custom Category'}
                </button>
              </div>

              {!isCustomCategory ? (
                <select
                  value={category}
                  onChange={(e) => {
                    if (e.target.value === '__CUSTOM__') {
                      setIsCustomCategory(true)
                    } else {
                      setCategory(e.target.value)
                    }
                  }}
                  className="mt-1.5 w-full rounded-xl border border-stone-200 dark:border-[#233027] bg-stone-50 dark:bg-[#0d1210] p-3 font-medium text-[#121815] dark:text-white outline-none focus:border-[#86a018] dark:focus:border-[#d9f447] cursor-pointer"
                >
                  {MENU_CATEGORY_GROUPS.map((group) => (
                    <optgroup
                      key={group.group}
                      label={group.group}
                      className="bg-white dark:bg-[#121815] text-[#121815] dark:text-white font-bold"
                    >
                      {group.categories.map((cat) => (
                        <option
                          key={cat}
                          value={cat}
                          className="bg-white dark:bg-[#121815] text-[#121815] dark:text-white font-normal"
                        >
                          {cat}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  <option
                    value="__CUSTOM__"
                    className="bg-white dark:bg-[#121815] text-[#86a018] dark:text-[#d9f447] font-bold"
                  >
                    + Create Custom Category...
                  </option>
                </select>
              ) : (
                <input
                  type="text"
                  required
                  placeholder="e.g. Chef's Daily Special"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#86a018] dark:border-[#d9f447] bg-stone-50 dark:bg-[#0d1210] p-3 font-medium text-[#121815] dark:text-white outline-none"
                />
              )}
            </div>

            <div>
              <label className="font-bold text-stone-700 dark:text-gray-200">
                Portion / Serving Size
              </label>
              <input
                type="text"
                placeholder="e.g. Serves 1-2, 500 ml"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-stone-200 dark:border-[#233027] bg-stone-50 dark:bg-[#0d1210] p-3 font-medium text-[#121815] dark:text-white outline-none focus:border-[#86a018] dark:focus:border-[#d9f447]"
              />
              <div className="mt-1.5 flex flex-wrap gap-1">
                {PORTION_PRESETS.slice(0, 5).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setUnit(preset)}
                    className={`rounded-md px-2 py-0.5 text-[10px] font-bold transition border cursor-pointer ${
                      unit === preset
                        ? 'bg-[#d9f447] text-[#0d1310] border-[#d9f447]'
                        : 'bg-stone-100 dark:bg-[#1a231e] text-stone-600 dark:text-gray-400 border-stone-200 dark:border-[#28372e]'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-stone-700 dark:text-gray-200">
                Restaurant Price / MRP (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min={0}
                step={1}
                placeholder="e.g. 100"
                value={restaurantPrice}
                onChange={(e) =>
                  setRestaurantPrice(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="mt-1.5 w-full rounded-xl border border-stone-200 dark:border-[#233027] bg-stone-50 dark:bg-[#0d1210] p-3 font-black text-[#121815] dark:text-white outline-none focus:border-[#86a018] dark:focus:border-[#d9f447]"
              />
              <span className="mt-1 block text-[10px] text-stone-400">
                Restaurant amount used for payout
              </span>
            </div>
            <div>
              <label className="font-bold text-stone-700 dark:text-gray-200">
                App Selling Price (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min={1}
                step={1}
                placeholder="e.g. 110"
                value={price}
                onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-stone-200 dark:border-[#233027] bg-stone-50 dark:bg-[#0d1210] p-3 font-black text-[#121815] dark:text-white outline-none focus:border-[#86a018] dark:focus:border-[#d9f447]"
              />
              <span className="mt-1 block text-[10px] text-stone-400">
                Customer price on the app
              </span>
            </div>
          </div>

          {/* Variants */}
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-[#233027] dark:bg-[#0d1210]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-extrabold text-stone-800 dark:text-white">Sizes / Variants</p>
                <p className="text-[10px] text-stone-500 dark:text-gray-400">
                  Optional. Each size has its own restaurant and app price.
                </p>
              </div>
              <div className="flex gap-2">
                {variants.length === 0 && (
                  <button
                    type="button"
                    onClick={addStandardSizes}
                    className="rounded-lg border border-[#86a018] px-3 py-1.5 font-bold text-[#6f840f] dark:border-[#d9f447] dark:text-[#d9f447] cursor-pointer"
                  >
                    + Small / Medium / Large
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    setVariants((cur) => [
                      ...cur,
                      {
                        id: crypto.randomUUID(),
                        name: '',
                        restaurant_price: Number(restaurantPrice || 0),
                        price: Number(price || restaurantPrice || 0),
                        in_stock: true,
                        is_default: cur.length === 0,
                      },
                    ])
                  }
                  className="rounded-lg bg-[#18201c] px-3 py-1.5 font-bold text-white dark:bg-[#d9f447] dark:text-[#18201c] cursor-pointer"
                >
                  + Add size
                </button>
              </div>
            </div>

            {variants.length > 0 && (
              <div className="mt-3 space-y-2">
                {variants.map((variant) => (
                  <div
                    key={variant.id}
                    className="grid grid-cols-1 gap-2 rounded-xl border border-stone-200 bg-white p-3 dark:border-[#28372e] dark:bg-[#121815] sm:grid-cols-[1fr_1fr_1fr_auto]"
                  >
                    <input
                      placeholder="Size name"
                      value={variant.name}
                      onChange={(e) => updateVariant(variant.id, { name: e.target.value })}
                      className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 font-bold text-[#121815] outline-none dark:border-[#233027] dark:bg-[#0d1210] dark:text-white"
                    />
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={variant.restaurant_price}
                      onChange={(e) => updateVariant(variant.id, { restaurant_price: Number(e.target.value) })}
                      className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 font-bold text-[#121815] outline-none dark:border-[#233027] dark:bg-[#0d1210] dark:text-white"
                      placeholder="Restaurant ₹"
                    />
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={variant.price}
                      onChange={(e) => updateVariant(variant.id, { price: Number(e.target.value) })}
                      className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 font-bold text-[#121815] outline-none dark:border-[#233027] dark:bg-[#0d1210] dark:text-white"
                      placeholder="App ₹"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <label className="flex items-center gap-1 text-[10px] font-bold text-stone-500 cursor-pointer">
                        <input
                          type="radio"
                          name="default-variant"
                          checked={variant.is_default}
                          onChange={() => updateVariant(variant.id, { is_default: true })}
                        />
                        Default
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setVariants((cur) => {
                            const remaining = cur.filter((item) => item.id !== variant.id)
                            if (remaining.length > 0 && !remaining.some((item) => item.is_default)) {
                              remaining[0] = { ...remaining[0], is_default: true }
                            }
                            return remaining
                          })
                        }
                        className="grid size-8 place-items-center rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Commercial & Inventory */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="font-bold text-stone-700 dark:text-gray-200">HSN/SAC Code</label>
              <input
                type="text"
                value={hsnSac}
                onChange={(e) => setHsnSac(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-stone-200 dark:border-[#233027] bg-stone-50 dark:bg-[#0d1210] p-3 font-mono font-bold text-[#121815] dark:text-white outline-none focus:border-[#86a018]"
                placeholder="996331"
              />
            </div>

            <div>
              <label className="font-bold text-stone-700 dark:text-gray-200">Stock Units</label>
              <input
                type="number"
                min={0}
                value={stockCount}
                onChange={(e) => setStockCount(e.target.value === '' ? '' : Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-stone-200 dark:border-[#233027] bg-stone-50 dark:bg-[#0d1210] p-3 font-bold text-[#121815] dark:text-white outline-none focus:border-[#86a018]"
                placeholder="50"
              />
            </div>

            <div>
              <label className="font-bold text-stone-700 dark:text-gray-200">SKU Code (Optional)</label>
              <input
                type="text"
                value={skuCode}
                onChange={(e) => setSkuCode(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-stone-200 dark:border-[#233027] bg-stone-50 dark:bg-[#0d1210] p-3 font-mono text-[#121815] dark:text-white outline-none focus:border-[#86a018]"
                placeholder="BRY-101"
              />
            </div>

            <div>
              <label className="font-bold text-stone-700 dark:text-gray-200">Expiry (Optional)</label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-stone-200 dark:border-[#233027] bg-stone-50 dark:bg-[#0d1210] p-3 font-bold text-[#121815] dark:text-white outline-none focus:border-[#86a018]"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="font-bold text-stone-700 dark:text-gray-200">Description</label>
            <textarea
              rows={2}
              placeholder="e.g. Fragrant aged basmati rice cooked with fresh paneer cubes and saffron..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-stone-200 dark:border-[#233027] bg-stone-50 dark:bg-[#0d1210] p-3 font-medium text-[#121815] dark:text-white outline-none focus:border-[#86a018]"
            />
          </div>

          {/* Image URL & Presets */}
          <div>
            <label className="font-bold text-stone-700 dark:text-gray-200">Dish Image URL</label>
            <div className="flex gap-3 items-center mt-1.5">
              <input
                type="url"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://..."
                className="flex-1 rounded-xl border border-stone-200 dark:border-[#233027] bg-stone-50 dark:bg-[#0d1210] p-3 font-mono text-[11px] text-[#121815] dark:text-white outline-none focus:border-[#86a018]"
              />
              <div className="size-11 rounded-xl overflow-hidden border border-stone-200 dark:border-[#233027] bg-stone-100 dark:bg-[#171f1b] shrink-0 grid place-items-center">
                {image ? (
                  <img src={image} alt="Preview" className="size-full object-cover" />
                ) : (
                  <ImageIcon className="size-5 text-stone-400 dark:text-gray-500" />
                )}
              </div>
            </div>

            <div className="mt-2 rounded-xl bg-stone-50 dark:bg-[#0d1210] p-2.5 border border-stone-200/70 dark:border-[#202b24]">
              <span className="text-[10px] font-bold text-stone-500 dark:text-gray-400 block mb-1.5">
                Quick Sample Photos:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_IMAGE_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setImage(preset.url)}
                    className={`rounded-lg px-2 py-1 text-[10px] font-bold transition border cursor-pointer ${
                      image === preset.url
                        ? 'bg-[#d9f447] text-[#0d1310] border-[#d9f447]'
                        : 'bg-white dark:bg-[#171f1b] text-stone-700 dark:text-gray-300 border-stone-200 dark:border-[#27352d]'
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* In-Stock Toggle */}
          <div className="flex items-center justify-between rounded-2xl bg-stone-50 dark:bg-[#171f1b] p-4 border border-stone-200 dark:border-[#233027]">
            <div>
              <span className="font-extrabold text-sm text-[#121815] dark:text-white block">
                Live In-Stock Availability
              </span>
              <p className="text-[11px] text-stone-500 dark:text-gray-400 mt-0.5">
                When active, customers can order this dish immediately.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setInStock(!inStock)}
              className={`px-5 py-2 rounded-full font-black text-xs transition cursor-pointer shadow-sm ${
                inStock
                  ? 'bg-emerald-500 text-[#0d1310] hover:bg-emerald-400'
                  : 'bg-rose-500 text-white hover:bg-rose-600'
              }`}
            >
              {inStock ? '✓ In Stock' : '✕ Out of Stock'}
            </button>
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-stone-100 dark:border-[#202b24]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-stone-200 dark:border-[#2a382e] bg-stone-100 dark:bg-[#1a231e] px-6 py-2.5 font-bold text-stone-700 dark:text-gray-300 hover:text-stone-900 dark:hover:text-white transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-[#d9f447] px-8 py-2.5 font-black text-[#0d1310] shadow-md hover:bg-[#c8e434] active:scale-95 transition cursor-pointer text-xs"
            >
              {submitting ? 'Saving...' : editingItem ? 'Save Dish Changes' : 'Add Dish to Menu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
