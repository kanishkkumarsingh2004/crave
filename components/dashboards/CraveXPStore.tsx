'use client'

import React, { useState, useMemo } from 'react'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Zap,
  ShoppingBag,
  ShoppingCart,
  Search,
  Plus,
  Minus,
  ArrowRight,
  Clock,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Trash2,
  MapPin,
  UtensilsCrossed,
  Store,
  ChevronRight,
  Truck,
  RotateCcw
} from 'lucide-react'

export interface GroceryItem {
  id: string
  name: string
  unit: string
  price: number
  mrp: number
  image: string
  category: string
  inStock: boolean
  discount?: string
}

export const SAMPLE_GROCERY_ITEMS: GroceryItem[] = [
  {
    id: 'g1',
    name: 'Amul Taaza Toned Fresh Milk',
    unit: '500 ml',
    price: 27,
    mrp: 28,
    image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=500&q=80',
    category: 'Dairy & Eggs',
    inStock: true,
    discount: '4% OFF',
  },
  {
    id: 'g2',
    name: 'Farm Fresh White Eggs (6 Pcs)',
    unit: '6 units',
    price: 48,
    mrp: 56,
    image: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&w=500&q=80',
    category: 'Dairy & Eggs',
    inStock: true,
    discount: '14% OFF',
  },
  {
    id: 'g3',
    name: 'Harvest Gold 100% Atta Bread',
    unit: '400 g',
    price: 40,
    mrp: 45,
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=500&q=80',
    category: 'Dairy & Eggs',
    inStock: true,
    discount: '11% OFF',
  },
  {
    id: 'g4',
    name: 'Fresh Organic Robusta Bananas',
    unit: '500 g (3-4 pcs)',
    price: 34,
    mrp: 42,
    image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=500&q=80',
    category: 'Fruits & Veggies',
    inStock: true,
    discount: '19% OFF',
  },
  {
    id: 'g5',
    name: 'Fresh Local Hybrid Tomatoes',
    unit: '1 kg',
    price: 38,
    mrp: 48,
    image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=500&q=80',
    category: 'Fruits & Veggies',
    inStock: true,
    discount: '20% OFF',
  },
  {
    id: 'g6',
    name: "Lay's India's Magic Masala Chips",
    unit: '50 g',
    price: 20,
    mrp: 20,
    image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=500&q=80',
    category: 'Snacks & Munchies',
    inStock: true,
  },
  {
    id: 'g7',
    name: 'Coca-Cola Soft Drink Original Taste',
    unit: '750 ml',
    price: 40,
    mrp: 45,
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=500&q=80',
    category: 'Drinks & Juices',
    inStock: true,
    discount: '11% OFF',
  },
  {
    id: 'g8',
    name: 'Tropicana 100% Real Orange Juice',
    unit: '1 L Pack',
    price: 118,
    mrp: 145,
    image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=500&q=80',
    category: 'Drinks & Juices',
    inStock: true,
    discount: '18% OFF',
  },
  {
    id: 'g9',
    name: 'Maggi 2-Minute Masala Instant Noodles',
    unit: '280 g (Pack of 4)',
    price: 56,
    mrp: 60,
    image: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=500&q=80',
    category: 'Instant Food',
    inStock: true,
    discount: '6% OFF',
  },
  {
    id: 'g10',
    name: 'Surf Excel Easy Wash Detergent Powder',
    unit: '1 kg',
    price: 139,
    mrp: 155,
    image: 'https://images.unsplash.com/photo-1585842378054-ee2e52f94ba2?auto=format&fit=crop&w=500&q=80',
    category: 'Cleaning & Household',
    inStock: true,
    discount: '10% OFF',
  },
  {
    id: 'g11',
    name: 'Dettol Original Skincare Handwash',
    unit: '200 ml Refill',
    price: 89,
    mrp: 99,
    image: 'https://images.unsplash.com/photo-1608248597359-0a6e088a5316?auto=format&fit=crop&w=500&q=80',
    category: 'Personal Care',
    inStock: true,
    discount: '10% OFF',
  },
  {
    id: 'g12',
    name: 'Mother Dairy Fresh Paneer',
    unit: '200 g',
    price: 92,
    mrp: 95,
    image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=500&q=80',
    category: 'Dairy & Eggs',
    inStock: true,
  },
]

const CATEGORIES = [
  'All Items',
  'Dairy & Eggs',
  'Fruits & Veggies',
  'Snacks & Munchies',
  'Drinks & Juices',
  'Instant Food',
  'Cleaning & Household',
  'Personal Care',
]

export default function CraveXPStore() {
  const { user } = useAuth()
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState('All Items')
  const [searchQuery, setSearchQuery] = useState('')
  const [cart, setCart] = useState<{ item: GroceryItem; qty: number }[]>([])
  const [showCartDrawer, setShowCartDrawer] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)

  const filteredItems = useMemo(() => {
    return SAMPLE_GROCERY_ITEMS.filter((i) => {
      const matchesCat =
        selectedCategory === 'All Items' || i.category === selectedCategory
      const matchesSearch =
        i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.category.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCat && matchesSearch
    })
  }, [selectedCategory, searchQuery])

  const cartTotalItems = useMemo(
    () => cart.reduce((sum, c) => sum + c.qty, 0),
    [cart]
  )

  const cartSubtotal = useMemo(
    () => cart.reduce((sum, c) => sum + c.item.price * c.qty, 0),
    [cart]
  )

  const deliveryFee = cartSubtotal >= 299 || cartSubtotal === 0 ? 0 : 25
  const handlingFee = cartSubtotal > 0 ? 15 : 0
  const grandTotal = cartSubtotal + deliveryFee + handlingFee

  const getItemQty = (id: string) => {
    return cart.find((c) => c.item.id === id)?.qty || 0
  }

  const updateItemQty = (item: GroceryItem, delta: number) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id)
      if (!existing) {
        if (delta > 0) return [...prev, { item, qty: 1 }]
        return prev
      }
      const newQty = existing.qty + delta
      if (newQty <= 0) {
        return prev.filter((c) => c.item.id !== item.id)
      }
      return prev.map((c) => (c.item.id === item.id ? { ...c, qty: newQty } : c))
    })
  }

  const handlePlaceOrder = () => {
    if (cart.length === 0) return
    setOrderPlaced(true)
    setTimeout(() => {
      setCart([])
      setOrderPlaced(false)
      setShowCartDrawer(false)
      router.push('/user/track')
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-[#f7f8f5] text-[#18201c] pb-24">
      {/* Top Header Banner for craveXP Instamart */}
      <header className="sticky top-0 z-40 border-b border-[#e5e9e0] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/user/explore" className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl bg-[#d9f447] font-extrabold text-[#18201c] shadow-sm">
                <Zap className="size-5 fill-current" />
              </span>
              <div>
                <span className="text-xl font-extrabold tracking-tight text-[#18201c]">
                  crave<span className="text-emerald-600">XP</span>
                </span>
                <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-800 tracking-wider">
                  10 Min Instamart
                </span>
              </div>
            </Link>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-[#5a665f]">
            <MapPin className="size-4 text-emerald-600" />
            <span>Delivering in <strong>10 mins</strong> to <strong>Kanakapura Road</strong></span>
          </div>

          <button
            onClick={() => setShowCartDrawer(true)}
            className="relative flex items-center gap-2 rounded-2xl bg-[#18201c] px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#323f37] transition"
          >
            <ShoppingCart className="size-4 text-[#d9f447]" />
            <span>{cartTotalItems} items</span>
            {cartSubtotal > 0 && <span className="text-[#d9f447]">· ₹{grandTotal}</span>}
          </button>
        </div>

        {/* Search Bar */}
        <div className="mx-auto max-w-[1240px] px-4 pb-3 sm:px-6">
          <div className="relative flex items-center rounded-2xl border-2 border-[#e2e7dc] bg-[#f8f9f6] px-3.5 py-2.5 shadow-sm focus-within:border-emerald-600">
            <Search className="size-4 text-gray-500 mr-2 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search milk, bread, eggs, chips, cold drinks, veggies..."
              className="w-full bg-transparent text-xs font-medium outline-none placeholder:text-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs font-bold text-gray-400 hover:text-gray-700"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Banner for craveXP */}
      <section className="mx-auto max-w-[1240px] px-4 pt-6 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#121815] via-[#1a2520] to-[#121815] p-6 sm:p-8 text-white shadow-xl border-2 border-emerald-500/30">
          <div className="relative z-10 max-w-xl">
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-[#d9f447] mb-2">
              <Zap className="size-4 text-[#d9f447]" /> Hyper-Fast Grocery Delivery
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              crave<span className="text-[#d9f447]">XP</span> 10-Minute Dark Store
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-gray-300">
              Fresh vegetables, cold dairy, snacks, beverages &amp; home essentials picked from our nearest Kanakapura dark store in under 180 seconds.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-bold text-emerald-300">
              <span className="flex items-center gap-1">
                <Clock className="size-4" /> 10 Mins Guaranteed
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="size-4 text-emerald-400" /> 100% Quality Checked
              </span>
              <span className="flex items-center gap-1">
                <Truck className="size-4" /> Free Delivery over ₹299
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Bar */}
      <section className="mx-auto max-w-[1240px] px-4 pt-6 sm:px-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-2xl px-4 py-2 text-xs font-bold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-[#18201c] text-[#d9f447] shadow-md'
                  : 'bg-white text-[#525f57] border border-[#e2e7dc] hover:bg-[#f0f3eb]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Instamart Items Grid */}
      <section className="mx-auto max-w-[1240px] px-4 pt-6 sm:px-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#18201c]">
            {selectedCategory === 'All Items' ? 'Top Daily Essentials' : selectedCategory} ({filteredItems.length})
          </h2>
          <span className="text-xs text-gray-500 font-semibold">
            Showing instant 10-min stock
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {filteredItems.map((item) => {
            const qty = getItemQty(item.id)
            return (
              <div
                key={item.id}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-[#e2e7dc] bg-white p-3.5 shadow-xs transition hover:border-emerald-500 hover:shadow-lg"
              >
                <div>
                  <div className="relative h-32 w-full overflow-hidden rounded-xl bg-gray-50">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {item.discount && (
                      <span className="absolute top-2 left-2 rounded-full bg-rose-500 px-2 py-0.5 text-[9px] font-extrabold text-white">
                        {item.discount}
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    {item.unit}
                  </p>
                  <h3 className="mt-0.5 text-xs font-bold text-[#18201c] line-clamp-2 leading-snug">
                    {item.name}
                  </h3>
                </div>

                <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#f0f4eb]">
                  <div>
                    <span className="text-xs font-extrabold text-[#18201c]">
                      ₹{item.price}
                    </span>
                    {item.mrp > item.price && (
                      <span className="ml-1 text-[10px] text-gray-400 line-through font-normal">
                        ₹{item.mrp}
                      </span>
                    )}
                  </div>

                  {qty === 0 ? (
                    <button
                      onClick={() => updateItemQty(item, 1)}
                      className="flex items-center gap-1 rounded-xl border-2 border-emerald-600 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-800 hover:bg-emerald-600 hover:text-white transition"
                    >
                      <Plus className="size-3.5" /> ADD
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-600 px-2 py-1 text-xs font-bold text-white shadow">
                      <button onClick={() => updateItemQty(item, -1)}>
                        <Minus className="size-3" />
                      </button>
                      <span>{qty}</span>
                      <button onClick={() => updateItemQty(item, 1)}>
                        <Plus className="size-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Cart Drawer */}
      {showCartDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
          <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between border-b border-gray-200 p-4">
              <div className="flex items-center gap-2">
                <Zap className="size-5 text-emerald-600" />
                <h2 className="text-base font-bold text-[#18201c]">
                  craveXP Cart ({cartTotalItems} items)
                </h2>
              </div>
              <button
                onClick={() => setShowCartDrawer(false)}
                className="rounded-full p-1 text-gray-500 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {cart.length === 0 ? (
                <div className="py-16 text-center">
                  <ShoppingBag className="mx-auto size-12 text-gray-300 mb-3" />
                  <p className="text-sm font-bold text-gray-700">Your craveXP cart is empty</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Add milk, snacks, beverages &amp; essentials for 10-minute delivery.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-900 flex items-center justify-between">
                    <span>10-Minute Dark Store Express Drop</span>
                    <span className="text-emerald-700">FREE over ₹299</span>
                  </div>

                  {cart.map(({ item, qty }) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-2xl border border-gray-200 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="size-12 rounded-xl object-cover"
                        />
                        <div>
                          <p className="text-xs font-bold text-[#18201c] line-clamp-1">{item.name}</p>
                          <p className="text-[10px] text-gray-500">{item.unit}</p>
                          <p className="text-xs font-extrabold text-[#18201c] mt-0.5">
                            ₹{item.price * qty}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 rounded-xl bg-gray-100 px-2 py-1 text-xs font-bold text-[#18201c]">
                        <button onClick={() => updateItemQty(item, -1)}>
                          <Minus className="size-3" />
                        </button>
                        <span>{qty}</span>
                        <button onClick={() => updateItemQty(item, 1)}>
                          <Plus className="size-3" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Bill Summary */}
                  <div className="mt-4 rounded-2xl bg-gray-50 p-4 text-xs font-medium text-gray-600 flex flex-col gap-2">
                    <div className="flex justify-between">
                      <span>Item Total</span>
                      <span className="font-bold text-[#18201c]">₹{cartSubtotal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivery Fee</span>
                      <span className="font-bold text-emerald-700">
                        {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Handling &amp; Packaging</span>
                      <span className="font-bold text-[#18201c]">₹{handlingFee}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 pt-2 text-sm font-extrabold text-[#18201c]">
                      <span>To Pay</span>
                      <span className="text-emerald-700">₹{grandTotal}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t border-gray-200 p-4">
                <button
                  onClick={handlePlaceOrder}
                  disabled={orderPlaced}
                  className="w-full rounded-2xl bg-[#18201c] py-3.5 text-xs font-extrabold text-[#d9f447] shadow-xl hover:bg-[#323f37] transition flex items-center justify-center gap-2"
                >
                  {orderPlaced ? (
                    <span>Placing 10-Min Order...</span>
                  ) : (
                    <>
                      <span>Place 10-Min Order · ₹{grandTotal}</span>
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
