'use client'

import CraveLogo from '@/components/CraveLogo'
import { apiFetch } from '@/lib/client/api-fetch'
import { generateCraveXPSku, normalizeCraveXPBarcode } from '@/lib/cravexp-product-code'
import { useToast } from '@/lib/toast-context'
import dynamic from 'next/dynamic'
import {
  AlertTriangle,
  Boxes,
  Camera,
  CheckCircle2,
  Edit3,
  ImageIcon,
  MapPin,
  PackageOpen,
  Plus,
  RefreshCw,
  ScanLine,
  Search,
  Store,
  Trash2,
  Warehouse,
  X,
} from 'lucide-react'
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'

const CUSTOMER_CATALOG_STORE_ID = 'cravexp_dark_store_01'
const LocationPickerMap = dynamic(() => import('@/components/LocationPickerMap'), { ssr: false })

interface XPStore {
  id: string
  name: string
  address?: string | null
  phone?: string | null
  owner_id?: string | null
  is_open: boolean
  delivery_minutes?: number | null
  image?: string | null
  latitude?: number | null
  longitude?: number | null
}

interface XPProduct {
  id: string
  name: string
  unit: string
  price: number
  mrp: number
  image: string
  category: string
  inStock: boolean
  stockCount: number
  skuCode: string
  barcode?: string
}

const emptyStoreForm = {
  ownerName: '',
  email: '',
  password: '',
  storeName: '',
  address: '',
  phone: '',
  latitude: 12.971599,
  longitude: 77.594566,
}

const emptyProductForm = {
  name: '',
  category: 'Grocery Essentials',
  unit: '1 Pack',
  price: '',
  mrp: '',
  stockCount: '50',
  barcode: '',
  image: '',
  inStock: true,
}

export default function AdminCraveXPPage() {
  const { toast } = useToast()
  const [activeView, setActiveView] = useState<'stores' | 'products'>('stores')
  const [stores, setStores] = useState<XPStore[]>([])
  const [products, setProducts] = useState<XPProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [storeForm, setStoreForm] = useState(emptyStoreForm)
  const [productForm, setProductForm] = useState(emptyProductForm)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false)

  const generatedSku = useMemo(
    () =>
      generateCraveXPSku({
        name: productForm.name,
        category: productForm.category,
        unit: productForm.unit,
        barcode: productForm.barcode,
      }),
    [productForm.barcode, productForm.category, productForm.name, productForm.unit]
  )

  const loadData = useCallback(async () => {
    setLoading(true)
    const errors: string[] = []
    try {
      const [storesResult, productsResult] = await Promise.allSettled([
        fetch('/api/restaurants?isDarkStore=true', { cache: 'no-store' }),
        fetch('/api/cravexp/catalog', { cache: 'no-store' }),
      ])

      if (storesResult.status === 'fulfilled') {
        const storesPayload = await storesResult.value.json()
        if (storesResult.value.ok) {
          setStores(Array.isArray(storesPayload.restaurants) ? storesPayload.restaurants : [])
        } else {
          errors.push(storesPayload.error || 'Unable to load XP stores')
        }
      } else {
        errors.push('Unable to load XP stores')
      }

      if (productsResult.status === 'fulfilled') {
        const productsPayload = await productsResult.value.json()
        if (productsResult.value.ok) {
          setProducts(Array.isArray(productsPayload.items) ? productsPayload.items : [])
        } else {
          errors.push(productsPayload.error || 'Unable to load XP products')
        }
      } else {
        errors.push('Unable to load XP products')
      }

      if (errors.length) toast(errors.join('. '), 'error')
    } catch (error) {
      toast(
        error instanceof Error ? error.message : 'Unable to load CraveXP management data',
        'error'
      )
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    if (!isStoreModalOpen && !isProductModalOpen && !isBarcodeScannerOpen) return
    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || submitting) return
      if (isBarcodeScannerOpen) {
        setIsBarcodeScannerOpen(false)
      } else if (isProductModalOpen) {
        setIsProductModalOpen(false)
        setEditingProductId(null)
        setProductForm(emptyProductForm)
      } else {
        setIsStoreModalOpen(false)
      }
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [isBarcodeScannerOpen, isProductModalOpen, isStoreModalOpen, submitting])

  const filteredStores = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return stores
    return stores.filter(
      (store) =>
        store.name.toLowerCase().includes(query) ||
        store.address?.toLowerCase().includes(query) ||
        store.phone?.toLowerCase().includes(query)
    )
  }, [search, stores])

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return products
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query) ||
        product.skuCode.toLowerCase().includes(query) ||
        product.barcode?.toLowerCase().includes(query)
    )
  }, [products, search])

  async function createStore(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      const response = await fetch('/api/admin/create-vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: storeForm.ownerName,
          email: storeForm.email,
          password: storeForm.password,
          storeName: storeForm.storeName,
          vendorType: 'CraveXP Store Vendor',
          cuisine: 'CraveXP Dark Store Grocery',
          address: storeForm.address,
          phone: storeForm.phone,
          latitude: storeForm.latitude,
          longitude: storeForm.longitude,
          commissionRate: 15,
          paymentModel: 'commission',
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Unable to create XP store')

      toast(`${storeForm.storeName} was added to the CraveXP network.`)
      setStoreForm(emptyStoreForm)
      setIsStoreModalOpen(false)
      await loadData()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Unable to create XP store', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleStore(store: XPStore) {
    try {
      const response = await fetch('/api/restaurants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: store.id, is_open: !store.is_open }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Unable to update store')
      setStores((current) =>
        current.map((entry) =>
          entry.id === store.id ? { ...entry, is_open: !store.is_open } : entry
        )
      )
      toast(`${store.name} is now ${store.is_open ? 'offline' : 'open'}.`)
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Unable to update store', 'error')
    }
  }

  async function deleteStore(store: XPStore) {
    if (store.id === CUSTOMER_CATALOG_STORE_ID) {
      toast('The customer catalog hub cannot be deleted.', 'info')
      return
    }
    if (!window.confirm(`Delete ${store.name}? Historical stores will be safely deactivated.`))
      return

    try {
      const response = await fetch('/api/admin/delete-vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId: store.id, userId: store.owner_id }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Unable to remove store')
      setStores((current) => current.filter((entry) => entry.id !== store.id))
      toast(payload.message || `${store.name} was removed.`)
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Unable to remove store', 'error')
    }
  }

  function beginEditProduct(product: XPProduct) {
    setEditingProductId(product.id)
    setProductForm({
      name: product.name,
      category: product.category,
      unit: product.unit,
      price: String(product.price),
      mrp: String(product.mrp),
      stockCount: String(product.stockCount),
      barcode: product.barcode || '',
      image: product.image,
      inStock: product.inStock,
    })
    setIsProductModalOpen(true)
  }

  function resetProductForm() {
    setEditingProductId(null)
    setProductForm(emptyProductForm)
  }

  function openNewProductModal() {
    resetProductForm()
    setIsProductModalOpen(true)
  }

  function closeProductModal() {
    if (submitting) return
    setIsBarcodeScannerOpen(false)
    setIsProductModalOpen(false)
    resetProductForm()
  }

  const handleBarcodeScanned = useCallback(
    (code: string) => {
      const barcode = normalizeCraveXPBarcode(code)
      if (!barcode) return
      setProductForm((current) => ({ ...current, barcode }))
      setIsBarcodeScannerOpen(false)
      toast(`Barcode ${barcode} added to the product.`)
    },
    [toast]
  )

  async function saveProduct(event: FormEvent) {
    event.preventDefault()
    const price = Number(productForm.price)
    const mrp = productForm.mrp ? Number(productForm.mrp) : price
    const stockCount = Number(productForm.stockCount)
    if (!Number.isInteger(price) || price < 0 || !Number.isInteger(mrp) || mrp < price) {
      toast(
        'Enter whole-number prices; MRP must be equal to or higher than the selling price.',
        'error'
      )
      return
    }
    if (!Number.isInteger(stockCount) || stockCount < 0) {
      toast('Stock count must be a non-negative whole number.', 'error')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/admin/cravexp-products', {
        method: editingProductId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingProductId ? { id: editingProductId } : { id: crypto.randomUUID() }),
          name: productForm.name.trim(),
          category: productForm.category.trim(),
          unit: productForm.unit.trim(),
          price,
          mrp,
          stock_count: stockCount,
          sku_code: generatedSku,
          barcode: normalizeCraveXPBarcode(productForm.barcode) || null,
          image: productForm.image.trim() || null,
          in_stock: productForm.inStock && stockCount > 0,
          is_veg: true,
          description: `${productForm.category.trim()} · ${productForm.unit.trim()}`,
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Unable to save product')

      toast(`${productForm.name} is now available in the customer XP catalog.`)
      setIsProductModalOpen(false)
      resetProductForm()
      await loadData()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Unable to save product', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteProduct(product: XPProduct) {
    if (!window.confirm(`Remove ${product.name} from the customer XP store?`)) return
    try {
      const response = await fetch(
        `/api/admin/cravexp-products?id=${encodeURIComponent(product.id)}`,
        { method: 'DELETE' }
      )
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Unable to remove product')
      setProducts((current) => current.filter((entry) => entry.id !== product.id))
      toast(`${product.name} was removed from the customer XP catalog.`)
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Unable to remove product', 'error')
    }
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <section className="overflow-hidden rounded-3xl border border-[#27342d] bg-[#121815] p-5 text-white shadow-xl sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CraveLogo variant="cravexp" size="lg" theme="light" />
            <h2 className="mt-3 text-xl font-black tracking-tight sm:text-2xl">
              Store &amp; Customer Catalog Management
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-white/60 sm:text-sm">
              Operational dark stores and customer-facing products are managed separately. Only
              products in Manage Products appear in the user CraveXP storefront.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw className={`size-4 text-[#d9f447] ${loading ? 'animate-spin' : ''}`} />
            Refresh XP Data
          </button>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm dark:border-[#27342d] dark:bg-[#18201c] sm:max-w-xl">
        <button
          type="button"
          onClick={() => {
            setActiveView('stores')
            setSearch('')
          }}
          className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-extrabold transition ${
            activeView === 'stores'
              ? 'bg-[#18201c] text-white dark:bg-[#d9f447] dark:text-[#121815]'
              : 'text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5'
          }`}
        >
          <Warehouse className="size-4" /> Manage Stores
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveView('products')
            setSearch('')
          }}
          className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-extrabold transition ${
            activeView === 'products'
              ? 'bg-[#18201c] text-white dark:bg-[#d9f447] dark:text-[#121815]'
              : 'text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5'
          }`}
        >
          <PackageOpen className="size-4" /> Manage Products
        </button>
      </div>

      {activeView === 'stores' ? (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-black">XP Fulfillment Stores</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Control operational locations without mixing them into User Accounts.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <SearchBox value={search} onChange={setSearch} placeholder="Search XP stores…" />
              <button
                type="button"
                onClick={() => setIsStoreModalOpen(true)}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#18201c] px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-black dark:bg-[#d9f447] dark:text-[#121815] dark:hover:bg-[#c8e13d]"
              >
                <Plus className="size-4" /> Add XP Store
              </button>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredStores.map((store) => (
              <article
                key={store.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-[#27342d] dark:bg-[#18201c]"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#d9f447] text-[#121815]">
                    <Store className="size-5" />
                  </span>
                  <span
                    className={`text-xs font-bold uppercase ${
                      store.is_open
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-gray-400'
                    }`}
                  >
                    {store.is_open ? 'Open' : 'Offline'}
                  </span>
                </div>
                <h4 className="mt-3 font-black">{store.name}</h4>
                <p className="mt-1 min-h-8 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
                  {store.address || 'Address not configured'}
                </p>
                {store.id === CUSTOMER_CATALOG_STORE_ID && (
                  <span className="mt-3 block text-[10px] font-bold uppercase text-purple-600 dark:text-purple-400">
                    Customer catalog hub
                  </span>
                )}
                <div className="mt-4 flex gap-2 border-t border-gray-100 pt-3 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => void toggleStore(store)}
                    className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-[11px] font-bold transition hover:bg-gray-50 dark:border-[#27342d] dark:hover:bg-white/5"
                  >
                    {store.is_open ? 'Take Offline' : 'Open Store'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteStore(store)}
                    disabled={store.id === CUSTOMER_CATALOG_STORE_ID}
                    className="grid size-9 place-items-center rounded-xl border border-rose-200 text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-30 dark:border-rose-500/30 dark:hover:bg-rose-500/10"
                    aria-label={`Delete ${store.name}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </article>
            ))}
            {!loading && filteredStores.length === 0 && (
              <EmptyState icon={Warehouse} message="No XP stores match your search." />
            )}
          </div>
        </section>
      ) : (
        <div className="space-y-6">
          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-black">Customer XP Products</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  These {products.length} products are loaded by the user&apos;s `/user/cravexp`
                  storefront.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <SearchBox
                  value={search}
                  onChange={setSearch}
                  placeholder="Search product, SKU, or barcode…"
                />
                <button
                  type="button"
                  onClick={openNewProductModal}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#18201c] px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-black dark:bg-[#d9f447] dark:text-[#121815] dark:hover:bg-[#c8e13d]"
                >
                  <Plus className="size-4" /> Add Item
                </button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {filteredProducts.map((product) => (
                <article
                  key={product.id}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-[#27342d] dark:bg-[#18201c]"
                >
                  <div className="grid aspect-[16/10] place-items-center overflow-hidden bg-gray-100 dark:bg-[#121815]">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="size-full object-cover transition duration-300 hover:scale-105"
                      />
                    ) : (
                      <ImageIcon className="size-8 text-gray-300 dark:text-gray-600" />
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-black">{product.name}</p>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                          {product.category} · {product.unit}
                        </p>
                      </div>
                      <span
                        className={`text-[10px] font-bold shrink-0 ${product.inStock ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                      >
                        {product.inStock ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </div>
                    <div className="mt-3 flex items-end justify-between">
                      <div>
                        <span className="text-lg font-black">₹{product.price}</span>
                        {product.mrp > product.price && (
                          <span className="ml-2 text-xs text-gray-400 line-through">
                            ₹{product.mrp}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                        {product.stockCount} in stock
                      </span>
                    </div>
                    <div className="mt-3 space-y-1 rounded-xl bg-gray-50 px-3 py-2 font-mono text-[9px] text-gray-500 dark:bg-[#121815] dark:text-gray-400">
                      <p className="truncate" title={product.skuCode}>
                        SKU: {product.skuCode}
                      </p>
                      <p className="truncate" title={product.barcode || 'Not assigned'}>
                        Barcode: {product.barcode || 'Not assigned'}
                      </p>
                    </div>
                    <div className="mt-4 flex gap-2 border-t border-gray-100 pt-3 dark:border-white/5">
                      <button
                        type="button"
                        onClick={() => beginEditProduct(product)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-[11px] font-bold transition hover:bg-gray-50 dark:border-[#27342d] dark:hover:bg-white/5"
                      >
                        <Edit3 className="size-3.5" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteProduct(product)}
                        className="grid size-9 place-items-center rounded-xl border border-rose-200 text-rose-600 transition hover:bg-rose-50 dark:border-rose-500/30 dark:hover:bg-rose-500/10"
                        aria-label={`Delete ${product.name}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
              {!loading && filteredProducts.length === 0 && (
                <EmptyState icon={Boxes} message="No XP products match your search." />
              )}
            </div>
          </section>
        </div>
      )}

      {isProductModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="xp-product-dialog-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeProductModal()
          }}
        >
          <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-[#27342d] dark:bg-[#18201c]">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 bg-gray-50/80 px-5 py-4 dark:border-white/5 dark:bg-[#121815] sm:px-6">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#d9f447] text-[#121815] shadow-sm">
                  <PackageOpen className="size-5" />
                </span>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#6f8817] dark:text-[#d9f447]">
                    Customer-facing master catalog
                  </span>
                  <h3 id="xp-product-dialog-title" className="mt-0.5 text-lg font-black">
                    {editingProductId ? 'Edit XP Product' : 'Add XP Product'}
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {editingProductId
                      ? 'Update the item shown in the customer CraveXP storefront.'
                      : 'Create an item in the dedicated XP product catalog.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeProductModal}
                disabled={submitting}
                className="grid size-9 shrink-0 place-items-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-100 disabled:opacity-40 dark:border-[#27342d] dark:bg-[#18201c] dark:hover:bg-white/5"
                aria-label="Close product dialog"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={saveProduct} className="max-h-[78vh] overflow-y-auto p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <ProductInput
                  label="Product name"
                  value={productForm.name}
                  onChange={(value) => setProductForm((current) => ({ ...current, name: value }))}
                  placeholder="Organic eggs"
                  required
                />
                <ProductInput
                  label="Category"
                  value={productForm.category}
                  onChange={(value) =>
                    setProductForm((current) => ({ ...current, category: value }))
                  }
                  placeholder="Dairy & Eggs"
                  required
                />
                <ProductInput
                  label="Unit"
                  value={productForm.unit}
                  onChange={(value) => setProductForm((current) => ({ ...current, unit: value }))}
                  placeholder="6 Pieces"
                  required
                />
                <label className="block text-xs font-bold">
                  SKU code
                  <input
                    type="text"
                    value={generatedSku}
                    readOnly
                    aria-describedby="generated-sku-help"
                    className="mt-1.5 w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 font-mono text-[11px] font-bold text-gray-600 outline-none dark:border-[#27342d] dark:bg-[#121815] dark:text-gray-300"
                  />
                  <span
                    id="generated-sku-help"
                    className="mt-1 block text-[9px] font-medium text-gray-400"
                  >
                    Generated from product details and barcode
                  </span>
                </label>
                <ProductInput
                  label="Selling price (₹)"
                  type="number"
                  value={productForm.price}
                  onChange={(value) => setProductForm((current) => ({ ...current, price: value }))}
                  placeholder="89"
                  required
                />
                <ProductInput
                  label="MRP (₹)"
                  type="number"
                  value={productForm.mrp}
                  onChange={(value) => setProductForm((current) => ({ ...current, mrp: value }))}
                  placeholder="110"
                />
                <ProductInput
                  label="Stock count"
                  type="number"
                  value={productForm.stockCount}
                  onChange={(value) =>
                    setProductForm((current) => ({ ...current, stockCount: value }))
                  }
                  placeholder="50"
                  required
                />
                <ProductInput
                  label="Image URL"
                  value={productForm.image}
                  onChange={(value) => setProductForm((current) => ({ ...current, image: value }))}
                  placeholder="https://…"
                />
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
                      onClick={() => setIsBarcodeScannerOpen(true)}
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
                  onClick={closeProductModal}
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
      )}

      <CameraBarcodeScannerModal
        isOpen={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
        onScan={handleBarcodeScanned}
      />

      {isStoreModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-xp-store-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !submitting) setIsStoreModalOpen(false)
          }}
        >
          <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-[#27342d] dark:bg-[#18201c]">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 bg-gray-50/80 px-5 py-4 dark:border-white/5 dark:bg-[#121815] sm:px-6">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#d9f447] text-[#121815] shadow-sm">
                  <Warehouse className="size-5" />
                </span>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#6f8817] dark:text-[#d9f447]">
                    New fulfillment location
                  </span>
                  <h3 id="add-xp-store-title" className="mt-0.5 text-lg font-black">
                    Add XP Store
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    Create the store and its manager login in one secure workflow.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStoreModalOpen(false)}
                disabled={submitting}
                className="grid size-9 shrink-0 place-items-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-100 disabled:opacity-40 dark:border-[#27342d] dark:bg-[#18201c] dark:hover:bg-white/5"
                aria-label="Close add store dialog"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={createStore} className="max-h-[75vh] overflow-y-auto p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  ['storeName', 'Store name', 'CraveXP Jayanagar'],
                  ['ownerName', 'Manager name', 'Store manager'],
                  ['email', 'Manager email', 'manager@crave.com'],
                  ['password', 'Temporary password', 'Minimum 8 characters'],
                  ['phone', 'Phone', '+91 98765 43210'],
                  ['address', 'Store address', 'Bengaluru, Karnataka'],
                ].map(([field, label, placeholder]) => (
                  <label
                    key={field}
                    className={`block text-xs font-bold ${field === 'address' ? 'sm:col-span-2' : ''}`}
                  >
                    {label}
                    <input
                      type={
                        field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'
                      }
                      required={!['phone'].includes(field)}
                      minLength={field === 'password' ? 8 : undefined}
                      value={storeForm[field as keyof typeof storeForm]}
                      onChange={(event) =>
                        setStoreForm((current) => ({ ...current, [field]: event.target.value }))
                      }
                      placeholder={placeholder}
                      className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-medium outline-none transition focus:border-[#86a018] focus:ring-4 focus:ring-[#d9f447]/15 dark:border-[#27342d] dark:bg-[#121815]"
                    />
                  </label>
                ))}
              </div>

              <section className="mt-5 space-y-3 rounded-2xl border border-gray-200 bg-gray-50/70 p-3 dark:border-[#27342d] dark:bg-[#121815] sm:p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="flex items-center gap-2 text-xs font-black">
                      <MapPin className="size-4 text-[#86a018] dark:text-[#d9f447]" />
                      Exact store location
                    </h4>
                    <p className="mt-1 text-[10px] leading-relaxed text-gray-500 dark:text-gray-400">
                      Click the map, drag the pin, or use your device location. The coordinates are
                      saved with the XP store.
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-gray-200 bg-white px-3 py-1.5 font-mono text-[10px] font-bold text-gray-600 dark:border-[#27342d] dark:bg-[#18201c] dark:text-gray-300">
                    {storeForm.latitude.toFixed(6)}, {storeForm.longitude.toFixed(6)}
                  </span>
                </div>
                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-[#27342d]">
                  <LocationPickerMap
                    initialLat={storeForm.latitude}
                    initialLng={storeForm.longitude}
                    className="relative h-64 w-full overflow-hidden bg-[#f0f3ec] sm:h-72"
                    onLocationSelect={(latitude, longitude, address) => {
                      setStoreForm((current) => ({
                        ...current,
                        latitude,
                        longitude,
                        ...(address ? { address } : {}),
                      }))
                    }}
                  />
                </div>
              </section>

              <div className="mt-6 flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 dark:border-white/5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsStoreModalOpen(false)}
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
                  <Plus className="size-4" />
                  {submitting ? 'Creating store…' : 'Create XP Store'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

interface CameraBarcodeScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onScan: (code: string) => void
}

interface BarcodeScannerInstance {
  isScanning: boolean
  stop: () => Promise<void>
  clear: () => void
}

function CameraBarcodeScannerModal({ isOpen, onClose, onScan }: CameraBarcodeScannerModalProps) {
  const [manualCode, setManualCode] = useState('')
  const [cameraError, setCameraError] = useState('')
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState('')
  const scannerRef = useRef<BarcodeScannerInstance | null>(null)

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current
    if (!scanner) return
    try {
      if (scanner.isScanning) await scanner.stop()
      scanner.clear()
    } catch {
      // The stream may already be stopped during modal cleanup.
    } finally {
      if (scannerRef.current === scanner) scannerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    setCameraError('')
    setManualCode('')

    const startScanner = async () => {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode')
        const availableCameras = await Html5Qrcode.getCameras()
        if (cancelled) return

        setCameras(availableCameras || [])
        const preferredCamera = availableCameras?.find((camera) =>
          /back|rear|environment/i.test(camera.label)
        )
        const detectedCameraId = preferredCamera?.id || availableCameras?.[0]?.id || ''

        if (!selectedCameraId && detectedCameraId) {
          setSelectedCameraId(detectedCameraId)
          return
        }

        const reader = document.getElementById('admin-xp-barcode-reader')
        if (!reader || cancelled) return

        const scanner = new Html5Qrcode('admin-xp-barcode-reader', {
          verbose: false,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          useBarCodeDetectorIfSupported: true,
        })
        scannerRef.current = scanner as BarcodeScannerInstance
        const cameraTarget = selectedCameraId || { facingMode: 'environment' }

        await scanner.start(
          cameraTarget,
          {
            fps: 15,
            qrbox: (width, height) => ({
              width: Math.floor(width * 0.86),
              height: Math.floor(height * 0.56),
            }),
            aspectRatio: 1.333333,
          },
          (decodedText) => {
            if (cancelled) return
            cancelled = true
            void stopScanner().finally(() => onScan(decodedText))
          },
          () => {}
        )
      } catch (error) {
        console.warn('[admin/cravexp] Barcode camera unavailable:', error)
        if (!cancelled) {
          setCameraError(
            'Camera access is unavailable. Allow camera permission for Crave Admin, or enter the barcode manually.'
          )
        }
      }
    }

    const timer = window.setTimeout(() => void startScanner(), 120)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      void stopScanner()
    }
  }, [isOpen, onScan, selectedCameraId, stopScanner])

  if (!isOpen) return null

  const submitManualCode = (event: FormEvent) => {
    event.preventDefault()
    const barcode = normalizeCraveXPBarcode(manualCode)
    if (!barcode) return
    void stopScanner().finally(() => onScan(barcode))
  }

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="barcode-scanner-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-[#27342d] dark:bg-[#18201c]">
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-gray-100 pb-3 dark:border-white/5">
          <div className="flex items-start gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#d9f447] text-[#121815]">
              <Camera className="size-4" />
            </span>
            <div>
              <h3 id="barcode-scanner-title" className="text-sm font-black">
                Scan product barcode
              </h3>
              <p className="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                Point the rear camera at the code on the packaging.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-100 dark:border-[#27342d] dark:hover:bg-white/5"
            aria-label="Close barcode scanner"
          >
            <X className="size-4" />
          </button>
        </div>

        {cameras.length > 1 && (
          <label className="mb-3 block text-[10px] font-black uppercase tracking-wider text-gray-500">
            Camera
            <select
              value={selectedCameraId}
              onChange={(event) => setSelectedCameraId(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-xs font-semibold normal-case tracking-normal outline-none dark:border-[#27342d] dark:bg-[#121815]"
            >
              {cameras.map((camera) => (
                <option key={camera.id} value={camera.id}>
                  {camera.label || `Camera ${camera.id.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="relative grid min-h-64 place-items-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-950 dark:border-[#27342d]">
          <div id="admin-xp-barcode-reader" className="min-h-64 w-full" />
          {cameraError && (
            <div className="absolute inset-0 grid place-items-center bg-gray-950/95 p-6 text-center">
              <div>
                <AlertTriangle className="mx-auto size-8 text-amber-400" />
                <p className="mt-2 text-xs font-semibold leading-relaxed text-gray-300">
                  {cameraError}
                </p>
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={submitManualCode}
          className="mt-4 border-t border-gray-100 pt-4 dark:border-white/5"
        >
          <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500">
            Manual barcode
            <div className="mt-1.5 flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(event) => setManualCode(event.target.value)}
                placeholder="Type or paste barcode"
                autoComplete="off"
                className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 font-mono text-xs font-medium normal-case tracking-normal outline-none focus:border-[#86a018] dark:border-[#27342d] dark:bg-[#121815]"
              />
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#18201c] px-3 py-2.5 text-[11px] font-black normal-case tracking-normal text-white disabled:opacity-40 dark:bg-[#d9f447] dark:text-[#121815]"
              >
                <ScanLine className="size-3.5" /> Use code
              </button>
            </div>
          </label>
        </form>
      </div>
    </div>
  )
}

function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <label className="relative block w-full sm:max-w-xs">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-xs font-medium outline-none transition focus:border-[#86a018] dark:border-[#27342d] dark:bg-[#18201c]"
      />
    </label>
  )
}

function ProductInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  type?: 'text' | 'number'
  required?: boolean
}) {
  return (
    <label className="block text-xs font-bold">
      {label}
      <input
        type={type}
        min={type === 'number' ? 0 : undefined}
        step={type === 'number' ? 1 : undefined}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-medium outline-none transition focus:border-[#86a018] dark:border-[#27342d] dark:bg-[#121815]"
      />
    </label>
  )
}

function EmptyState({ icon: Icon, message }: { icon: typeof Warehouse; message: string }) {
  return (
    <div className="col-span-full grid min-h-44 place-items-center rounded-2xl border border-dashed border-gray-300 bg-white/50 p-8 text-center dark:border-[#27342d] dark:bg-[#18201c]/50">
      <div>
        <Icon className="mx-auto size-7 text-gray-300 dark:text-gray-600" />
        <p className="mt-2 text-xs font-bold text-gray-500 dark:text-gray-400">{message}</p>
      </div>
    </div>
  )
}
