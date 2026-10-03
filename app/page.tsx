'use client'

import Navbar from '@/components/Navbar'
import { useAuth } from '@/lib/auth-context'
import {
  ArrowRight,
  Clock,
  DollarSign,
  MapPin,
  Receipt,
  Search,
  ShieldCheck,
  Star,
  Thermometer,
  Truck,
  UtensilsCrossed,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function HomePage() {
  const { user, role, isLoading } = useAuth()
  const router = useRouter()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCity, setSelectedCity] = useState('Kanakapura Road, Bengaluru')

  useEffect(() => {
    if (!isLoading && user) {
      const targetDashboard = role === 'customer' ? '/user/explore' : `/${role}/dashboard`
      router.replace(targetDashboard)
    }
  }, [user, role, isLoading, router])

  if (isLoading || user) {
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

  const handleStartOrdering = () => {
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-[#f8f9f7] text-[#18201c] selection:bg-[#d9f447] selection:text-[#18201c]">
      <Navbar />

      {/* =========================================================================
          HERO SECTION (CLEAN SVG ICONS, ZERO EMOJIS, ZERO OVERLAPPING DOTS)
         ========================================================================= */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-[#f4f7ed] to-[#f8f9f7] pb-16 pt-8 sm:pt-12 lg:pb-24 lg:pt-16">
        {/* Background Glow */}
        <div className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-[520px] w-[780px] -translate-x-1/2 rounded-full bg-[#d9f447]/30 blur-[130px]" />
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(#18201c 0.75px, transparent 0.75px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="mx-auto max-w-[1280px] px-5 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            {/* Left Hero Content */}
            <div className="lg:col-span-7">
              {/* Clean Icon Text Eyebrow (Zero Background Pills) */}
              <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[#70880e] mb-4">
                <MapPin className="size-3.5 text-[#849e16]" />
                <span>Live on Kanakapura Road, Bengaluru</span>
              </div>

              <h1 className="text-[clamp(2.75rem,5.5vw,5.25rem)] font-extrabold leading-[0.95] tracking-tight text-[#18201c]">
                Great food, <br />
                delivered <span className="text-[#849e16]">superfast.</span>
              </h1>

              <p className="mt-5 text-base sm:text-lg text-[#55635a] font-medium leading-relaxed max-w-xl">
                We focus 100% of our riders, top kitchens, &amp; 18-minute speeds exclusively on{' '}
                <span className="font-bold text-[#18201c] underline decoration-[#d9f447] decoration-2">
                  Kanakapura Road
                </span>
                .
              </p>

              {/* Location + Search Bar */}
              <div className="mt-8 rounded-3xl border-2 border-[#18201c]/10 bg-white p-2.5 shadow-2xl backdrop-blur-md max-w-2xl">
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
                      placeholder="Search biryani, pizza, momos, or burgers..."
                      className="w-full bg-transparent text-xs font-medium text-[#18201c] placeholder:text-[#83918a] focus:outline-none"
                    />
                  </div>

                  {/* Primary Find Food Button */}
                  <button
                    onClick={handleStartOrdering}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-[#18201c] px-6 py-3.5 text-xs font-extrabold text-white shadow-lg transition hover:bg-[#323f37] hover:scale-105 active:scale-95 shrink-0"
                  >
                    Find Food
                    <ArrowRight className="size-4 text-[#d9f447]" />
                  </button>
                </div>
              </div>

              {/* Trust Indicators */}
              <div className="mt-8 flex flex-wrap items-center gap-6 text-xs font-bold text-[#5e6b63]">
                <span className="flex items-center gap-2">
                  <Clock className="size-4 text-[#849e16]" /> 18 Min Kanakapura Express
                </span>
                <span className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-[#849e16]" /> 100% Sealed Packaging
                </span>
                <span className="flex items-center gap-2">
                  <Receipt className="size-4 text-[#849e16]" /> Zero Hidden Charges
                </span>
              </div>
            </div>

            {/* Right Hero Visual Card */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-sm rounded-[36px] border-4 border-white bg-[#121815] p-5 shadow-2xl text-white">
                {/* Header preview */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="grid size-7 place-items-center rounded-lg bg-[#d9f447] text-[#121815] font-extrabold text-xs">
                      C
                    </span>
                    <span className="text-xs font-bold">Kanakapura Drop Radar</span>
                  </div>
                  <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                    HYPER-LOCAL
                  </span>
                </div>

                {/* Hero Dish Image */}
                <div className="relative mt-4 overflow-hidden rounded-2xl h-48">
                  <img
                    src="https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=600&q=80"
                    alt="The Green Table"
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute bottom-3 right-3 rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-extrabold text-[#121815]">
                    18 MINS ETA
                  </span>
                </div>

                {/* Dish Info */}
                <div className="mt-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-white">The Green Table</h3>
                    <span className="flex items-center gap-1 text-xs font-bold text-[#d9f447]">
                      <Star className="size-3.5 fill-current" /> 4.9
                    </span>
                  </div>
                  <p className="text-[11px] text-white/60">
                    Konanakunte Cross · Healthy Bowls &amp; Smoothies
                  </p>
                </div>

                {/* Action button inside mock */}
                <button
                  onClick={handleStartOrdering}
                  className="mt-4 w-full rounded-2xl bg-[#d9f447] py-3 text-xs font-extrabold text-[#121815] shadow-lg hover:bg-[#c3dc38] transition"
                >
                  ORDER NOW — KANAKAPURA MENU
                </button>
              </div>

              {/* Floating Badge Overlay */}
              <div className="absolute -bottom-6 -left-6 rounded-2xl bg-white p-3.5 shadow-2xl border border-[#e2e7dc] hidden sm:flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-[#18201c] text-[#d9f447] font-bold">
                  <Zap className="size-5 fill-current" />
                </span>
                <div>
                  <p className="text-xs font-extrabold text-[#18201c]">Instant Metro GPS</p>
                  <p className="text-[10px] text-[#6b7770]">Live rider path on Kanakapura Rd</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          WHY CUSTOMERS LOVE CRAVE — CREATIVE GRAPHIC CARDS
         ========================================================================= */}
      <section id="why-crave" className="py-20 lg:py-28 bg-[#f8f9f7]">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#849e16]">
              No Fluff, Just Actual Good Delivery
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-[#18201c] tracking-tight">
              Why Kanakapura Road Orders on crave.
            </h2>
            <p className="mt-3 text-sm text-[#616d66]">
              We stripped away boring corporate buzzwords and built hyper-local tech that actually
              works.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {/* GRAPHIC CARD 1: LIVE RADAR MINI WIDGET */}
            <div className="group rounded-[36px] border-2 border-[#e2e7dc] bg-white p-7 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-[#849e16] hover:shadow-2xl relative overflow-hidden flex flex-col justify-between">
              <div>
                {/* Graphic Visual Header */}
                <div className="rounded-3xl bg-[#121815] p-4 text-white shadow-inner relative overflow-hidden mb-6 border border-white/10">
                  <div className="flex items-center justify-between text-[11px] font-mono text-white/60 mb-2">
                    <span className="flex items-center gap-1.5 text-[#d9f447]">
                      <span className="size-2 rounded-full bg-[#d9f447] animate-ping" /> LIVE GPS
                      RADAR
                    </span>
                    <span>14 MIN REMAINING</span>
                  </div>

                  {/* Route Progress Graphic Bar */}
                  <div className="relative h-2 w-full bg-white/10 rounded-full overflow-hidden my-3">
                    <div className="h-full w-3/4 bg-gradient-to-r from-[#849e16] to-[#d9f447] rounded-full animate-pulse" />
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold text-white">
                    <span className="flex items-center gap-1">
                      <UtensilsCrossed className="size-3.5 text-amber-400" /> Kitchen (Prep Done)
                    </span>
                    <span className="flex items-center gap-1 text-[#d9f447]">
                      <Truck className="size-3.5" /> Doorstep
                    </span>
                  </div>
                </div>

                <h3 className="text-xl font-extrabold text-[#18201c]">Lightning GPS Delivery</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#616d66]">
                  No mysterious 45-minute delays near silk board traffic. Our riders focus 100% on
                  Kanakapura Road corridors for sub-20 minute drops!
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-[#f0f4eb] flex items-center justify-between text-xs font-bold text-[#849e16]">
                <span className="flex items-center gap-1">
                  <Zap className="size-3.5 text-[#849e16]" /> Avg 18 Min Speed
                </span>
              </div>
            </div>

            {/* GRAPHIC CARD 2: TAMPER-PROOF SECURITY TAPE WIDGET */}
            <div className="group rounded-[36px] border-2 border-[#e2e7dc] bg-white p-7 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500 hover:shadow-2xl relative overflow-hidden flex flex-col justify-between">
              <div>
                {/* Graphic Visual Header */}
                <div className="rounded-3xl bg-emerald-950 p-4 text-white shadow-inner relative overflow-hidden mb-6 border border-emerald-800/40">
                  {/* Security Tape Strip */}
                  <div className="flex items-center justify-between rounded-xl bg-emerald-500/20 border border-emerald-400/40 p-2.5 mb-2 text-emerald-300 text-xs font-mono font-bold">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="size-4 text-emerald-400" /> DIGITAL SEAL OK
                    </span>
                    <span className="rounded bg-emerald-400 text-[#121815] px-1.5 py-0.5 text-[9px] font-extrabold">
                      SEALED
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-emerald-200/80 font-medium">
                    <span className="flex items-center gap-1">
                      <Thermometer className="size-3.5 text-amber-400" /> 68°C Thermal Bag
                    </span>
                    <span>Hygiene 9.9/10</span>
                  </div>
                </div>

                <h3 className="text-xl font-extrabold text-[#18201c]">Tamper-Proof Packaging</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#616d66]">
                  Every box is sealed with thermal security tape. Your burger arrives exactly as the
                  chef cooked it — untampered, hot, and delicious.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-[#f0f4eb] flex items-center justify-between text-xs font-bold text-emerald-700">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="size-3.5 text-emerald-600" /> Cleanliness Audit 100%
                </span>
              </div>
            </div>

            {/* GRAPHIC CARD 3: TRANSPARENT RECEIPT WIDGET */}
            <div className="group rounded-[36px] border-2 border-[#e2e7dc] bg-white p-7 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-purple-500 hover:shadow-2xl relative overflow-hidden flex flex-col justify-between">
              <div>
                {/* Graphic Receipt Breakdown Visual */}
                <div className="rounded-3xl bg-[#f8f9f6] p-4 text-[#18201c] border-2 border-dashed border-[#dce3d5] mb-6 relative">
                  <div className="flex items-center justify-between text-xs font-extrabold border-b border-[#e2e7dc] pb-2 mb-2">
                    <span className="flex items-center gap-1">
                      <Receipt className="size-3.5 text-purple-700" /> BILL BREAKDOWN
                    </span>
                    <span className="text-[10px] text-purple-700 font-mono">#CRV-KANAKAPURA</span>
                  </div>

                  <div className="flex flex-col gap-1 text-xs font-medium text-[#5c6861]">
                    <div className="flex justify-between">
                      <span>Artisanal Pizza x 1</span>
                      <span className="font-bold text-[#18201c]">₹350</span>
                    </div>
                    <div className="flex justify-between text-emerald-600">
                      <span>Delivery Fee</span>
                      <span className="font-bold">₹0 (WAIVED)</span>
                    </div>
                    <div className="flex justify-between text-rose-500 line-through text-[11px]">
                      <span>Surge Fee / Mystery Charge</span>
                      <span>₹0</span>
                    </div>
                  </div>

                  <div className="flex justify-between text-xs font-extrabold border-t border-[#e2e7dc] pt-2 mt-2 text-[#18201c]">
                    <span>Total Paid</span>
                    <span className="text-purple-700 font-extrabold">₹350</span>
                  </div>
                </div>

                <h3 className="text-xl font-extrabold text-[#18201c]">Zero Mystery Charges</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#616d66]">
                  What you see on the menu is what leaves your bank account. No last-minute
                  &quot;platform handling rain tax fee&quot; added at checkout.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-[#f0f4eb] flex items-center justify-between text-xs font-bold text-purple-700">
                <span className="flex items-center gap-1">
                  <DollarSign className="size-3.5 text-purple-700" /> 100% Transparent Price
                </span>
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
                Experience instant 1-tap reordering, live GPS driver tracking, and gourmet kitchen
                partners near you.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  onClick={handleStartOrdering}
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
          FOOTER (DARK ZOMATO-STYLE)
         ========================================================================= */}
      <footer className="bg-black py-16 text-xs text-gray-400">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-6 lg:px-8">
          {/* Top Brand Logo */}
          <div className="mb-10 pb-6 border-b border-gray-800/80">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl bg-[#d9f447] text-[#18201c] font-extrabold">
                <UtensilsCrossed className="size-5 fill-current" />
              </span>
              <span className="text-3xl font-extrabold tracking-tight text-white">
                crave<span className="text-[#d9f447]">.</span>
              </span>
            </Link>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 mb-12">
            <div>
              <p className="font-bold text-white text-sm tracking-wide mb-4">About crave.</p>
              <p className="text-xs leading-relaxed text-gray-400">
                Your favorite food delivered in 18 minutes on Kanakapura Road. Hot, fresh, and zero
                hassle.
              </p>
            </div>

            <div>
              <p className="font-bold text-white text-sm tracking-wide mb-4">For Customers</p>
              <ul className="flex flex-col gap-2.5">
                <li>
                  <button onClick={handleStartOrdering} className="hover:text-white transition">
                    Explore Kitchens
                  </button>
                </li>
                <li>
                  <button onClick={handleStartOrdering} className="hover:text-white transition">
                    My Active Orders
                  </button>
                </li>
                <li>
                  <button onClick={handleStartOrdering} className="hover:text-white transition">
                    Track Live Drop
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <p className="font-bold text-white text-sm tracking-wide mb-4">Company</p>
              <ul className="flex flex-col gap-2.5">
                <li className="hover:text-white transition cursor-pointer">About crave.</li>
                <li className="hover:text-white transition cursor-pointer">Customer Support</li>
                <li className="hover:text-white transition cursor-pointer">Careers</li>
              </ul>
            </div>

            <div>
              <p className="font-bold text-white text-sm tracking-wide mb-4">Learn More</p>
              <ul className="flex flex-col gap-2.5">
                <li className="hover:text-white transition cursor-pointer">Privacy Policy</li>
                <li className="hover:text-white transition cursor-pointer">Terms of Service</li>
                <li className="hover:text-white transition cursor-pointer">Cookie Settings</li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
            <p>© 2026 crave. All rights reserved.</p>
            <p className="text-gray-400">Live on Kanakapura Road Corridor, Bengaluru</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
