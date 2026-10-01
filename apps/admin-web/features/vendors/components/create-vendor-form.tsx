"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Store,
  MapPin,
  Percent,
  Lock,
  Image as ImageIcon,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  DollarSign,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { PremiumMapPicker } from "@/components/shared/premium-map-picker";

const BANNER_PRESETS = [
  { name: "Biryani & Kebabs", url: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=1200&auto=format&fit=crop&q=80" },
  { name: "Artisan Pizza", url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1200&auto=format&fit=crop&q=80" },
  { name: "Gourmet Burgers", url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200&auto=format&fit=crop&q=80" },
  { name: "South Indian Dosa", url: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=1200&auto=format&fit=crop&q=80" },
  { name: "Cafe & Beverages", url: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1200&auto=format&fit=crop&q=80" },
  { name: "Bakery & Desserts", url: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=1200&auto=format&fit=crop&q=80" },
];

const LOGO_PRESETS = [
  { name: "Chef Hat", url: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=200&auto=format&fit=crop&q=80" },
  { name: "Grill & Flame", url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop&q=80" },
  { name: "Coffee Cup", url: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=200&auto=format&fit=crop&q=80" },
  { name: "Fresh Bowl", url: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=200&auto=format&fit=crop&q=80" },
];

export function CreateVendorForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Form State
  const [storeName, setStoreName] = useState("");
  const [description, setDescription] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("Password123");

  // Location State
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Bangalore");
  const [state, setState] = useState("Karnataka");
  const [postalCode, setPostalCode] = useState("560001");
  const [latitude, setLatitude] = useState<number | null>(12.9716);
  const [longitude, setLongitude] = useState<number | null>(77.5946);

  // Commission & Pricing Policy State
  const [commissionType, setCommissionType] = useState<"COMMISSION" | "MARKUP">("COMMISSION");
  const [commissionRate, setCommissionRate] = useState("15.0");
  const [isPricingLocked, setIsPricingLocked] = useState(true);

  // Photos State
  const [logoUrl, setLogoUrl] = useState(LOGO_PRESETS[0].url);
  const [bannerUrl, setBannerUrl] = useState(BANNER_PRESETS[0].url);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!storeName.trim()) {
      toast.error("Please enter the store name");
      return;
    }
    if (!email.trim()) {
      toast.error("Please enter the owner's email address");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName,
          description,
          ownerName: ownerName || storeName,
          email,
          phone,
          password,
          address,
          city,
          state,
          postalCode,
          latitude,
          longitude,
          commissionType,
          commissionRate: parseFloat(commissionRate) || 15.0,
          isPricingLocked,
          logoUrl,
          bannerUrl,
          isOpen: true,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message ?? "Failed to create vendor");
      }

      toast.success(`Vendor "${storeName}" created successfully!`);
      // Redirect to vendor detail page so they can immediately add menu items
      router.push(`/vendors/${json.data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create vendor");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 pb-12 max-w-5xl mx-auto">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/vendors"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Vendors List</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Register New Vendor</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 font-bold">
              Step 1 of 2: Profile
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Configure restaurant identity, map location, commission structure, and branding photos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/vendors"
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? "Creating Profile..." : "Create Vendor & Open Menu"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Form Controls */}
        <div className="lg:col-span-2 space-y-8">
          {/* Section 1: Store & Owner Identity */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Store className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Store & Owner Identity</h2>
                <p className="text-[11px] text-slate-400">Basic brand and login credentials for the vendor app</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Restaurant / Store Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="e.g. Royal Biryani House"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tagline / Cuisine Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Authentic Hyderabadi Dum Biryani, Mughlai Gravies & Tandoori Starters"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Owner / Manager Name
                </label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. Mohammed Rizwan"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Owner Login Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. vendor@royalbiryani.com"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Default App Password
                </label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password123"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Location & Google Maps Verification */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <MapPin className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Location & Google Maps Integration</h2>
                <p className="text-[11px] text-slate-400">Pinpoint accurate restaurant coordinates for driver dispatch</p>
              </div>
            </div>

            {/* Interactive Premium Map Picker with Google Maps and GPS */}
            <PremiumMapPicker
              latitude={latitude}
              longitude={longitude}
              address={address}
              city={city}
              state={state}
              postalCode={postalCode}
              onChange={(loc) => {
                setLatitude(loc.latitude);
                setLongitude(loc.longitude);
                if (loc.address) setAddress(loc.address);
                if (loc.city) setCity(loc.city);
                if (loc.state) setState(loc.state);
                if (loc.postalCode) setPostalCode(loc.postalCode);
              }}
            />

            {/* Address fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Street Address Line
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 100 Feet Rd, HAL 2nd Stage, Indiranagar"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Bangalore"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="Karnataka"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Postal Code</label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="560038"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Commission or Markup Model & Strict Pricing Lock */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <Percent className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Revenue Model & Pricing Controls</h2>
                <p className="text-[11px] text-slate-400">Choose between Commission or Markup with item pricing lock</p>
              </div>
            </div>

            {/* Model Selector Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                onClick={() => setCommissionType("COMMISSION")}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  commissionType === "COMMISSION"
                    ? "border-blue-600 bg-blue-50/40 ring-4 ring-blue-500/10 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                    <span>Commission Model</span>
                  </div>
                  <input
                    type="radio"
                    name="revenueModel"
                    checked={commissionType === "COMMISSION"}
                    onChange={() => setCommissionType("COMMISSION")}
                    className="h-4 w-4 text-blue-600"
                  />
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Platform deducts a commission percentage on each completed order before vendor payout (standard restaurant model).
                </p>
              </div>

              <div
                onClick={() => setCommissionType("MARKUP")}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  commissionType === "MARKUP"
                    ? "border-blue-600 bg-blue-50/40 ring-4 ring-blue-500/10 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    <span>Markup Model</span>
                  </div>
                  <input
                    type="radio"
                    name="revenueModel"
                    checked={commissionType === "MARKUP"}
                    onChange={() => setCommissionType("MARKUP")}
                    className="h-4 w-4 text-blue-600"
                  />
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Platform applies a markup percentage on top of base restaurant prices directly to customer bills.
                </p>
              </div>
            </div>

            {/* Rate Input */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-800 mb-0.5">
                  {commissionType === "COMMISSION" ? "Commission Rate (%)" : "Platform Markup Rate (%)"}
                </label>
                <p className="text-[11px] text-slate-500">
                  {commissionType === "COMMISSION"
                    ? "Percentage deducted from food subtotal (e.g. 15% to 22%)"
                    : "Percentage added to base item pricing (e.g. 10% to 18%)"}
                </p>
              </div>
              <div className="w-32 shrink-0 relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="50"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold text-right pr-7 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  %
                </span>
              </div>
            </div>

            {/* Strict Pricing Lock */}
            <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/50 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-blue-600 text-white shrink-0 mt-0.5">
                <Lock className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="pricingLock" className="text-xs font-bold text-slate-900 cursor-pointer">
                    Lock Restaurant Item Pricing (Strict Policy)
                  </label>
                  <input
                    id="pricingLock"
                    type="checkbox"
                    checked={isPricingLocked}
                    onChange={(e) => setIsPricingLocked(e.target.checked)}
                    className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  <strong>Strict Rule Enforced:</strong> When enabled under Commission or Markup model, the restaurant cannot alter item prices without administrator review, preventing unauthorized price hikes.
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Store Photos & Branding */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <ImageIcon className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Photos & Branding</h2>
                <p className="text-[11px] text-slate-400">Store banner cover photo & logo badge</p>
              </div>
            </div>

            {/* Banner Presets */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Choose Store Banner Photo (or enter custom image URL)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {BANNER_PRESETS.map((b) => (
                  <button
                    key={b.name}
                    type="button"
                    onClick={() => setBannerUrl(b.url)}
                    className={`group relative h-16 rounded-xl overflow-hidden border-2 transition-all ${
                      bannerUrl === b.url
                        ? "border-blue-600 ring-2 ring-blue-500/20"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <img src={b.url} alt={b.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-white text-center px-1">
                        {b.name}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              <input
                type="url"
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                placeholder="Custom Banner Image URL..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2"
              />
            </div>

            {/* Logo Presets */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-bold text-slate-700">
                Choose Store Logo / Avatar Photo
              </label>
              <div className="flex items-center gap-3">
                {LOGO_PRESETS.map((l) => (
                  <button
                    key={l.name}
                    type="button"
                    onClick={() => setLogoUrl(l.url)}
                    className={`h-12 w-12 rounded-2xl overflow-hidden border-2 transition-all shrink-0 ${
                      logoUrl === l.url
                        ? "border-blue-600 ring-2 ring-blue-500/20 scale-105"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <img src={l.url} alt={l.name} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="Custom Logo Image URL..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2"
              />
            </div>
          </div>
        </div>

        {/* Right 1 Column: Live Customer Preview Card */}
        <div className="space-y-6">
          <div className="sticky top-20 space-y-4">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>Customer Preview</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </h3>

            {/* Preview Card */}
            <div className="rounded-3xl border border-slate-200 overflow-hidden bg-white shadow-xl shadow-slate-200/50">
              {/* Banner */}
              <div className="relative h-36 bg-slate-200">
                {bannerUrl ? (
                  <img src={bannerUrl} alt="Store Banner" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
                {/* Status chip */}
                <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-black text-emerald-600 shadow-sm border border-emerald-100 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>ONLINE</span>
                </div>
              </div>

              {/* Logo & Store Body */}
              <div className="p-5 pt-0 relative">
                <div className="-mt-8 mb-3 flex items-end justify-between">
                  <div className="h-16 w-16 rounded-2xl border-4 border-white shadow-md overflow-hidden bg-white shrink-0">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-blue-600 text-white font-bold flex items-center justify-center text-xl">
                        {storeName ? storeName[0] : "B"}
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">
                      {commissionType} ({commissionRate}%)
                    </span>
                  </div>
                </div>

                <h4 className="text-lg font-black text-slate-900 leading-tight">
                  {storeName || "Restaurant Name"}
                </h4>
                <p className="text-xs text-slate-500 font-medium line-clamp-2 mt-1">
                  {description || "Authentic culinary specialties prepared fresh for quick delivery"}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <span className="flex items-center gap-1 font-semibold text-slate-700 truncate">
                    <MapPin className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    <span className="truncate">{city || "Bangalore"}, {state || "KA"}</span>
                  </span>
                  {isPricingLocked && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 shrink-0">
                      <Lock className="h-3 w-3" /> Locked
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Checklist summary */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4 space-y-2.5 text-xs text-slate-600">
              <div className="font-bold text-slate-800">What happens after creation?</div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Vendor profile is immediately approved & active.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>You can immediately add menu categories & items with photo thumbnails.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Vendor can log into the Vendor App using the email and password.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
