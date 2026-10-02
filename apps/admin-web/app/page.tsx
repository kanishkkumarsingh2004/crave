"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Download,
  Zap,
  Apple,
  MapPin,
  KeyRound,
  ShoppingBag,
  ArrowRight,
  Search,
  Star,
  Store,
  Bike,
  Flame,
  Check,
  Copy,
  ChevronDown,
  Layers,
  Activity,
} from "lucide-react";

// Curated Cuisine Categories (Swiggy & Zomato Signature Circles)
const CUISINE_CATEGORIES = [
  {
    id: "biryani",
    name: "Biryani",
    tagline: "Dum Biryani & Kebabs",
    badge: "Most Popular",
    image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&auto=format&fit=crop&q=80",
    color: "from-blue-600 to-indigo-600",
  },
  {
    id: "pizzas",
    name: "Pizzas",
    tagline: "Wood-fired & Pan Crust",
    badge: "Buy 1 Get 1",
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&auto=format&fit=crop&q=80",
    color: "from-indigo-600 to-blue-700",
  },
  {
    id: "burgers",
    name: "Burgers",
    tagline: "Smash Burgers & Fries",
    badge: "From ₹59",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=80",
    color: "from-blue-500 to-cyan-600",
  },
  {
    id: "instamart",
    name: "Groceries",
    tagline: "Dairy, Fruits & Produce",
    badge: "15 Mins Mart",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80",
    color: "from-emerald-600 to-teal-600",
  },
  {
    id: "eatright",
    name: "EatRight",
    tagline: "High Protein Bowls",
    badge: "Healthy Choice",
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80",
    color: "from-teal-600 to-emerald-600",
  },
  {
    id: "bolt",
    name: "Bolt 15m",
    tagline: "Guaranteed Express Meals",
    badge: "⚡ 15 Mins",
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&auto=format&fit=crop&q=80",
    color: "from-blue-600 to-blue-800",
  },
  {
    id: "desserts",
    name: "Desserts",
    tagline: "Cakes, Brownies & Waffles",
    badge: "Sweet Deals",
    image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&auto=format&fit=crop&q=80",
    color: "from-indigo-500 to-blue-600",
  },
  {
    id: "beverages",
    name: "Cold Brews",
    tagline: "Smoothies & Boba Tea",
    badge: "Chilled",
    image: "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=400&auto=format&fit=crop&q=80",
    color: "from-blue-600 to-indigo-700",
  },
];

const LOCATIONS = [
  "Koramangala 4th Block, Bengaluru",
  "Indiranagar 100ft Road, Bengaluru",
  "Jayanagar 9th Block, Bengaluru",
  "HSR Layout Sector 3, Bengaluru",
  "JP Nagar Phase 2, Bengaluru",
  "Whitefield ITPL Main Rd, Bengaluru",
];

const ECOSYSTEM_ROLES = [
  {
    id: "customer",
    name: "Customer App",
    role: "CUSTOMER",
    badge: "Mobile App (Expo SDK 57)",
    icon: ShoppingBag,
    color: "border-blue-500 bg-blue-50/50 text-blue-700",
    title: "Instant Food & Grocery Shopping",
    description:
      "Live GPS courier tracking, interactive restaurant menus, standard NPCI UPI checkout, and tamper-proof 4-digit OTP delivery handoffs.",
    apkUrl: "/apk/customer-v1.0.0.apk",
    ipaUrl: "/apk/customer-v1.0.0.ipa",
    stats: [
      { label: "Delivery Time", val: "15-20 Mins" },
      { label: "Payment", val: "UPI / Cards / COD" },
      { label: "Handoff", val: "4-Digit OTP" },
    ],
  },
  {
    id: "vendor",
    name: "Vendor App",
    role: "VENDOR",
    badge: "Partner Mobile Portal",
    icon: Store,
    color: "border-indigo-500 bg-indigo-50/50 text-indigo-700",
    title: "Kitchen Order & Catalog Management",
    description:
      "Instant real-time incoming order sound chime, kitchen prep stepper (Accept → Preparing → Ready), and one-tap inventory stock toggles.",
    apkUrl: "/apk/vendor-v1.0.0.apk",
    ipaUrl: "/apk/vendor-v1.0.0.ipa",
    stats: [
      { label: "Order Chime", val: "Realtime Sound" },
      { label: "Stock Control", val: "Instant Toggle" },
      { label: "Payout Cycle", val: "Daily Automated" },
    ],
  },
  {
    id: "driver",
    name: "Driver App",
    role: "DRIVER",
    badge: "Courier Mobile Engine",
    icon: Bike,
    color: "border-cyan-500 bg-cyan-50/50 text-cyan-700",
    title: "Dispatch Routing & Fleet Tracking",
    description:
      "Turn-by-turn route navigation, proximity matching radius, active delivery state machine, and delivery handover OTP verification.",
    apkUrl: "/apk/driver-v1.0.0.apk",
    ipaUrl: "/apk/driver-v1.0.0.ipa",
    stats: [
      { label: "Dispatch Range", val: "10 km Radius" },
      { label: "GPS Tracking", val: "Live WebSocket" },
      { label: "Security", val: "6-Digit Handover" },
    ],
  },
  {
    id: "admin",
    name: "Admin Web",
    role: "ADMIN",
    badge: "Web Platform Console",
    icon: Layers,
    color: "border-blue-600 bg-blue-100/50 text-blue-900",
    title: "Executive Operations & Oversight",
    description:
      "Full administrative control: vendor KYC onboarding, driver management, real-time live map dispatch, commission payouts, and audit trails.",
    webUrl: "/dashboard",
    stats: [
      { label: "Console Access", val: "Full RBAC" },
      { label: "Audit Engine", val: "Complete Logs" },
      { label: "Analytics", val: "Live Revenue" },
    ],
  },
];

const TEST_ACCOUNTS = [
  { role: "Platform Admin", email: "admin@delivery.com", app: "Admin Web Console", link: "/login" },
  { role: "Test Customer", email: "customer@delivery.com", app: "Customer Mobile", link: "#ecosystem" },
  { role: "Test Vendor", email: "vendor@delivery.com", app: "Vendor Mobile / Store", link: "#ecosystem" },
  { role: "Test Rider", email: "driver@delivery.com", app: "Driver Mobile App", link: "#ecosystem" },
];

export default function PremiumCraveHomePage() {
  const [selectedLocation, setSelectedLocation] = useState(LOCATIONS[0]);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [activeCuisine, setActiveCuisine] = useState(CUISINE_CATEGORIES[0]);
  const [activeEcosystemTab, setActiveEcosystemTab] = useState(ECOSYSTEM_ROLES[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [liveOrderStep, setLiveOrderStep] = useState(3); // 1: Confirmed, 2: Preparing, 3: On The Way, 4: Delivered
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEmail(text);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
      {/* ===================================================================
           1. ZOMATO & SWIGGY STYLE LUXURY STICKY HEADER
           =================================================================== */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-[0_2px_15px_-3px_rgba(37,99,235,0.06)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between gap-4">
          {/* Brand Logo & Location Switcher */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3 group">
              <img
                src="/logo.png"
                alt="CRAVE"
                className="w-11 h-11 object-contain rounded-2xl shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform duration-300 bg-white"
              />
              <div>
                <span className="font-black text-xl tracking-tight text-slate-900 block leading-none">
                  CRAVE
                </span>
                <span className="text-[10px] font-extrabold tracking-widest uppercase text-blue-600 flex items-center gap-1.5 mt-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>15 Mins Delivery</span>
                </span>
              </div>
            </Link>

            {/* Zomato-style Interactive Location Selector */}
            <div className="relative hidden md:block">
              <button
                onClick={() => setShowLocationPicker(!showLocationPicker)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 text-xs font-semibold text-slate-800 transition-all cursor-pointer"
              >
                <MapPin className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <span className="max-w-[210px] truncate">{selectedLocation}</span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {showLocationPicker && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-2xl border border-slate-200 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Select Your Area in Bengaluru
                  </div>
                  {LOCATIONS.map((loc) => (
                    <button
                      key={loc}
                      onClick={() => {
                        setSelectedLocation(loc);
                        setShowLocationPicker(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                        selectedLocation === loc
                          ? "bg-blue-50 text-blue-700 font-bold"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span className="truncate">{loc}</span>
                      {selectedLocation === loc && <Check className="h-3.5 w-3.5 text-blue-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Header Navigation & Actions */}
          <div className="flex items-center gap-3">
            <nav className="hidden lg:flex items-center gap-1 text-xs font-bold text-slate-600">
              <a href="#cuisines" className="px-3 py-2 rounded-lg hover:text-blue-600 hover:bg-blue-50/50 transition-colors">
                Categories
              </a>
              <a href="#tracking" className="px-3 py-2 rounded-lg hover:text-blue-600 hover:bg-blue-50/50 transition-colors">
                Live Radar
              </a>
              <a href="#ecosystem" className="px-3 py-2 rounded-lg hover:text-blue-600 hover:bg-blue-50/50 transition-colors">
                Mobile Apps
              </a>
              <a href="#accounts" className="px-3 py-2 rounded-lg hover:text-blue-600 hover:bg-blue-50/50 transition-colors">
                Test Accounts
              </a>
            </nav>

            {/* Launch Admin Web Console Button */}
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs transition-all shadow-md shadow-blue-500/25 active:scale-95 cursor-pointer"
            >
              <span>Admin Console</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ===================================================================
           2. HERO SECTION: ZOMATO & SWIGGY PREMIUM SHOWCASE + MOTION GRAPHICS
           =================================================================== */}
      <section className="relative pt-12 pb-20 px-4 sm:px-6 max-w-7xl mx-auto overflow-hidden">
        {/* Soft Ambient Background Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none -z-10">
          <div className="absolute top-8 left-10 w-96 h-96 rounded-full bg-blue-100/40 blur-3xl animate-pulse-glow" />
          <div className="absolute bottom-8 right-10 w-96 h-96 rounded-full bg-indigo-100/40 blur-3xl animate-pulse-glow" />
          <div className="absolute top-1/2 right-1/4 w-72 h-72 rounded-full bg-cyan-100/30 blur-2xl" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Headline, Search & Value Propositions */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-200/80 bg-blue-50/80 text-blue-700 text-xs font-extrabold shadow-sm">
              <Zap className="h-3.5 w-3.5 text-blue-600 animate-bounce" />
              <span>Hyperlocal Delivery Re-Engineered • 15 Mins Speed</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 leading-[1.12]">
              Craving delicious food or <br className="hidden sm:inline" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700">
                instant groceries in 15 mins?
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-xl font-normal leading-relaxed">
              Order from Bengaluru&apos;s highest-rated kitchens and local marts with live GPS courier radar,
              direct UPI intent checkout, and secure 4-digit OTP handover.
            </p>

            {/* Zomato-Style Hero Search & Location Bar */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-blue-500/5 p-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex items-center gap-2.5 px-3 py-2 sm:border-r border-slate-200 sm:w-5/12 text-slate-700">
                <MapPin className="h-4 w-4 text-blue-600 shrink-0" />
                <span className="text-xs font-bold truncate">{selectedLocation.split(",")[0]}</span>
              </div>

              <div className="flex items-center gap-2.5 px-3 py-2 flex-1">
                <Search className="h-4 w-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for 'Biryani', 'Pizza', 'Milk' or restaurants..."
                  className="w-full text-xs font-semibold placeholder:text-slate-400 bg-transparent"
                />
              </div>

              <a
                href="#cuisines"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs transition-colors shadow-md shadow-blue-500/20 active:scale-95 shrink-0"
              >
                <span>Explore Meals</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>

            {/* Quick Trending Tags */}
            <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
              <span className="text-slate-400 font-bold flex items-center gap-1">
                <Flame className="h-3.5 w-3.5 text-amber-500" /> Trending:
              </span>
              {["Biryani", "Crispy Burgers", "Wood-fired Pizza", "Cold Brew", "Bolt 15m"].map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSearchQuery(tag)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-semibold transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Realtime Platform Value Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
              <div className="space-y-1">
                <div className="text-xl font-black text-slate-900 flex items-center gap-1">
                  <span>15 Mins</span>
                </div>
                <div className="text-xs text-slate-500 font-medium">Average Delivery Time</div>
              </div>
              <div className="space-y-1">
                <div className="text-xl font-black text-slate-900 flex items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span>4.9 / 5</span>
                </div>
                <div className="text-xs text-slate-500 font-medium">Customer Rating</div>
              </div>
              <div className="space-y-1">
                <div className="text-xl font-black text-slate-900 flex items-center gap-1">
                  <span>100% OTP</span>
                </div>
                <div className="text-xs text-slate-500 font-medium">Contactless Handover</div>
              </div>
              <div className="space-y-1">
                <div className="text-xl font-black text-slate-900 flex items-center gap-1">
                  <span>₹0 Fee</span>
                </div>
                <div className="text-xs text-slate-500 font-medium">With Crave One Pass</div>
              </div>
            </div>
          </div>

          {/* Right Column: Motion Graphic Mockup with Floating Interactive Cards */}
          <div className="lg:col-span-5 relative flex justify-center">
            {/* Floating Live Courier Card 1 */}
            <div className="absolute -top-6 -left-6 z-20 bg-white/95 backdrop-blur-md rounded-2xl border border-blue-100 shadow-xl p-3.5 flex items-center gap-3 animate-float-slow max-w-xs">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg shrink-0">
                🛵
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900">Ramesh Kumar</span>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700">★ 4.9</span>
                </div>
                <p className="text-[11px] text-blue-600 font-bold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-ping" />
                  <span>1.2 km away • Arriving in 11 mins</span>
                </p>
              </div>
            </div>

            {/* Floating Verified OTP Card 2 */}
            <div className="absolute -bottom-6 -right-4 z-20 bg-white/95 backdrop-blur-md rounded-2xl border border-indigo-100 shadow-xl p-3.5 flex items-center gap-3 animate-float-reverse max-w-xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <KeyRound className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-slate-900">Delivery Handover PIN</div>
                <div className="text-sm font-black tracking-widest text-emerald-600 font-mono">OTP: 7 4 8 2</div>
              </div>
            </div>

            {/* Central Realistic Mobile Mockup Card */}
            <div className="w-full max-w-[340px] bg-white rounded-[2.5rem] border-8 border-slate-900 shadow-2xl p-4 space-y-4 relative overflow-hidden">
              {/* Phone Camera Notch */}
              <div className="w-24 h-4 bg-slate-900 rounded-b-xl mx-auto -mt-4 mb-2 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-slate-800" />
              </div>

              {/* Mockup Active Order Banner */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-3.5 text-white space-y-2 shadow-md">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-extrabold flex items-center gap-1">
                    <Activity className="h-3 w-3 animate-pulse text-emerald-300" /> LIVE TRACKING
                  </span>
                  <span className="bg-white/20 px-2 py-0.5 rounded-full font-bold">14 MINS</span>
                </div>
                <div className="text-sm font-black">Leon&apos;s - Burgers & Wings</div>
                <div className="text-[11px] text-blue-100">1x Crispy Chicken Burger, 1x Hazelnut Brownie</div>
              </div>

              {/* Animated Live Route Vector Map */}
              <div className="relative h-44 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden p-2">
                <svg className="w-full h-full" viewBox="0 0 300 160">
                  <rect width="300" height="160" fill="#f1f5f9" />
                  {/* Street Grids */}
                  <path d="M 0,40 L 300,40 M 0,110 L 300,110 M 70,0 L 70,160 M 230,0 L 230,160" stroke="#e2e8f0" strokeWidth="6" fill="none" />
                  {/* Delivery Route Path */}
                  <path d="M 30,120 Q 150,40 270,120" stroke="#3b82f6" strokeWidth="4" strokeDasharray="6 4" fill="none" />
                  {/* Start Kitchen Pin */}
                  <circle cx="30" cy="120" r="10" fill="#2563eb" />
                  <text x="30" y="124" fontSize="10" fill="#fff" textAnchor="middle">🍳</text>
                  {/* Customer Destination Pin */}
                  <circle cx="270" cy="120" r="10" fill="#10b981" />
                  <text x="270" y="124" fontSize="10" fill="#fff" textAnchor="middle">🏠</text>
                </svg>

                {/* Animated Rider Scooter Pin along route */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white shadow-lg border-2 border-blue-600 flex items-center justify-center text-sm animate-bike-route">
                  🛵
                </div>
              </div>

              {/* Order Status Stepper */}
              <div className="space-y-2 pt-1 text-xs">
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span>Order Progress</span>
                  <span className="text-blue-600">On The Way</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  <div className="h-1.5 rounded-full bg-blue-600" />
                  <div className="h-1.5 rounded-full bg-blue-600" />
                  <div className="h-1.5 rounded-full bg-blue-600 animate-pulse" />
                  <div className="h-1.5 rounded-full bg-slate-200" />
                </div>
              </div>

              {/* Delivery Agent Bar */}
              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px]">
                    RK
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 leading-none">Ramesh K.</div>
                    <span className="text-[10px] text-slate-500">KA 05 EQ 4421</span>
                  </div>
                </div>
                <span className="text-[11px] font-extrabold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                  📞 Call
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
           3. "WHAT'S ON YOUR MIND?" SWIGGY SIGNATURE CATEGORY CIRCLES
           =================================================================== */}
      <section id="cuisines" className="py-14 border-t border-slate-100 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">Cuisine Exploration</div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">What&apos;s on your mind?</h2>
            </div>
            <span className="text-xs font-bold text-slate-500">
              Curated categories with lightning 15-min delivery
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
            {CUISINE_CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCuisine(category)}
                className={`group text-center p-3 rounded-2xl transition-all duration-300 cursor-pointer ${
                  activeCuisine.id === category.id
                    ? "bg-white border-2 border-blue-600 shadow-lg shadow-blue-500/10 scale-105"
                    : "bg-white/70 hover:bg-white border border-slate-200/80 hover:border-blue-200 hover:shadow-md"
                }`}
              >
                <div className="w-18 h-18 sm:w-20 sm:h-20 mx-auto rounded-full overflow-hidden mb-3 ring-2 ring-slate-100 group-hover:ring-blue-400 group-hover:scale-105 transition-all">
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
                <div className="font-extrabold text-xs text-slate-900 group-hover:text-blue-600 transition-colors">
                  {category.name}
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">{category.badge}</div>
              </button>
            ))}
          </div>

          {/* Active Category Highlight Card */}
          <div className="bg-white rounded-2xl border border-blue-100 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-md shrink-0">
                <img src={activeCuisine.image} alt={activeCuisine.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-slate-900">{activeCuisine.name} Showcase</h3>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                    {activeCuisine.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{activeCuisine.tagline} • Available across all vendor stores</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-extrabold text-xs transition-colors"
              >
                Manage in Catalog
              </Link>
              <a
                href="#ecosystem"
                className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-extrabold text-xs transition-colors shadow-sm"
              >
                Order in App
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
           4. LIVE DELIVERY TRACKING SIMULATOR (MOTION GRAPHIC EXPERIENCE)
           =================================================================== */}
      <section id="tracking" className="py-16 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-950 rounded-3xl p-8 sm:p-12 text-white shadow-2xl relative overflow-hidden">
          {/* Ambient Glows */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-8">
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                  <span>Real-Time SSE Event Engine</span>
                </span>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight mt-1 text-white">
                  Interactive Live Delivery Simulator
                </h2>
              </div>
              <div className="text-xs text-slate-300">
                Click any step to test real-time state machine transitions
              </div>
            </div>

            {/* Stepper Interactive Nodes */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {[
                { step: 1, title: "1. Order Confirmed", desc: "Atomic checkout & UPI verified", icon: "✓" },
                { step: 2, title: "2. Kitchen Preparing", desc: "Vendor accepted & baking", icon: "🍳" },
                { step: 3, title: "3. Courier En Route", desc: "Ramesh picked up & tracking", icon: "🛵" },
                { step: 4, title: "4. Doorstep Handover", desc: "4-Digit PIN OTP verification", icon: "🎉" },
              ].map((s) => (
                <button
                  key={s.step}
                  onClick={() => setLiveOrderStep(s.step)}
                  className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                    liveOrderStep === s.step
                      ? "bg-blue-600/30 border-blue-400 ring-2 ring-blue-400/50 shadow-lg"
                      : liveOrderStep > s.step
                      ? "bg-white/10 border-emerald-500/40 text-emerald-300"
                      : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center font-bold text-sm">
                      {s.icon}
                    </span>
                    {liveOrderStep === s.step && (
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                    )}
                  </div>
                  <div className="font-extrabold text-sm text-white">{s.title}</div>
                  <div className="text-[11px] text-slate-300 mt-0.5">{s.desc}</div>
                </button>
              ))}
            </div>

            {/* Live State Simulation Result Card */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-300 flex items-center justify-center text-2xl font-bold shrink-0">
                  {liveOrderStep === 1 && "✓"}
                  {liveOrderStep === 2 && "👨‍🍳"}
                  {liveOrderStep === 3 && "🛵"}
                  {liveOrderStep === 4 && "🎊"}
                </div>
                <div>
                  <div className="text-base font-extrabold text-white">
                    {liveOrderStep === 1 && "Order ORD-10004 Confirmed • Payment Verified via NPCI UPI"}
                    {liveOrderStep === 2 && "Kitchen is preparing: 1x Dum Biryani, 1x Paneer Tikka"}
                    {liveOrderStep === 3 && "Driver Ramesh Kumar is on the way (KA 05 EQ 4421) • Arriving in 11 mins"}
                    {liveOrderStep === 4 && "Delivered! 4-Digit Handover PIN (OTP: 7482) Verified by Courier"}
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Broadcasting via Server-Sent Events (`/api/v1/realtime/stream`) to Customer, Driver & Admin
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => setLiveOrderStep((prev) => (prev % 4) + 1)}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs transition-colors shadow-md cursor-pointer"
                >
                  Simulate Next Step →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
           5. MULTI-ROLE ECOSYSTEM SHOWCASE (ADMIN, CUSTOMER, VENDOR, RIDER)
           =================================================================== */}
      <section id="ecosystem" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
            <Layers className="h-3.5 w-3.5" />
            <span>Complete 4-Pillar Platform</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Built for Every Stakeholder
          </h2>
          <p className="text-sm text-slate-500 max-w-2xl mx-auto">
            Experience the complete delivery lifecycle across the Next.js 15 Web Admin and React Native Expo apps.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex justify-center">
          <div className="inline-flex p-1.5 rounded-2xl bg-slate-100 border border-slate-200 gap-1.5 max-w-full overflow-x-auto">
            {ECOSYSTEM_ROLES.map((role) => (
              <button
                key={role.id}
                onClick={() => setActiveEcosystemTab(role)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                  activeEcosystemTab.id === role.id
                    ? "bg-white text-blue-700 shadow-md shadow-blue-500/10 border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <role.icon className="h-4 w-4" />
                <span>{role.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Active Ecosystem Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 sm:p-12 space-y-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-2xl shadow-lg shadow-blue-500/20 shrink-0">
                <activeEcosystemTab.icon className="h-7 w-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-black text-slate-900">{activeEcosystemTab.title}</h3>
                  <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {activeEcosystemTab.role}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{activeEcosystemTab.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {activeEcosystemTab.webUrl ? (
                <Link
                  href={activeEcosystemTab.webUrl}
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs transition-colors shadow-md shadow-blue-500/20 flex items-center gap-2"
                >
                  <span>Launch Admin Portal</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <div className="flex items-center gap-2">
                  <a
                    href={activeEcosystemTab.apkUrl}
                    download
                    className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs transition-colors shadow-md shadow-blue-500/20 flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download APK</span>
                  </a>
                  <a
                    href={activeEcosystemTab.ipaUrl}
                    download
                    className="px-5 py-3 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-800 font-extrabold text-xs transition-colors flex items-center gap-2"
                  >
                    <Apple className="h-4 w-4" />
                    <span>iOS IPA</span>
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Role Feature Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {activeEcosystemTab.stats.map((stat) => (
              <div key={stat.label} className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{stat.label}</span>
                <div className="text-lg font-black text-slate-900">{stat.val}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================================================================
           6. CLEAN TEST ACCOUNTS & QUICK LOGIN CREDENTIALS
           =================================================================== */}
      <section id="accounts" className="py-16 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 sm:p-10 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">Test Account Credentials</div>
              <h2 className="text-2xl font-black text-slate-900">One Clean User Per Application</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Active in Supabase PostgreSQL • Universal Password: <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono font-bold text-slate-900">Password123</code>
              </p>
            </div>
            <Link
              href="/login"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs transition-colors shadow-sm"
            >
              Go to Login Page →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TEST_ACCOUNTS.map((acc) => (
              <div
                key={acc.role}
                className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 hover:border-blue-300 transition-colors shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">
                    {acc.role}
                  </span>
                  <button
                    onClick={() => handleCopy(acc.email)}
                    className="text-slate-400 hover:text-blue-600 p-1 rounded transition-colors"
                    title="Copy Email"
                  >
                    {copiedEmail === acc.email ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>

                <div>
                  <div className="text-xs font-bold text-slate-900 font-mono truncate">{acc.email}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{acc.app}</div>
                </div>

                <div className="text-[11px] font-mono text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                  Password: <strong>Password123</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================================================================
           7. SWIGGY ONE / CRAVE VIP BENEFITS RIBBON
           =================================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div className="rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-blue-50 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white font-black text-xl flex items-center justify-center shadow-md shrink-0">
              one
            </div>
            <div>
              <div className="text-base font-black text-slate-900">
                Unlock Unlimited Free Delivery with Crave One
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Zero delivery fee on orders above ₹99, no surge charges during rain/peak hours, and extra 10% off.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-colors shrink-0"
          >
            Explore Benefits
          </Link>
        </div>
      </section>

      {/* ===================================================================
           8. CLEAN MINIMAL LUXURY FOOTER
           =================================================================== */}
      <footer className="border-t border-slate-100 bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="CRAVE"
              className="w-8 h-8 object-contain rounded-xl shadow-sm bg-white"
            />
            <div>
              <span className="font-extrabold text-slate-900 block">CRAVE DELIVERY PLATFORM</span>
              <span className="text-[10px] text-slate-400">© 2026 Crave Technologies Inc. All rights reserved.</span>
            </div>
          </div>

          <div className="flex items-center gap-6 font-semibold">
            <Link href="/dashboard" className="hover:text-blue-600 transition-colors">Admin Console</Link>
            <Link href="/login" className="hover:text-blue-600 transition-colors">Portal Login</Link>
            <a href="#ecosystem" className="hover:text-blue-600 transition-colors">Mobile Releases</a>
            <a href="#tracking" className="hover:text-blue-600 transition-colors">SSE Radar</a>
          </div>

          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-slate-600 font-bold">All Systems Operational</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
