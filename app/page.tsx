'use client'

import Footer from '@/components/Footer'
import Navbar from '@/components/Navbar'
import { CravePagePreloader } from '@/components/ui/ModernPreloader'
import { useAuth } from '@/lib/auth-context'
import {
  ArrowRight,
  Bike,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  CreditCard,
  MapPin,
  Package,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Tag,
  TrendingUp,
  Truck,
  UtensilsCrossed,
  Zap,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'

// ── Featured Kitchen Collections (Zomato/Swiggy Curated Partners) ────────────
const FEATURED_KITCHENS = [
  {
    id: 'k1',
    name: 'The Woodfired Hearth',
    cuisine: 'Authentic Neapolitan • Sourdough Pizza',
    rating: 4.9,
    ratingCount: '1.4k',
    deliveryTime: '22 min',
    distance: '1.8 km',
    offer: 'Complimentary Garlic Bread with Order',
    image: 'https://images.unsplash.com/photo-1590947132387-155cc02f3212?auto=format&fit=crop&w=600&q=80',
    tag: 'Artisan Woodfired Hearth',
    path: '/user/explore',
  },
  {
    id: 'k2',
    name: 'Nawabi Dum Darbar',
    cuisine: 'Hyderabadi Biryani • Mughlai Gravies',
    rating: 4.8,
    ratingCount: '2.8k',
    deliveryTime: '24 min',
    distance: '2.4 km',
    offer: 'Flat 20% Off Code CRAVENAWAB',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
    tag: 'Slow-Cooked Royal Awadh',
    path: '/user/explore',
  },
  {
    id: 'k3',
    name: 'CraveXP Flash Store #01',
    cuisine: '15-Min Groceries • Dairy & Ice Creams',
    rating: 4.9,
    ratingCount: '5.2k',
    deliveryTime: '12 min',
    distance: '0.9 km',
    offer: 'Complimentary Express Delivery',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
    tag: 'Hyper-Local Dark Store Hub',
    path: '/user/cravexp',
  },
  {
    id: 'k4',
    name: 'The Green Fork Bistro',
    cuisine: 'Macro Bowls • Cold-Pressed Juice',
    rating: 4.8,
    ratingCount: '890',
    deliveryTime: '20 min',
    distance: '2.1 km',
    offer: 'Calorie Counted • 100% Organic',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
    tag: 'Organic Farm-to-Table',
    path: '/user/explore',
  },
]

const SEARCH_PLACEHOLDERS = [
  'Search for "Hyderabadi Dum Biryani"',
  'Search for "Woodfired Neapolitan Pizza"',
  'Search for "Specialty Cold Brew Coffee"',
  'Search for "Fresh Farm Milk & Eggs in 12 min"',
  'Search for "Crispy Kathi Rolls & Shawarma"',
  'Search for "Artisanal Gelato & Desserts"',
]

export default function HomePage() {
  const { user, role, isLoading } = useAuth()
  const router = useRouter()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLocation, setSelectedLocation] = useState('Kanakapura Road, Bengaluru')
  const [placeholderIndex, setPlaceholderIndex] = useState(0)

  // Animated cycling placeholder text (Swiggy / Zomato signature experience)
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % SEARCH_PLACEHOLDERS.length)
    }, 2800)
    return () => clearInterval(interval)
  }, [])

  // Preserve authentication redirects to designated operational cockpits
  useEffect(() => {
    if (!isLoading && user) {
      const targetDashboard =
        role === 'admin'
          ? '/admin/dashboard'
          : role === 'rider' || (role as string) === 'driver'
            ? '/driver/dashboard'
            : role === 'restaurant_vendor' || (role as string) === 'vendor'
              ? '/vendor/dashboard'
              : role === 'cravexp_store_vendor'
                ? '/vendor/crave-ep'
                : '/user/dashboard'
      router.replace(targetDashboard)
    }
  }, [user, role, isLoading, router])

  if (!isLoading && user) {
    return (
      <div className="min-h-screen bg-[#f8f9f7] dark:bg-[#0c120e] flex items-center justify-center p-4">
        <CravePagePreloader
          title="Loading Crave..."
          subtitle="Directing you to your personalized dashboard"
          minHeight="min-h-screen"
        />
      </div>
    )
  }

  const handleNavigate = (path: string) => {
    if (user) {
      router.push(path)
    } else {
      router.push(path.startsWith('/user') ? path : '/login')
    }
  }

  return (
    <div className="min-h-screen bg-[#fbfcfb] dark:bg-[#080d0a] text-[#121815] dark:text-[#f4f7f4] selection:bg-[#d9f447] selection:text-[#121815] antialiased">
      <Navbar />

      {/* =========================================================================
          HERO SECTION: VOGUE EDITORIAL ARCHITECTURE × GASTRONOMY DISPATCH
         ========================================================================= */}
      <section className="relative overflow-hidden pt-8 sm:pt-14 pb-14 lg:pt-16 lg:pb-20">
        {/* Subtle high-fashion ambient lighting */}
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 -z-10 h-[520px] w-[1100px] bg-gradient-to-b from-[#d9f447]/15 via-transparent to-transparent blur-[140px]" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(#121815_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.03] dark:opacity-[0.04]" />

        <div className="mx-auto max-w-[1240px] px-5 sm:px-6 lg:px-8">
          {/* ── EDITORIAL MASTHEAD & SEARCH CONSOLE ── */}
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-black tracking-[-0.04em] text-[#121815] dark:text-white leading-[0.98]">
              Epicurean Dining. <br />
              <span className="font-serif italic font-normal text-stone-500 dark:text-stone-400">
                Dispatched in 25 minutes.
              </span>
            </h1>

            <p className="text-sm sm:text-base lg:text-lg text-stone-600 dark:text-stone-300 font-medium leading-relaxed max-w-2xl mx-auto">
              Curated gastronomy from South Bengaluru&apos;s master hearths and dark-store essentials.
              Zero artificial markups. Transparent culinary craft.
            </p>

            {/* Architectural Search Console */}
            <div className="pt-2 max-w-2xl mx-auto">
              <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/95 dark:bg-[#111714]/95 p-2 shadow-[0_16px_40px_rgba(0,0,0,0.06)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.4)] backdrop-blur-2xl transition-all hover:border-black/20 dark:hover:border-white/20">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  {/* Location Selector */}
                  <div className="flex items-center gap-2.5 rounded-xl bg-gray-50 dark:bg-white/5 px-3.5 py-3 sm:max-w-[210px] shrink-0 border border-black/5 dark:border-white/5">
                    <MapPin className="size-4 text-[#5e8210] dark:text-[#d9f447] shrink-0" />
                    <input
                      type="text"
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="w-full bg-transparent text-xs font-bold text-[#121815] dark:text-white outline-none truncate"
                    />
                  </div>

                  {/* Cycling Search Field */}
                  <div className="flex-1 flex items-center gap-2.5 rounded-xl bg-gray-50 dark:bg-white/5 px-3.5 py-3 border border-black/5 dark:border-white/5 min-w-0">
                    <Search className="size-4 text-gray-400 dark:text-gray-500 shrink-0" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleNavigate('/user/explore')}
                      placeholder={SEARCH_PLACEHOLDERS[placeholderIndex]}
                      className="w-full bg-transparent text-xs font-semibold text-[#121815] dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none transition-all"
                    />
                  </div>

                  {/* High-Contrast Action Button */}
                  <button
                    type="button"
                    onClick={() => handleNavigate('/user/explore')}
                    className="flex items-center justify-center gap-2 rounded-xl bg-[#121815] dark:bg-[#d9f447] px-6 py-3.5 text-xs font-black text-[#d9f447] dark:text-[#121815] transition-all hover:opacity-90 active:scale-98 shrink-0 shadow-xs"
                  >
                    <span>Explore Curation</span>
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── EDITORIAL PROVENANCE TICKER ── */}
          <div className="mt-8 sm:mt-16 pt-5 sm:pt-8 border-t border-black/5 dark:border-white/10">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 text-center lg:text-left text-[11px] sm:text-xs font-mono tracking-wider uppercase text-gray-500 dark:text-gray-400">
              <div className="p-2 sm:p-0 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] sm:bg-transparent">
                <span className="text-[#121815] dark:text-white font-extrabold">25 MIN</span> AVERAGE DISPATCH
              </div>
              <div className="p-2 sm:p-0 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] sm:bg-transparent">
                <span className="text-[#121815] dark:text-white font-extrabold">120+</span> VERIFIED HEARTHS
              </div>
              <div className="p-2 sm:p-0 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] sm:bg-transparent">
                <span className="text-[#121815] dark:text-white font-extrabold">4.9 ★</span> CLIENT SATISFACTION
              </div>
              <div className="p-2 sm:p-0 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] sm:bg-transparent">
                <span className="text-[#121815] dark:text-white font-extrabold">ZERO</span> CONVENIENCE SURCHARGE
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* =========================================================================
          THE 3 CORE EXPERIENCES: FOOD DELIVERY × 15-MIN BLINKIT × DINING
         ========================================================================= */}
      <section className="py-8 sm:py-16 bg-white dark:bg-[#0c120e] border-t border-b border-black/5 dark:border-white/10">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <div className="grid gap-3.5 sm:gap-6 md:grid-cols-3">
            {/* PORTAL 1: FOOD DELIVERY */}
            <div
              onClick={() => handleNavigate('/user/explore')}
              className="group cursor-pointer rounded-2xl sm:rounded-3xl border border-black/10 dark:border-white/10 bg-gray-50/70 dark:bg-[#111714] p-4 sm:p-6 lg:p-7 transition-all duration-300 hover:shadow-xl hover:border-black/20 dark:hover:border-white/20 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="grid size-9 sm:size-11 place-items-center rounded-xl sm:rounded-2xl bg-[#121815] text-[#d9f447] dark:bg-[#d9f447] dark:text-[#121815] shadow-xs">
                    <UtensilsCrossed className="size-4 sm:size-5" />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-black tracking-wider uppercase text-gray-400 dark:text-gray-500">
                    Average 24 min
                  </span>
                </div>

                <div className="mt-3 sm:mt-6 space-y-1 sm:space-y-2">
                  <h3 className="text-base sm:text-xl font-black text-[#121815] dark:text-white tracking-tight">
                    Food Delivery
                  </h3>
                  <p className="text-[11px] sm:text-xs text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
                    Order from verified neighbourhood kitchens. Tamper-proof packaging, genuine
                    restaurant pricing, and dedicated e-bike riders.
                  </p>
                </div>
              </div>

              <div className="mt-4 sm:mt-8 flex items-center justify-between pt-3 sm:pt-4 border-t border-black/5 dark:border-white/5 text-xs font-black">
                <span className="text-[#121815] dark:text-white group-hover:translate-x-0.5 transition-transform">
                  Explore Kitchens
                </span>
                <ArrowRight className="size-3.5 sm:size-4 text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
              </div>
            </div>

            {/* PORTAL 2: BLINKIT-STYLE 15-MINUTE INSTANT GROCERY */}
            <div
              onClick={() => handleNavigate('/user/cravexp')}
              className="group cursor-pointer rounded-2xl sm:rounded-3xl border border-[#d9f447]/50 dark:border-[#d9f447]/30 bg-gradient-to-b from-[#f8faed] to-white dark:from-[#131b16] dark:to-[#111714] p-4 sm:p-6 lg:p-7 transition-all duration-300 hover:shadow-xl hover:border-[#5e8210] dark:hover:border-[#d9f447] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="grid size-9 sm:size-11 place-items-center rounded-xl sm:rounded-2xl bg-[#d9f447] text-[#121815] shadow-xs font-black">
                    <Zap className="size-4 sm:size-5 fill-current" />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-black tracking-wider uppercase text-[#5e8210] dark:text-[#d9f447]">
                    10-15 Min Flash Drop
                  </span>
                </div>

                <div className="mt-3 sm:mt-6 space-y-1 sm:space-y-2">
                  <h3 className="text-base sm:text-xl font-black text-[#121815] dark:text-white tracking-tight">
                    CraveXP Instamart
                  </h3>
                  <p className="text-[11px] sm:text-xs text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
                    Hyper-local dark-store essentials. Fresh dairy, cold beverages, gelato tubs,
                    and snacks packed in 120s with IoT cold-chain protection.
                  </p>
                </div>
              </div>

              <div className="mt-4 sm:mt-8 flex items-center justify-between pt-3 sm:pt-4 border-t border-black/5 dark:border-white/5 text-xs font-black">
                <span className="text-[#5e8210] dark:text-[#d9f447] group-hover:translate-x-0.5 transition-transform">
                  Shop 15-Min Store
                </span>
                <ArrowRight className="size-3.5 sm:size-4 text-[#5e8210] dark:text-[#d9f447]" />
              </div>
            </div>

            {/* PORTAL 3: EXCLUSIVE OFFERS & VALUE */}
            <div
              onClick={() => handleNavigate('/user/explore')}
              className="group cursor-pointer rounded-2xl sm:rounded-3xl border border-black/10 dark:border-white/10 bg-gray-50/70 dark:bg-[#111714] p-4 sm:p-6 lg:p-7 transition-all duration-300 hover:shadow-xl hover:border-black/20 dark:hover:border-white/20 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="grid size-9 sm:size-11 place-items-center rounded-xl sm:rounded-2xl bg-gray-200 dark:bg-white/10 text-[#121815] dark:text-white shadow-xs">
                    <Tag className="size-4 sm:size-5" />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-black tracking-wider uppercase text-gray-400 dark:text-gray-500">
                    Transparent Savings
                  </span>
                </div>

                <div className="mt-3 sm:mt-6 space-y-1 sm:space-y-2">
                  <h3 className="text-base sm:text-xl font-black text-[#121815] dark:text-white tracking-tight">
                    Chef Specials &amp; Combos
                  </h3>
                  <p className="text-[11px] sm:text-xs text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
                    Verified restaurant partner coupons, family sharing trays, and complimentary
                    add-ons with no surprise convenience fees.
                  </p>
                </div>
              </div>

              <div className="mt-4 sm:mt-8 flex items-center justify-between pt-3 sm:pt-4 border-t border-black/5 dark:border-white/5 text-xs font-black">
                <span className="text-[#121815] dark:text-white group-hover:translate-x-0.5 transition-transform">
                  View Today&apos;s Specials
                </span>
                <ArrowRight className="size-3.5 sm:size-4 text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          ZOMATO-STYLE CURATED KITCHENS (TOP RATED ON KANAKAPURA ROAD)
         ========================================================================= */}
      <section className="py-8 sm:py-18 bg-white dark:bg-[#0c120e] border-t border-black/5 dark:border-white/10">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-5 sm:mb-8 gap-2.5">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                <Star className="size-3.5 text-amber-500 fill-amber-500" />
                <span>Verified Neighbourhood Kitchens</span>
              </div>
              <h2 className="text-xl sm:text-3xl font-black tracking-tight text-[#121815] dark:text-white">
                Top Rated Culinary Partners
              </h2>
            </div>
            <button
              type="button"
              onClick={() => handleNavigate('/user/explore')}
              className="text-xs font-black text-[#5e8210] dark:text-[#d9f447] hover:underline flex items-center gap-1 self-start sm:self-auto"
            >
              <span>Explore All Restaurants</span>
              <ChevronRight className="size-3.5" />
            </button>
          </div>

          <div className="grid gap-3.5 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
            {FEATURED_KITCHENS.map((k) => (
              <div
                key={k.id}
                onClick={() => handleNavigate(k.path)}
                className="group cursor-pointer rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#111714] overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-black/20 dark:hover:border-white/20 flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-36 sm:h-44 w-full overflow-hidden bg-gray-100 dark:bg-white/5">
                    <img
                      src={k.image}
                      alt={k.name}
                      loading="lazy"
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-2.5 right-2.5 rounded-lg bg-emerald-600 text-white px-2 py-0.5 text-[10px] sm:text-[11px] font-black flex items-center gap-1 shadow-sm">
                      <span>{k.rating}</span>
                      <Star className="size-2.5 fill-current" />
                    </div>
                    <div className="absolute bottom-2.5 left-2.5 rounded-md bg-[#121815]/90 text-white px-2 py-0.5 text-[10px] font-bold backdrop-blur-md">
                      {k.deliveryTime} • {k.distance}
                    </div>
                  </div>

                  <div className="p-3.5 sm:p-4 space-y-1">
                    <h3 className="text-sm font-black text-[#121815] dark:text-white group-hover:text-[#5e8210] dark:group-hover:text-[#d9f447] transition-colors truncate">
                      {k.name}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">{k.cuisine}</p>
                    <p className="text-[10px] sm:text-[11px] font-semibold text-gray-400 dark:text-gray-500 truncate">
                      {k.tag}
                    </p>
                  </div>
                </div>

                <div className="px-3.5 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px]">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 truncate">
                    {k.offer}
                  </span>
                  <ArrowRight className="size-3 text-gray-400 shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          APPLE-GRADE METRICS & DISCIPLINE BAR
         ========================================================================= */}
      <section className="py-8 sm:py-14 bg-[#fbfcfb] dark:bg-[#080d0a] border-t border-black/5 dark:border-white/10">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-6 text-center divide-y-0 md:divide-x divide-black/5 dark:divide-white/10">
            <div className="p-3 sm:p-0 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] md:bg-transparent">
              <p className="text-2xl sm:text-4xl font-black text-[#121815] dark:text-white tracking-tight">
                25 min
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-semibold mt-1">
                Average doorstep delivery speed
              </p>
            </div>
            <div className="p-3 sm:p-0 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] md:bg-transparent">
              <p className="text-2xl sm:text-4xl font-black text-[#121815] dark:text-white tracking-tight">
                120+
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-semibold mt-1">
                Local kitchen &amp; artisan partners
              </p>
            </div>
            <div className="p-3 sm:p-0 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] md:bg-transparent">
              <p className="text-2xl sm:text-4xl font-black text-[#121815] dark:text-white tracking-tight flex items-center justify-center">
                <span>4.9</span>
                <Star className="size-4 sm:size-6 fill-amber-500 text-amber-500 ml-1.5" />
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-semibold mt-1">
                Customer satisfaction score
              </p>
            </div>
            <div className="p-3 sm:p-0 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] md:bg-transparent">
              <p className="text-2xl sm:text-4xl font-black text-[#121815] dark:text-white tracking-tight">
                Zero
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-semibold mt-1">
                Hidden platform markups
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          FINAL CONFIDENT ACTION BANNER
         ========================================================================= */}
      <section className="py-8 sm:py-20 bg-white dark:bg-[#0c120e] border-t border-black/5 dark:border-white/10">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl sm:rounded-3xl bg-[#121815] text-white p-6 sm:p-14 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8 border border-black/10">
            <div className="space-y-2 sm:space-y-3 max-w-xl text-center md:text-left">
              <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                Real food. Real speed. <br />
                <span className="text-[#d9f447]">Ready when you are.</span>
              </h2>
              <p className="text-xs sm:text-sm text-gray-300 font-medium leading-relaxed">
                Experience instant ordering with transparent billing and live GPS driver tracking.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleNavigate('/user/explore')}
              className="w-full sm:w-auto justify-center rounded-xl bg-[#d9f447] text-[#121815] px-6 py-3.5 sm:px-8 sm:py-4 text-xs font-black shadow-lg hover:bg-[#c2dc3a] transition-all active:scale-98 shrink-0 flex items-center gap-2"
            >
              <span>Explore All Kitchens</span>
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <Footer />
    </div>
  )
}
