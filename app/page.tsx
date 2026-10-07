'use client'

import Footer from '@/components/Footer'
import Navbar from '@/components/Navbar'
import { useAuth } from '@/lib/auth-context'
import {
  ArrowRight,
  MapPin,
  Search,
  ShoppingBag,
  Star,
  Truck,
  UtensilsCrossed,
  Zap,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function HomePage() {
  const { user, role, isLoading } = useAuth()
  const router = useRouter()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCity, setSelectedCity] = useState('Kanakapura Road, Bengaluru')

  useEffect(() => {
    if (!isLoading && user) {
      const targetDashboard =
        role === 'customer' || role === 'user'
          ? '/user/dashboard'
          : role === 'rider' || role === 'driver'
            ? '/driver/dashboard'
            : role === 'restaurant_vendor' || role === 'vendor'
              ? '/vendor/dashboard'
              : role === 'cravexp_store_vendor'
                ? '/vendor/crave-ep'
                : role === 'admin'
                  ? '/admin/dashboard'
                  : '/login'
      router.replace(targetDashboard)
    }
  }, [user, role, isLoading, router])

  if (!isLoading && user) {
    return (
      <div className="min-h-screen bg-[#f8f9f7] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="mx-auto size-10 border-4 border-[#d9f447] border-t-[#18201c] rounded-full animate-spin" />
          <p className="mt-4 text-xs font-bold text-[#18201c] uppercase tracking-wider">
            Loading crave...
          </p>
        </div>
      </div>
    )
  }

  const handleNavigateCustomer = (path: string) => {
    if (user) {
      router.push(path)
    } else {
      router.push('/login')
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9f7] text-[#18201c] selection:bg-[#d9f447] selection:text-[#18201c]">
      <Navbar />

      {/* =========================================================================
          HERO & SEARCH SECTION
         ========================================================================= */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-[#f4f7ed] to-[#f8f9f7] pb-16 pt-8 sm:pt-12 lg:pb-20 lg:pt-14">
        {/* Background Glow */}
        <div className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-[520px] w-[780px] -translate-x-1/2 rounded-full bg-[#d9f447]/25 blur-[130px]" />

        <div className="mx-auto max-w-[1280px] px-5 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            {/* Location Eyebrow (Plain Text, Zero Background Pill) */}
            <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[#70880e] mb-4">
              <MapPin className="size-3.5 text-[#849e16]" />
              <span>Live on Kanakapura Road, Bengaluru</span>
            </div>

            <h1 className="text-[clamp(2.5rem,5vw,4.5rem)] font-extrabold leading-[1.05] tracking-tight text-[#18201c]">
              Order food &amp; groceries. <br />
              Discover best kitchens. <span className="text-[#849e16]">Crave it!</span>
            </h1>

            <p className="mt-4 text-base sm:text-lg text-[#55635a] font-medium leading-relaxed max-w-xl mx-auto">
              Hyper-local food delivery, 15-minute dark store groceries, and gourmet dining deals
              curated exclusively for{' '}
              <span className="font-bold text-[#18201c] underline decoration-[#d9f447] decoration-2">
                Kanakapura Road
              </span>
              .
            </p>

            {/* Location + Search Bar */}
            <div className="mt-8 rounded-3xl border-2 border-[#18201c]/10 bg-white p-2.5 shadow-2xl backdrop-blur-md max-w-2xl mx-auto">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {/* Location Selector */}
                <div className="flex items-center gap-2 rounded-2xl bg-[#f8f9f6] px-3.5 py-3 border border-[#e5e9e1] sm:max-w-[220px] shrink-0">
                  <MapPin className="size-4 text-[#849e16] shrink-0" />
                  <input
                    type="text"
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    placeholder="Kanakapura Road"
                    className="w-full bg-transparent text-xs font-bold text-[#18201c] focus:outline-none truncate"
                  />
                </div>

                {/* Dish / Kitchen Search Input */}
                <div className="flex-1 flex items-center gap-2 rounded-2xl bg-[#f8f9f6] px-3.5 py-3 border border-[#e5e9e1]">
                  <Search className="size-4 text-[#75827b] shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search biryani, pizza, groceries, or snacks..."
                    className="w-full bg-transparent text-xs font-medium text-[#18201c] placeholder:text-[#83918a] focus:outline-none"
                  />
                </div>

                {/* Primary Find Food Button */}
                <button
                  onClick={() => handleNavigateCustomer('/user/explore')}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-[#18201c] px-6 py-3.5 text-xs font-extrabold text-white shadow-lg transition hover:bg-[#323f37] hover:scale-105 active:scale-95 shrink-0"
                >
                  Find Food
                  <ArrowRight className="size-4 text-[#d9f447]" />
                </button>
              </div>
            </div>
          </div>

          {/* =========================================================================
              CUSTOMER SERVICE ENTRY CARDS (FOOD DELIVERY, CRAVE XP, DINEOUT)
             ========================================================================= */}
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {/* ENTRY CARD 1: FOOD DELIVERY */}
            <div
              onClick={() => handleNavigateCustomer('/user/explore')}
              className="group cursor-pointer rounded-[36px] border-2 border-[#e2e7dc] bg-white p-7 shadow-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-[#849e16] hover:shadow-2xl relative overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#849e16]">
                    UP TO 60% OFF
                  </span>
                  <div className="grid size-12 place-items-center rounded-2xl bg-[#f4f8ea] text-[#849e16] group-hover:scale-110 transition-transform">
                    <UtensilsCrossed className="size-6" />
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-2xl font-black text-[#18201c] uppercase tracking-tight group-hover:text-[#849e16] transition-colors">
                    FOOD DELIVERY
                  </h3>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wider text-[#616d66]">
                    FROM TOP LOCAL RESTAURANTS
                  </p>
                  <p className="mt-3 text-xs leading-relaxed text-[#55635a]">
                    Order hot biryani, pizzas, burgers &amp; authentic South Indian meals from
                    handpicked kitchens.
                  </p>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between pt-4 border-t border-[#f0f4eb]">
                <span className="text-xs font-extrabold text-[#18201c] group-hover:text-[#849e16] transition-colors">
                  Order Food Now
                </span>
                <span className="grid size-9 place-items-center rounded-full bg-[#18201c] text-[#d9f447] group-hover:bg-[#849e16] group-hover:text-white transition-colors">
                  <ArrowRight className="size-4" />
                </span>
              </div>
            </div>

            {/* ENTRY CARD 2: CRAVE XP (INSTAMART / DARK STORE) */}
            <div
              onClick={() => handleNavigateCustomer('/user/cravexp')}
              className="group cursor-pointer rounded-[36px] border-2 border-[#e2e7dc] bg-white p-7 shadow-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-[#849e16] hover:shadow-2xl relative overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#849e16]">
                    15 MIN EXPRESS DROPS
                  </span>
                  <div className="grid size-12 place-items-center rounded-2xl bg-[#18201c] text-[#d9f447] group-hover:scale-110 transition-transform">
                    <ShoppingBag className="size-6" />
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-2xl font-black text-[#18201c] uppercase tracking-tight group-hover:text-[#849e16] transition-colors">
                    INSTANT GROCERY
                  </h3>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wider text-[#616d66]">
                    CRAVE XP STORE
                  </p>
                  <p className="mt-3 text-xs leading-relaxed text-[#55635a]">
                    Fresh dairy, snacks, beverages, ice creams &amp; daily essentials delivered in
                    under 15 minutes.
                  </p>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between pt-4 border-t border-[#f0f4eb]">
                <span className="text-xs font-extrabold text-[#18201c] group-hover:text-[#849e16] transition-colors">
                  Explore Crave XP Store
                </span>
                <span className="grid size-9 place-items-center rounded-full bg-[#849e16] text-white group-hover:bg-[#18201c] group-hover:text-[#d9f447] transition-colors">
                  <ArrowRight className="size-4" />
                </span>
              </div>
            </div>

            {/* ENTRY CARD 3: DINEOUT & OFFERS */}
            <div
              onClick={() => handleNavigateCustomer('/user/explore')}
              className="group cursor-pointer rounded-[36px] border-2 border-[#e2e7dc] bg-white p-7 shadow-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-[#849e16] hover:shadow-2xl relative overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#849e16]">
                    UP TO 50% SAVINGS
                  </span>
                  <div className="grid size-12 place-items-center rounded-2xl bg-[#f4f8ea] text-[#849e16] group-hover:scale-110 transition-transform">
                    <Star className="size-6" />
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-2xl font-black text-[#18201c] uppercase tracking-tight group-hover:text-[#849e16] transition-colors">
                    TOP OFFERS &amp; DEALS
                  </h3>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wider text-[#616d66]">
                    CURATED DINING &amp; SPECIALS
                  </p>
                  <p className="mt-3 text-xs leading-relaxed text-[#55635a]">
                    Discover flat discounts, promo codes, and special restaurant combos near
                    Kanakapura Road.
                  </p>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between pt-4 border-t border-[#f0f4eb]">
                <span className="text-xs font-extrabold text-[#18201c] group-hover:text-[#849e16] transition-colors">
                  View Today&apos;s Offers
                </span>
                <span className="grid size-9 place-items-center rounded-full bg-[#18201c] text-[#d9f447] group-hover:bg-[#849e16] group-hover:text-white transition-colors">
                  <ArrowRight className="size-4" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          CRAVE XP INSTAMART DEEP DIVE FEATURE SECTION
         ========================================================================= */}
      <section className="py-20 lg:py-24 bg-white border-t border-b border-[#e5e9e1]">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            {/* Left Content */}
            <div className="lg:col-span-6">
              {/* Eyebrow (Plain Text, Zero Background Pill) */}
              <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[#70880e] mb-4">
                <Zap className="size-3.5 text-[#849e16] fill-current" />
                <span>Introducing Crave XP Store</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#18201c] tracking-tight leading-tight">
                Instant Grocery Delivery in <span className="text-[#849e16]">15 Minutes.</span>
              </h2>

              <p className="mt-4 text-sm sm:text-base text-[#55635a] font-medium leading-relaxed">
                Need fresh milk, snacks, beverages, or emergency kitchen ingredients? Our local
                Kanakapura Road store packs and dispatches your order in under 2 minutes.
              </p>

              {/* Feature Points */}
              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="grid size-7 place-items-center rounded-xl bg-[#f4f8ea] text-[#849e16] shrink-0 mt-0.5 font-bold">
                    1
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-[#18201c]">
                      Sub-15 Minute Dispatch
                    </h4>
                    <p className="text-xs text-[#616d66] mt-0.5">
                      Dedicated pickers pack items instantly from cold storage bays.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="grid size-7 place-items-center rounded-xl bg-[#f4f8ea] text-[#849e16] shrink-0 mt-0.5 font-bold">
                    2
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-[#18201c]">
                      100% Temperature Sealed
                    </h4>
                    <p className="text-xs text-[#616d66] mt-0.5">
                      IoT sensors monitor dairy and ice cream bags at optimal temperatures.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="grid size-7 place-items-center rounded-xl bg-[#f4f8ea] text-[#849e16] shrink-0 mt-0.5 font-bold">
                    3
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-[#18201c]">Live Map Tracking</h4>
                    <p className="text-xs text-[#616d66] mt-0.5">
                      Watch your express rider navigate straight to your apartment doorstep.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-8">
                <button
                  onClick={() => handleNavigateCustomer('/user/cravexp')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-3 rounded-2xl bg-[#18201c] px-6 sm:px-8 py-4 text-xs font-extrabold text-white shadow-xl hover:bg-[#323f37] transition hover:scale-105 active:scale-95"
                >
                  <ShoppingBag className="size-4 text-[#d9f447]" />
                  Enter Crave XP Instamart Store
                  <ArrowRight className="size-4 text-[#d9f447]" />
                </button>
              </div>
            </div>

            {/* Right Graphic Preview */}
            <div className="lg:col-span-6">
              <div className="rounded-[28px] sm:rounded-[36px] border-4 border-white bg-gradient-to-br from-[#121815] to-[#1a231f] p-4 sm:p-7 text-white shadow-2xl relative overflow-hidden">
                <div className="flex flex-wrap sm:flex-nowrap items-center justify-between border-b border-white/10 pb-4 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="grid size-8 place-items-center rounded-xl bg-[#d9f447] text-[#18201c] font-black text-xs shrink-0">
                      XP
                    </span>
                    <div>
                      <h3 className="text-xs font-bold text-white leading-tight">
                        Crave XP Console
                      </h3>
                      <p className="text-[10px] text-white/60">Kanakapura Road Hub #01</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-[#d9f447] px-2.5 py-1 text-[9px] sm:text-[10px] font-black text-[#18201c] shrink-0">
                    15 MIN EXPRESS
                  </span>
                </div>

                {/* Items Grid Preview */}
                <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="rounded-2xl bg-white/5 p-3.5 sm:p-4 border border-white/10 flex items-center gap-3 min-w-0">
                    <div className="grid size-9 sm:size-10 place-items-center rounded-xl bg-[#d9f447]/20 text-[#d9f447] shrink-0">
                      <ShoppingBag className="size-4 sm:size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">Organic Milk 1L</p>
                      <p className="text-[10px] text-[#d9f447] font-bold">In Stock · ₹68</p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white/5 p-3.5 sm:p-4 border border-white/10 flex items-center gap-3 min-w-0">
                    <div className="grid size-9 sm:size-10 place-items-center rounded-xl bg-[#d9f447]/20 text-[#d9f447] shrink-0">
                      <Zap className="size-4 sm:size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">Cold Brew Coffee</p>
                      <p className="text-[10px] text-[#d9f447] font-bold">In Stock · ₹120</p>
                    </div>
                  </div>
                </div>

                {/* Live Status Widget */}
                <div className="mt-4 sm:mt-6 rounded-2xl bg-[#d9f447] p-3.5 sm:p-4 text-[#18201c] flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 font-bold text-xs shadow-lg">
                  <span className="flex items-center gap-2 text-xs">
                    <Truck className="size-4 shrink-0" /> Express Rider Assigned
                  </span>
                  <span className="rounded-lg bg-[#18201c] text-[#d9f447] px-2.5 py-1 text-[10px] font-mono shrink-0">
                    12 MIN ETA
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          CUSTOMER MOBILE APP CTA BANNER
         ========================================================================= */}
      <section className="py-16 bg-[#f8f9f7]">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[36px] bg-[#121815] p-8 sm:p-14 text-white shadow-2xl border-2 border-[#d9f447]/30">
            <div className="relative z-10 max-w-xl">
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#d9f447]">
                Hungry on Kanakapura Road?
              </span>
              <h2 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                No Fake Discounts. Just Actual Good Food.
              </h2>
              <p className="mt-4 text-xs sm:text-sm text-white/70 leading-relaxed font-normal">
                Experience instant 1-tap ordering, live GPS driver tracking, and gourmet kitchen
                partners near you.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  onClick={() => handleNavigateCustomer('/user/explore')}
                  className="rounded-full bg-[#d9f447] px-8 py-4 text-sm font-extrabold text-[#121815] shadow-xl hover:bg-[#c2dc37] transition hover:scale-105 active:scale-95"
                >
                  Start Food Order Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          COMPREHENSIVE ENTERPRISE FOOTER (ZOMATO STYLE)
         ========================================================================= */}
      <Footer />
    </div>
  )
}
