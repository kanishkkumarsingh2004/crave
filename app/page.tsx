'use client'

import Footer from '@/components/Footer'
import Navbar from '@/components/Navbar'
import { ExploreSkeleton } from '@/components/ui/CraveSkeleton'
import { useAuth } from '@/lib/auth-context'
import {
  ArrowRight,
  ChevronRight,
  Download,
  LogOut,
  MapPin,
  Navigation,
  Search,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Tag,
  UtensilsCrossed,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

const CUSTOMER_ANDROID_APK_URL =
  'https://raw.githubusercontent.com/kanishkkumarsingh2004/crave/main/android-builds/crave-customer-debug.apk'

function AppDownloadPopup({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-[32px] bg-white dark:bg-[#121815] border border-black/10 dark:border-white/15 shadow-[0_30px_70px_rgba(0,0,0,0.45)] p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-200 relative overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Specular Top Rim Highlight */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 dark:via-white/40 to-transparent" />

        <div className="flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#86a018]/15 text-[#5e8210] dark:text-[#a0c21e] text-[10px] font-bold tracking-wide uppercase mb-1">
              <Sparkles className="size-3" />
              <span>Apple HIG Mobile Client</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-[#18201c] dark:text-white mt-1">
              Download crave<span className="text-[#86a018]">.</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 place-items-center rounded-full bg-black/5 dark:bg-white/10 text-gray-500 hover:text-black dark:text-gray-300 dark:hover:text-white text-lg transition-colors cursor-pointer"
          >
            ×
          </button>
        </div>

        <p className="text-xs text-gray-600 dark:text-gray-300 font-normal leading-relaxed">
          Ultra-low latency instant ordering, live telemetry rider tracking, and dynamic island notifications on your phone.
        </p>

        <div className="space-y-3">
          <a
            href={CUSTOMER_ANDROID_APK_URL}
            target="_blank"
            rel="noopener noreferrer"
            download="crave-customer-debug.apk"
            className="group flex items-center gap-3.5 rounded-2xl bg-[#18201c] dark:bg-white text-white dark:text-[#18201c] p-4 shadow-lg hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer"
          >
            <span className="grid size-11 place-items-center rounded-xl bg-white/10 dark:bg-black/10 shrink-0">
              <Download className="size-5 text-[#86a018] dark:text-[#5e8210]" />
            </span>
            <div className="flex flex-col text-left min-w-0">
              <span className="text-xs font-bold leading-tight">Android Native APK</span>
              <span className="text-[11px] opacity-75 truncate">v1.0.4 • Direct Download</span>
              <span className="text-[9px] font-semibold text-emerald-400 dark:text-emerald-700 mt-0.5">
                Verified SHA-256 Checksum
              </span>
            </div>
            <ArrowRight className="size-4 ml-auto text-[#86a018] group-hover:translate-x-1 transition-transform" />
          </a>

          <div className="flex items-center gap-3.5 rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.04] p-3.5 text-gray-500 dark:text-gray-400">
            <span className="grid size-10 place-items-center rounded-xl bg-black/5 dark:bg-white/5 shrink-0">
              <Smartphone className="size-5" />
            </span>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-200">iOS & visionOS</span>
              <span className="text-[11px] opacity-70">Coming soon on TestFlight</span>
            </div>
            <span className="ml-auto text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10">
              Beta
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

const POPULAR_SEARCH_CHIPS = [
  'Woodfired Neapolitan',
  'Hyderabadi Dum Biryani',
  'Cold Brew Coffee',
  '10-Min Groceries',
  'Sourdough Pizza',
  'Artisanal Gelato',
  'Kathi Rolls',
]

const FOOD_CATEGORIES = [
  {
    id: 'pizza',
    label: 'Artisanal Pizza',
    tagline: 'Woodfired & Sourdough',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80',
    query: 'Pizza',
  },
  {
    id: 'biryani',
    label: 'Dum Biryani',
    tagline: 'Hyderabadi & Awadhi',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=400&q=80',
    query: 'Biryani',
  },
  {
    id: 'burgers',
    label: 'Gourmet Burgers',
    tagline: 'Flame-Grilled & Smashed',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80',
    query: 'Burger',
  },
  {
    id: 'cravexp',
    label: 'CraveXP Mart',
    tagline: 'Groceries & Essentials',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
    query: 'Groceries',
    path: '/user/cravexp',
  },
  {
    id: 'asian',
    label: 'Asian & Momos',
    tagline: 'Dimsums & Wok Noodles',
    image: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=400&q=80',
    query: 'Momos',
  },
  {
    id: 'desserts',
    label: 'Gelato & Bakes',
    tagline: 'Artisanal Cakes & Cold Brew',
    image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=400&q=80',
    query: 'Dessert',
  },
  {
    id: 'healthy',
    label: 'Healthy Bowls',
    tagline: 'Macro & Fresh Salads',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=400&q=80',
    query: 'Healthy',
  },
  {
    id: 'wraps',
    label: 'Rolls & Wraps',
    tagline: 'Kathi Rolls & Shawarma',
    image: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=400&q=80',
    query: 'Rolls',
  },
]

const CORE_PORTALS = [
  {
    id: 'gourmet',
    title: 'Gourmet Kitchens',
    badge: 'Dining Delivery',
    subtitle: 'From Bengaluru’s top culinary spots',
    description: 'Authentic stone-hearth pizzerias, slow-cooked royal dum biryanis, and chef bistros delivered straight to your table.',
    image: '/banners/gourmet-feast.jpg',
    actionText: 'Explore Kitchens',
    path: '/user/explore',
    icon: UtensilsCrossed,
  },
  {
    id: 'cravexp',
    title: 'CraveXP Flash Mart',
    badge: 'Instant Essentials',
    subtitle: 'Dark store micro-hubs nearby',
    description: 'Artisanal cold brew, dairy, fresh bakery, craft sodas, and late-night munchies packed with insulated cooling.',
    image: '/banners/cravexp-grocery.jpg',
    actionText: 'Open Flash Mart',
    path: '/user/cravexp',
    icon: Zap,
  },
  {
    id: 'specials',
    title: 'Chef Specials & Combos',
    badge: 'Direct Rates',
    subtitle: 'Zero hidden menu markups',
    description: 'Curated tasting sets and combo meals at transparent, direct in-store dine-in prices with no inflated surcharges.',
    image: '/banners/midnight-feast.jpg',
    actionText: 'View Specials',
    path: '/user/explore',
    icon: Tag,
  },
]

export default function HomePage() {
  const { user, role, isLoading, logout } = useAuth()
  const router = useRouter()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLocation, setSelectedLocation] = useState('Kanakapura Road, Bengaluru')
  const [redirectTimeoutExceeded, setRedirectTimeoutExceeded] = useState(false)
  const [showAppPopup, setShowAppPopup] = useState(false)
  const [activeTab, setActiveTab] = useState<'kitchens' | 'cravexp' | 'specials'>('kitchens')
  
  const hasNavigated = useRef(false)

  // Compute target dashboard URL based on operational user role
  const getTargetDashboard = () => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const redirectParam = urlParams.get('redirect') || urlParams.get('next')
      if (redirectParam && redirectParam.startsWith('/')) {
        return redirectParam
      }
    }
    return role === 'admin'
      ? '/admin/dashboard'
      : role === 'rider' || (role as string) === 'driver'
        ? '/driver/dashboard'
        : role === 'restaurant_vendor' || (role as string) === 'vendor'
          ? '/vendor/dashboard'
          : role === 'cravexp_store_vendor'
            ? '/vendor/crave-ep'
            : role === 'user' || role === 'customer'
              ? '/user/explore'
              : null
  }

  // Preserve authentication redirects to designated operational cockpits
  useEffect(() => {
    if (hasNavigated.current) return
    if (!isLoading && user) {
      const targetDashboard = getTargetDashboard()
      if (targetDashboard) {
        hasNavigated.current = true
        router.replace(targetDashboard)

        const timer = setTimeout(() => {
          setRedirectTimeoutExceeded(true)
        }, 3500)

        return () => clearTimeout(timer)
      }
    }
  }, [user, role, isLoading, router])

  const targetDashboard = getTargetDashboard()
  if (!isLoading && user && targetDashboard) {
    return <ExploreSkeleton />
  }

  const handleNavigate = (path: string) => {
    if (user) {
      router.push(path)
    } else {
      router.push(path.startsWith('/user') ? path : '/login')
    }
  }

  const handleSearchSubmit = (query?: string) => {
    const term = (query !== undefined ? query : searchQuery).trim()
    if (term) {
      handleNavigate(`/user/explore?q=${encodeURIComponent(term)}`)
    } else {
      handleNavigate('/user/explore')
    }
  }

  return (
    <div className="min-h-screen bg-[#fafbfa] dark:bg-[#0a0f0c] text-[#18201c] dark:text-[#f2f4f2] selection:bg-[#86a018] selection:text-white antialiased transition-colors duration-300">
      <Navbar />

      {/* =========================================================================
          HERO SECTION: APPLE VISIONOS LIQUID GLASS COCKPIT (PRESERVED)
         ========================================================================= */}
      <section className="relative overflow-hidden pt-6 sm:pt-12 pb-16 lg:pt-14 lg:pb-24">
        {/* Iridescent Refraction Ambient Lighting (Warm Amber + Crave Accent Green + Soft Emerald) */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 -z-10 w-[980px] h-[550px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#86a018]/25 via-emerald-600/10 to-transparent blur-[120px] opacity-80 dark:opacity-60" />
        <div className="pointer-events-none absolute top-1/3 -right-32 -z-10 size-[420px] bg-amber-400/10 dark:bg-amber-500/5 rounded-full blur-[100px]" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(#18201c_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:36px_36px] opacity-[0.025] dark:opacity-[0.035]" />

        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          
          {/* ── 2. HERO HEADLINE & MANIFESTO ── */}
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-[84px] font-bold tracking-[-0.04em] text-[#18201c] dark:text-white leading-[0.98]">
              Taste pure quality.{' '}
              <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-[#18201c] via-[#4d5e18] to-[#86a018] dark:from-white dark:via-[#cde659] dark:to-[#86a018] bg-clip-text text-transparent">
                Delivered to your door.
              </span>
            </h1>

            <p className="text-sm sm:text-base lg:text-lg text-stone-600 dark:text-stone-300 font-normal leading-relaxed max-w-2xl mx-auto">
              From verified neighbourhood artisan kitchens to instant grocery essentials. Direct restaurant menu pricing, zero hidden markups, and live GPS map tracking across Bengaluru.
            </p>

            {/* ── 3. APPLE SEGMENTED GLASS SWITCHER CONTROL ── */}
            <div className="pt-2 flex justify-center">
              <div className="apple-liquid-glass p-1.5 rounded-full inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('kitchens')}
                  className={`px-4 sm:px-6 py-2 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    activeTab === 'kitchens'
                      ? 'bg-[#18201c] text-white dark:bg-white dark:text-[#18201c] shadow-md scale-[1.02]'
                      : 'text-stone-600 dark:text-stone-300 hover:text-black dark:hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <UtensilsCrossed className="size-3.5" />
                    <span>Gourmet Kitchens</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('cravexp')}
                  className={`px-4 sm:px-6 py-2 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    activeTab === 'cravexp'
                      ? 'bg-[#86a018] text-white shadow-md scale-[1.02]'
                      : 'text-stone-600 dark:text-stone-300 hover:text-black dark:hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Zap className="size-3.5 fill-current" />
                    <span>CraveXP 10-Min</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('specials')}
                  className={`px-4 sm:px-6 py-2 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    activeTab === 'specials'
                      ? 'bg-[#18201c] text-white dark:bg-white dark:text-[#18201c] shadow-md scale-[1.02]'
                      : 'text-stone-600 dark:text-stone-300 hover:text-black dark:hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Tag className="size-3.5" />
                    <span>Chef Specials</span>
                  </span>
                </button>
              </div>
            </div>

            {/* ── 4. ARCHITECTURAL SEARCH CAPSULE (APPLE GLASS) ── */}
            <div className="pt-2 max-w-2xl mx-auto space-y-3.5">
              <div className="apple-liquid-glass rounded-[28px] p-2.5 transition-all hover:border-[#86a018]/40">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  {/* Location Selector */}
                  <div className="flex items-center gap-2.5 rounded-[20px] bg-black/[0.03] dark:bg-white/[0.06] px-4 py-3 sm:max-w-[210px] shrink-0 border border-black/5 dark:border-white/5">
                    <MapPin className="size-4 text-[#86a018] shrink-0" />
                    <input
                      type="text"
                      aria-label="Delivery location"
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="w-full bg-transparent text-xs font-semibold text-[#18201c] dark:text-white outline-none truncate"
                    />
                  </div>

                  {/* Search Field */}
                  <div className="flex-1 flex items-center gap-2.5 rounded-[20px] bg-black/[0.03] dark:bg-white/[0.06] px-4 py-3 border border-black/5 dark:border-white/5 min-w-0">
                    <Search className="size-4 text-stone-400 dark:text-stone-400 shrink-0" />
                    <input
                      type="text"
                      aria-label="Search dishes, restaurants, groceries, or essentials"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
                      placeholder={
                        activeTab === 'cravexp'
                          ? 'Search 10-min groceries, cold drinks, gelato...'
                          : activeTab === 'specials'
                            ? 'Search discounted chef combos & add-ons...'
                            : 'Search woodfired pizza, biryani, gourmet pasta...'
                      }
                      className="w-full bg-transparent text-xs font-medium text-[#18201c] dark:text-white placeholder:text-stone-400 dark:placeholder:text-stone-500 outline-none"
                    />
                  </div>

                  {/* Action Push Button */}
                  <button
                    type="button"
                    onClick={() => handleSearchSubmit()}
                    className="flex items-center justify-center gap-2 rounded-[20px] bg-[#18201c] dark:bg-[#86a018] px-6 py-3.5 text-xs font-bold text-white dark:text-[#18201c] transition-all hover:opacity-90 active:scale-[0.98] shrink-0 shadow-md cursor-pointer"
                  >
                    <span>Explore</span>
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>
              </div>

              {/* Clickable Popular Keyword Glass Chips */}
              <div className="flex items-center justify-center flex-wrap gap-1.5 pt-1 text-[11px]">
                <span className="text-stone-400 dark:text-stone-500 font-medium mr-1 hidden sm:inline">
                  Popular:
                </span>
                {POPULAR_SEARCH_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => {
                      setSearchQuery(chip)
                      handleSearchSubmit(chip)
                    }}
                    className="rounded-full bg-black/[0.04] dark:bg-white/[0.06] hover:bg-[#86a018]/15 hover:text-[#5e8210] dark:hover:text-[#a0c21e] border border-black/5 dark:border-white/5 text-stone-600 dark:text-stone-300 px-3 py-1 font-medium transition-colors cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* =========================================================================
          WHAT ARE YOU CRAVING? (VISUAL FOOD CATEGORY EXPLORATION)
         ========================================================================= */}
      <section className="py-12 sm:py-18 relative">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-10 gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#86a018] uppercase tracking-wider">
                <Sparkles className="size-3.5" />
                <span>Explore by Craving</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[#18201c] dark:text-white">
                What are you craving today?
              </h2>
              <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
                Tap any favourite to discover local artisan kitchens and dark store essentials.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleNavigate('/user/explore')}
              className="self-start md:self-auto text-xs font-semibold text-[#86a018] hover:text-[#5e8210] dark:hover:text-[#a0c21e] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>See Full Menu</span>
              <ChevronRight className="size-4" />
            </button>
          </div>

          {/* Continuous Squircle Food Category Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
            {FOOD_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  if (cat.path) {
                    handleNavigate(cat.path)
                  } else {
                    handleSearchSubmit(cat.query)
                  }
                }}
                className="group apple-glass-card rounded-[24px] p-2.5 sm:p-3 flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-1 hover:border-[#86a018]/40 cursor-pointer"
              >
                <div className="size-16 sm:size-20 rounded-[20px] overflow-hidden mb-2.5 bg-stone-100 dark:bg-stone-800 relative shadow-sm">
                  <img
                    src={cat.image}
                    alt={cat.label}
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
                <span className="text-xs font-bold text-[#18201c] dark:text-white group-hover:text-[#86a018] transition-colors leading-tight truncate w-full">
                  {cat.label}
                </span>
                <span className="text-[10px] text-stone-400 font-medium truncate w-full mt-0.5">
                  {cat.tagline}
                </span>
              </button>
            ))}
          </div>

        </div>
      </section>

      {/* =========================================================================
          THE THREE CORE WAYS TO ORDER (APP CONTEXT WITHOUT FAKE PROMISES)
         ========================================================================= */}
      <section className="py-12 sm:py-16 bg-stone-50/70 dark:bg-[#0c120e]/60 border-t border-b border-black/5 dark:border-white/10">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          
          <div className="max-w-2xl mx-auto text-center space-y-2 mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[#18201c] dark:text-white">
              Three ways to order on crave<span className="text-[#86a018]">.</span>
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 font-normal">
              Fresh chef cooking, hyper-local dark store essentials, and direct restaurant rates.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {CORE_PORTALS.map((portal) => {
              const Icon = portal.icon
              return (
                <div
                  key={portal.id}
                  onClick={() => handleNavigate(portal.path)}
                  className="apple-glass-card rounded-[32px] overflow-hidden group cursor-pointer flex flex-col justify-between border border-black/8 dark:border-white/10 transition-all duration-300 hover:-translate-y-1"
                >
                  <div>
                    <div className="relative h-44 sm:h-48 w-full overflow-hidden bg-stone-200 dark:bg-stone-800">
                      <img
                        src={portal.image}
                        alt={portal.title}
                        loading="lazy"
                        className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                      <div className="absolute top-3.5 left-3.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white px-3 py-1 text-[11px] font-bold flex items-center gap-1.5">
                        <Icon className="size-3 text-[#86a018]" />
                        <span>{portal.badge}</span>
                      </div>
                      <div className="absolute bottom-3 left-4 right-4 text-white">
                        <h3 className="text-lg font-bold tracking-tight">{portal.title}</h3>
                        <p className="text-[11px] text-stone-300 truncate">{portal.subtitle}</p>
                      </div>
                    </div>

                    <div className="p-5 sm:p-6">
                      <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed font-normal">
                        {portal.description}
                      </p>
                    </div>
                  </div>

                  <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-xs">
                    <span className="font-bold text-[#86a018] group-hover:text-[#5e8210] dark:group-hover:text-[#a0c21e] transition-colors">
                      {portal.actionText}
                    </span>
                    <div className="grid size-8 place-items-center rounded-full bg-black/5 dark:bg-white/10 group-hover:bg-[#86a018] group-hover:text-white transition-colors">
                      <ArrowRight className="size-4" />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

        </div>
      </section>

      {/* =========================================================================
          TRANSPARENT HOW-IT-WORKS (GROUNDED WORKFLOW, NO EXAGGERATED CLAIMS)
         ========================================================================= */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          
          <div className="max-w-2xl mx-auto text-center space-y-2 mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[#18201c] dark:text-white">
              Food delivery, made honest.
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 font-normal">
              Simple steps from ordering to your table with direct restaurant prices.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            
            <div className="apple-glass-card rounded-[28px] p-6 sm:p-7 space-y-3">
              <div className="size-11 rounded-2xl bg-[#86a018]/15 text-[#86a018] flex items-center justify-center font-bold">
                <ShoppingBag className="size-5" />
              </div>
              <h3 className="text-base font-bold text-[#18201c] dark:text-white">
                1. Browse Real Menus
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed font-normal">
                Explore hand-crafted dishes from neighbourhood favourites and essentials from CraveXP with zero inflated markups.
              </p>
            </div>

            <div className="apple-glass-card rounded-[28px] p-6 sm:p-7 space-y-3">
              <div className="size-11 rounded-2xl bg-[#86a018]/15 text-[#86a018] flex items-center justify-center font-bold">
                <UtensilsCrossed className="size-5" />
              </div>
              <h3 className="text-base font-bold text-[#18201c] dark:text-white">
                2. Freshly Cooked &amp; Packed
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed font-normal">
                Every meal is prepared to order by verified kitchen partners and sealed in secure, hygienic food-safe packaging.
              </p>
            </div>

            <div className="apple-glass-card rounded-[28px] p-6 sm:p-7 space-y-3">
              <div className="size-11 rounded-2xl bg-[#86a018]/15 text-[#86a018] flex items-center justify-center font-bold">
                <Navigation className="size-5" />
              </div>
              <h3 className="text-base font-bold text-[#18201c] dark:text-white">
                3. Live GPS Telemetry
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed font-normal">
                Follow your rider on the interactive map with sub-meter location updates directly to your doorstep.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* =========================================================================
          KEYNOTE FINALE CALL TO ACTION BANNER
         ========================================================================= */}
      <section className="py-14 sm:py-24">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <div className="rounded-[36px] bg-gradient-to-br from-[#18201c] to-[#0a100c] text-white p-8 sm:p-16 shadow-[0_30px_70px_rgba(0,0,0,0.5)] flex flex-col md:flex-row items-center justify-between gap-8 border border-white/15 relative overflow-hidden">
            {/* Top Specular Rim Reflection */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            <div className="pointer-events-none absolute -bottom-20 -right-20 size-80 bg-[#86a018]/25 rounded-full blur-3xl" />

            <div className="space-y-3 max-w-xl text-center md:text-left relative z-10">
              <h2 className="text-3xl sm:text-5xl font-bold tracking-tight leading-tight">
                Real food. Instant drop. <br />
                <span className="text-[#86a018]">Ready when you are.</span>
              </h2>
              <p className="text-xs sm:text-sm text-stone-300 font-normal leading-relaxed">
                Experience dining delivery and 10-minute groceries with zero hidden fees and live GPS tracking.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleNavigate('/user/explore')}
              className="w-full sm:w-auto rounded-full bg-[#86a018] text-white px-8 py-4 text-xs font-bold shadow-xl hover:bg-[#778f15] active:scale-95 transition-all shrink-0 flex items-center justify-center gap-2 cursor-pointer relative z-10"
            >
              <span>Explore All Kitchens</span>
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <Footer />

      {/* Floating Download Button */}
      <button
        type="button"
        onClick={() => setShowAppPopup(true)}
        aria-label="Download the CRAVE app"
        className="fixed bottom-6 right-6 z-[80] flex items-center gap-2 rounded-full bg-[#18201c] text-white dark:bg-white dark:text-[#18201c] px-4 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.35)] hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/10"
      >
        <Download className="size-4 text-[#86a018]" />
        <span className="text-xs font-bold">Get the App</span>
      </button>

      <AppDownloadPopup open={showAppPopup} onClose={() => setShowAppPopup(false)} />
    </div>
  )
}
