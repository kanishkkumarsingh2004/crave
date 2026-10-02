'use client'

import React, { useState, useMemo, FormEvent } from 'react'
import {
  ArrowRight,
  Bike,
  Check,
  Clock3,
  LocateFixed,
  MapPin,
  PackageCheck,
  Plus,
  Search,
  ShoppingBag,
  Star,
  Store,
  Utensils,
  X,
  Zap,
  PhoneCall,
  Navigation,
  CheckCircle2,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

interface Restaurant {
  id: string
  name: string
  cuisine: string
  rating: string
  eta: string
  image: string
  tag: string
  address: string
}

const sampleRestaurants: Restaurant[] = [
  {
    id: 'rest_1',
    name: 'The Green Table',
    cuisine: 'Healthy bowls · Salads · Vegan',
    rating: '4.8',
    eta: '25–30 min',
    image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85',
    tag: 'Healthy',
    address: '100ft Rd, Indiranagar',
  },
  {
    id: 'rest_2',
    name: 'Momo House & Asian Grill',
    cuisine: 'Asian · Dumplings · Noodles',
    rating: '4.7',
    eta: '20–25 min',
    image: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=900&q=85',
    tag: 'Popular',
    address: '5th Block, Koramangala',
  },
  {
    id: 'rest_3',
    name: 'Casa Napoli Woodfired Pizza',
    cuisine: 'Italian · Artisan Pizza · Pasta',
    rating: '4.9',
    eta: '30–35 min',
    image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=900&q=85',
    tag: 'Top rated',
    address: 'Church Street, Mg Road',
  },
]

const sampleMenuItems = [
  {
    id: 'm1',
    name: 'Basil Pesto Quinoa Bowl',
    detail: 'Roasted zucchini, cherry tomatoes, pesto, toasted seeds',
    price: 289,
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=500&q=85',
    veg: true,
  },
  {
    id: 'm2',
    name: 'Smoky Paneer Tikka Wrap',
    detail: 'Charred paneer, pickled onion, mint chutney in wheat wrap',
    price: 249,
    image: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=500&q=85',
    veg: true,
  },
  {
    id: 'm3',
    name: 'Steamed Truffle Edamame Momos',
    detail: 'Thin wheat skin filled with edamame & wild mushrooms',
    price: 320,
    image: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=500&q=85',
    veg: true,
  },
]

export default function CustomerDashboard() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string>('All')
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null)
  const [cartItems, setCartItems] = useState<typeof sampleMenuItems>([])
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'explore' | 'live-order' | 'orders'>('explore')
  const [deliveryAddress, setDeliveryAddress] = useState(user?.address || '100ft Rd, Indiranagar, Bengaluru')
  
  // Payment states
  const [upiId, setUpiId] = useState('')
  const [utrRef, setUtrRef] = useState('')
  const [paymentDone, setPaymentDone] = useState(false)
  const [activeOrder, setActiveOrder] = useState<any>(null)

  const filteredRestaurants = useMemo(() => {
    return sampleRestaurants.filter((rest) => {
      const matchesSearch =
        rest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rest.cuisine.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesTag = selectedTag === 'All' || rest.tag.toLowerCase() === selectedTag.toLowerCase()
      return matchesSearch && matchesTag
    })
  }, [searchQuery, selectedTag])

  const cartTotal = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.price, 0)
  }, [cartItems])

  function addToCart(item: (typeof sampleMenuItems)[0]) {
    setCartItems((prev) => [...prev, item])
  }

  function handleCheckoutSubmit(e: FormEvent) {
    e.preventDefault()
    if (!utrRef.trim() || !upiId.trim()) return

    const newOrder = {
      id: `DRP-${Math.floor(1000 + Math.random() * 9000)}`,
      restaurantName: selectedRestaurant?.name || 'The Green Table',
      items: cartItems,
      total: cartTotal + 40, // + delivery fee
      utrRef,
      upiId,
      status: 'Placed',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      driver: {
        name: 'Rajesh Kumar',
        phone: '+91 97444 55667',
        vehicle: 'Ather EV Bike (KA 01 EV 9821)',
      },
    }

    setActiveOrder(newOrder)
    setPaymentDone(true)
    setCartItems([])
    setTimeout(() => {
      setShowCheckoutModal(false)
      setSelectedRestaurant(null)
      setActiveTab('live-order')
    }, 1200)
  }

  return (
    <div className="min-h-screen bg-[#f8f9f7] pb-24 text-[#18201c]">
      {/* Top Header Banner for Customer */}
      <div className="border-b border-[#e6eae2] bg-white px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#f1f6da] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#687b14]">
                Customer Console
              </span>
              <span className="flex items-center gap-1 text-xs text-[#727d76]">
                <LocateFixed className="size-3.5 text-[#86a018]" />
                Deliver to: <span className="font-semibold text-[#18201c]">{deliveryAddress}</span>
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Hello, {user?.name || 'Foodie'}! 👋
            </h1>
            <p className="mt-0.5 text-xs text-[#6e7872]">
              What would you like to order today? Choose from top local kitchens around Bengaluru.
            </p>
          </div>

          {/* Customer Navigation Tabs */}
          <div className="flex items-center gap-2 rounded-2xl bg-[#f0f3eb] p-1.5 text-xs font-bold">
            <button
              onClick={() => setActiveTab('explore')}
              className={`rounded-xl px-4 py-2 transition ${
                activeTab === 'explore' ? 'bg-white text-[#18201c] shadow-sm' : 'text-[#65716a] hover:text-[#18201c]'
              }`}
            >
              Explore Kitchens
            </button>
            <button
              onClick={() => setActiveTab('live-order')}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 transition ${
                activeTab === 'live-order' ? 'bg-white text-[#18201c] shadow-sm' : 'text-[#65716a] hover:text-[#18201c]'
              }`}
            >
              <Bike className="size-3.5 text-[#859f17]" />
              Track Drop
              {activeOrder && (
                <span className="size-2 rounded-full bg-[#8fa71c] animate-pulse" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1240px] px-4 pt-6 sm:px-6 lg:px-8">
        {activeTab === 'explore' && (
          <>
            {/* Search & Filter Bar */}
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-3 size-4 text-[#8a948d]" />
                <input
                  type="text"
                  placeholder="Search restaurants, cuisines, dishes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-2xl border border-[#dfe4dc] bg-white py-2.5 pl-10 pr-4 text-xs shadow-sm outline-none transition focus:border-[#a1b824] focus:ring-2 focus:ring-[#d9f447]/50"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                {['All', 'Healthy', 'Popular', 'Top rated'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`rounded-full px-4 py-2 font-bold transition ${
                      selectedTag === tag
                        ? 'bg-[#18201c] text-white'
                        : 'border border-[#dfe4dc] bg-white text-[#5d6761] hover:bg-[#f2f5ed]'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Restaurant Cards Grid */}
            <div className="grid gap-6 md:grid-cols-3">
              {filteredRestaurants.map((rest) => (
                <div
                  key={rest.id}
                  onClick={() => setSelectedRestaurant(rest)}
                  className="group cursor-pointer overflow-hidden rounded-3xl border border-[#e1e6df] bg-white transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="relative h-48 w-full overflow-hidden">
                    <img
                      src={rest.image}
                      alt={rest.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#4f5f15] backdrop-blur-md">
                      {rest.tag}
                    </span>
                    <span className="absolute bottom-3 right-3 rounded-full bg-[#18201c] px-3 py-1 text-[10px] font-bold text-white">
                      {rest.eta}
                    </span>
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-base tracking-tight text-[#18201c]">{rest.name}</h3>
                        <p className="mt-0.5 text-xs text-[#737e77]">{rest.cuisine}</p>
                      </div>
                      <span className="flex items-center gap-1 rounded-full bg-[#f1f6d9] px-2.5 py-1 text-[11px] font-bold text-[#5c6e12]">
                        <Star className="size-3 fill-[#8ea71b] text-[#8ea71b]" />
                        {rest.rating}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-[#f0f3eb] pt-3 text-xs">
                      <span className="flex items-center gap-1.5 text-[#737e77]">
                        <MapPin className="size-3.5 text-[#8aa31c]" />
                        {rest.address}
                      </span>
                      <span className="font-bold text-[#86a018] group-hover:underline flex items-center gap-1">
                        View Menu <ArrowRight className="size-3" />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Live Order Tracking View */}
        {activeTab === 'live-order' && (
          <div className="max-w-3xl mx-auto">
            {activeOrder ? (
              <div className="overflow-hidden rounded-3xl border border-[#dfe5db] bg-white shadow-lg">
                <div className="bg-[#18201c] p-6 text-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="inline-block rounded-full bg-[#d9f447] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#18201c]">
                        Live Order #{activeOrder.id}
                      </span>
                      <h2 className="mt-2 text-2xl font-bold">{activeOrder.restaurantName}</h2>
                      <p className="mt-1 text-xs text-white/70">
                        Placed at {activeOrder.timestamp} · Total ₹{activeOrder.total}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[#d9f447]">Estimated Delivery</p>
                      <p className="text-xl font-bold">18 - 22 mins</p>
                    </div>
                  </div>
                </div>

                {/* Progress Steps */}
                <div className="p-6">
                  <div className="grid grid-cols-4 gap-2 text-center text-xs font-semibold">
                    <div className="flex flex-col items-center gap-2">
                      <span className="grid size-10 place-items-center rounded-full bg-[#d9f447] text-[#18201c] font-bold">
                        1
                      </span>
                      <span className="text-[#18201c]">Order Confirmed</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <span className="grid size-10 place-items-center rounded-full bg-[#f1f6db] text-[#718815] font-bold">
                        2
                      </span>
                      <span className="text-[#18201c]">Kitchen Cooking</span>
                    </div>
                    <div className="flex flex-col items-center gap-2 opacity-60">
                      <span className="grid size-10 place-items-center rounded-full bg-gray-100 text-gray-500 font-bold">
                        3
                      </span>
                      <span>Out for Delivery</span>
                    </div>
                    <div className="flex flex-col items-center gap-2 opacity-60">
                      <span className="grid size-10 place-items-center rounded-full bg-gray-100 text-gray-500 font-bold">
                        4
                      </span>
                      <span>Delivered</span>
                    </div>
                  </div>

                  {/* Driver Details Card */}
                  <div className="mt-8 rounded-2xl border border-[#e3e8de] bg-[#f8f9f6] p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="grid size-12 place-items-center rounded-2xl bg-[#18201c] text-white">
                        <Bike className="size-6 text-[#d9f447]" />
                      </div>
                      <div>
                        <p className="text-xs text-[#737e77]">Assigned Delivery Partner</p>
                        <p className="font-bold text-sm text-[#18201c]">{activeOrder.driver.name}</p>
                        <p className="text-xs text-[#849a17]">{activeOrder.driver.vehicle}</p>
                      </div>
                    </div>
                    <button className="flex items-center gap-1.5 rounded-full border border-[#d8ded4] bg-white px-4 py-2 text-xs font-bold text-[#18201c]">
                      <PhoneCall className="size-3.5 text-[#829b14]" />
                      Call Driver
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-[#e1e6df] bg-white p-12 text-center">
                <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#f0f5db] text-[#7f9815]">
                  <ShoppingBag className="size-8" />
                </div>
                <h3 className="mt-4 text-xl font-bold">No Active Order Right Now</h3>
                <p className="mt-1 text-xs text-[#747e78] max-w-sm mx-auto">
                  Browse your favourite restaurants and place an order to see live delivery tracking here.
                </p>
                <button
                  onClick={() => setActiveTab('explore')}
                  className="mt-6 rounded-full bg-[#18201c] px-6 py-3 text-xs font-bold text-white"
                >
                  Explore Kitchens
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Restaurant Menu Modal */}
      {selectedRestaurant && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#18201c]/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="max-h-[90vh] w-full max-w-[600px] overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl">
            <div className="flex items-start justify-between border-b border-[#f0f3ec] pb-4">
              <div>
                <span className="rounded-full bg-[#f1f6d9] px-2.5 py-0.5 text-[10px] font-bold uppercase text-[#5a6d10]">
                  {selectedRestaurant.tag}
                </span>
                <h2 className="mt-1 text-2xl font-bold text-[#18201c]">{selectedRestaurant.name}</h2>
                <p className="text-xs text-[#747f78]">{selectedRestaurant.cuisine} · {selectedRestaurant.address}</p>
              </div>
              <button
                onClick={() => setSelectedRestaurant(null)}
                className="grid size-8 place-items-center rounded-full bg-[#f0f3ec] text-[#636e68]"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Menu Items List */}
            <div className="mt-5 flex flex-col gap-4">
              {sampleMenuItems.map((item) => (
                <div key={item.id} className="flex items-center gap-4 rounded-2xl border border-[#e5e9e1] p-3 transition hover:border-[#a8be2b]">
                  <img src={item.image} alt={item.name} className="size-20 rounded-xl object-cover" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-[#18201c]">{item.name}</h4>
                    <p className="text-xs text-[#727d76] line-clamp-2 mt-0.5">{item.detail}</p>
                    <p className="mt-2 text-sm font-bold text-[#18201c]">₹{item.price}</p>
                  </div>
                  <button
                    onClick={() => addToCart(item)}
                    className="flex items-center gap-1.5 rounded-full bg-[#d9f447] px-4 py-2 text-xs font-bold text-[#18201c] transition hover:scale-105"
                  >
                    <Plus className="size-3.5" />
                    Add
                  </button>
                </div>
              ))}
            </div>

            {/* Sticky Cart Drawer inside modal */}
            {cartItems.length > 0 && (
              <div className="sticky bottom-0 mt-6 rounded-2xl bg-[#18201c] p-4 text-white flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/70">{cartItems.length} items in cart</p>
                  <p className="text-lg font-bold">₹{cartTotal}</p>
                </div>
                <button
                  onClick={() => setShowCheckoutModal(true)}
                  className="flex items-center gap-2 rounded-full bg-[#d9f447] px-5 py-2.5 text-xs font-bold text-[#18201c]"
                >
                  Proceed to Checkout <ArrowRight className="size-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout & UPI Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18201c]/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[500px] rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-[#eff2ec] pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#86a018]">Secure Checkout</p>
                <h3 className="text-xl font-bold">Complete Payment</h3>
              </div>
              <button onClick={() => setShowCheckoutModal(false)} className="grid size-8 place-items-center rounded-full bg-gray-100">
                <X className="size-4" />
              </button>
            </div>

            {paymentDone ? (
              <div className="py-8 text-center">
                <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#d9f447] text-[#18201c]">
                  <Check className="size-8" />
                </div>
                <h4 className="mt-4 text-xl font-bold">Payment Submitted!</h4>
                <p className="mt-1 text-xs text-[#737e77]">Your reference UTR has been logged. Preparing your food!</p>
              </div>
            ) : (
              <form onSubmit={handleCheckoutSubmit} className="mt-4 flex flex-col gap-4">
                <div className="rounded-2xl bg-[#f8f9f6] p-4 text-xs">
                  <div className="flex justify-between py-1 text-[#65716a]">
                    <span>Items Total ({cartItems.length})</span>
                    <span>₹{cartTotal}</span>
                  </div>
                  <div className="flex justify-between py-1 text-[#65716a]">
                    <span>Delivery & Taxes</span>
                    <span>₹40</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-[#e2e7dd] font-bold text-sm text-[#18201c]">
                    <span>Total Amount</span>
                    <span>₹{cartTotal + 40}</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#18201c]">Your UPI VPA / ID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. alex@upi"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2.5 text-xs outline-none focus:border-[#86a018]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#18201c]">12-digit UTR / Payment Ref Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 428190021389"
                    value={utrRef}
                    onChange={(e) => setUtrRef(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2.5 text-xs outline-none focus:border-[#86a018]"
                  />
                </div>

                <button
                  type="submit"
                  className="mt-2 w-full rounded-full bg-[#18201c] py-3 text-xs font-bold text-white transition hover:bg-[#323d36]"
                >
                  Confirm & Submit Order (₹{cartTotal + 40})
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
