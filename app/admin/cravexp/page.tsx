'use client'

import CraveLogo from '@/components/CraveLogo'
import AddEditXPProductModal from '@/components/cravexp/AddEditXPProductModal'
import AddXPStoreModal from '@/components/cravexp/AddXPStoreModal'
import {
  emptyProductForm,
  emptyStoreForm,
  type XPProduct,
  type XPStore,
} from '@/components/cravexp/admin-types'
import CameraBarcodeScannerModal from '@/components/cravexp/CameraBarcodeScannerModal'
import { generateCraveXPSku, normalizeCraveXPBarcode } from '@/lib/cravexp-product-code'
import { useToast } from '@/lib/toast-context'
import {
  Boxes,
  Edit3,
  ImageIcon,
  PackageOpen,
  Plus,
  RefreshCw,
  Search,
  Store,
  Trash2,
  Warehouse,
} from 'lucide-react'
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'

const CUSTOMER_CATALOG_STORE_ID = 'cravexp_dark_store_01'

export type { XPProduct, XPStore }

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
              <label className="relative block w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search XP stores…"
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-xs font-medium outline-none transition focus:border-[#86a018] dark:border-[#27342d] dark:bg-[#18201c]"
                />
              </label>
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
                      store.is_open ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'
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
              <div className="col-span-full grid min-h-44 place-items-center rounded-2xl border border-dashed border-gray-300 bg-white/50 p-8 text-center dark:border-[#27342d] dark:bg-[#18201c]/50">
                <div>
                  <Warehouse className="mx-auto size-7 text-gray-300 dark:text-gray-600" />
                  <p className="mt-2 text-xs font-bold text-gray-500 dark:text-gray-400">
                    No XP stores match your search.
                  </p>
                </div>
              </div>
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
                <label className="relative block w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search product, SKU, or barcode…"
                    className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-xs font-medium outline-none transition focus:border-[#86a018] dark:border-[#27342d] dark:bg-[#18201c]"
                  />
                </label>
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
                <div className="col-span-full grid min-h-44 place-items-center rounded-2xl border border-dashed border-gray-300 bg-white/50 p-8 text-center dark:border-[#27342d] dark:bg-[#18201c]/50">
                  <div>
                    <Boxes className="mx-auto size-7 text-gray-300 dark:text-gray-600" />
                    <p className="mt-2 text-xs font-bold text-gray-500 dark:text-gray-400">
                      No XP products match your search.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Reusable Camera Barcode Scanner Modal */}
      <CameraBarcodeScannerModal
        isOpen={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
        onScan={handleBarcodeScanned}
      />

      {/* Add XP Store Modal */}
      <AddXPStoreModal
        isOpen={isStoreModalOpen}
        onClose={() => setIsStoreModalOpen(false)}
        storeForm={storeForm}
        setStoreForm={setStoreForm}
        submitting={submitting}
        onSubmit={createStore}
      />

      {/* Add / Edit XP Product Modal */}
      <AddEditXPProductModal
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false)
          resetProductForm()
        }}
        productForm={productForm}
        setProductForm={setProductForm}
        editingProductId={editingProductId}
        generatedSku={generatedSku}
        submitting={submitting}
        onOpenBarcodeScanner={() => setIsBarcodeScannerOpen(true)}
        onSubmit={saveProduct}
      />
    </div>
  )
}
