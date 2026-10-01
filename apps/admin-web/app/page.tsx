import type { Metadata } from "next";
import Link from "next/link";
import {
  Smartphone,
  Download,
  Store,
  Truck,
  ShieldCheck,
  Zap,
  Star,
  ArrowRight,
  MapPin,
  Clock,
  CheckCircle2,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Delivery Platform — Instant On-Demand Hyperlocal Delivery",
  description:
    "Next-generation hyperlocal delivery platform connecting customers, local vendor stores, and delivery couriers with real-time dispatch and tracking.",
};

export default function PublicLandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
      {/* Navigation Bar — PUBLIC (NO LOGIN OR SIGNUP BUTTONS) */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-extrabold text-lg shadow-sm">
              D
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-slate-900 block leading-none">
                Delivery
              </span>
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                Hyperlocal Ecosystem
              </span>
            </div>
          </Link>

          {/* Navigation Links — Strictly NO Login/Signup buttons */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition-colors">
              Platform Features
            </a>
            <a href="#apps" className="hover:text-slate-900 transition-colors">
              Mobile Apps
            </a>
            <a href="#stats" className="hover:text-slate-900 transition-colors">
              Live Stats
            </a>
            <Link
              href="/downloads"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-sm"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Apps</span>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-16 pb-20 px-6 max-w-5xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-xs font-semibold">
          <Zap className="h-3.5 w-3.5 text-blue-600" />
          <span>Automated Hyperlocal Delivery Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
          Lightning-fast delivery <br className="hidden sm:inline" />
          <span className="text-blue-600">for everything in your city</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
          Connecting local store vendors, customers, and delivery couriers on a unified, high-speed
          automated delivery network.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/downloads"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all shadow-sm"
          >
            <Download className="h-4 w-4" />
            <span>Get The Mobile Apps</span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <a
            href="#apps"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-semibold text-sm border border-slate-200 transition-colors"
          >
            <span>Explore Apps</span>
          </a>
        </div>
      </section>

      {/* 3 Apps Showcase Grid */}
      <section id="apps" className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center space-y-2 mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Dedicated Mobile Apps</h2>
          <p className="text-sm text-slate-500">
            Tailored mobile experiences for customers, store partners, and delivery drivers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Customer App Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 hover:border-slate-300 hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <Smartphone className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Customer App</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Browse nearby stores, order groceries and products with live GPS map order tracking.
              </p>
            </div>
            <Link
              href="/downloads"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 pt-2"
            >
              <span>Download APK & iOS</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Vendor App Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 hover:border-slate-300 hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
              <Store className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Vendor Partner App</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Manage product inventory, accept incoming store orders, track revenue and store
                status.
              </p>
            </div>
            <Link
              href="/downloads"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 hover:text-purple-700 pt-2"
            >
              <span>Download Partner App</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Driver App Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 hover:border-slate-300 hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <Truck className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Driver Courier App</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Accept delivery tasks, navigate with turn-by-turn GPS, verify OTP deliveries, and
                collect earnings.
              </p>
            </div>
            <Link
              href="/downloads"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 pt-2"
            >
              <span>Download Courier App</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Key Stats Bar */}
      <section id="stats" className="border-y border-slate-200 bg-white py-10 my-10">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">15 Mins</div>
            <div className="text-xs font-medium text-slate-500 mt-0.5">Average Pickup</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">99.9%</div>
            <div className="text-xs font-medium text-slate-500 mt-0.5">System Uptime</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">3 Apps</div>
            <div className="text-xs font-medium text-slate-500 mt-0.5">Unified Ecosystem</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">4-Digit</div>
            <div className="text-xs font-medium text-slate-500 mt-0.5">Secure OTP Handoff</div>
          </div>
        </div>
      </section>

      {/* Platform Features Section */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-12 space-y-10">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Platform Capabilities</h2>
          <p className="text-sm text-slate-500 max-w-xl mx-auto">
            Built with automated auto-dispatch algorithms and real-time data sync.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
            <Zap className="h-5 w-5 text-blue-600" />
            <h4 className="text-base font-bold text-slate-900">Smart Auto-Dispatch</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Automatically assigns nearby online drivers within radius for fast pickup times.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <h4 className="text-base font-bold text-slate-900">OTP Delivery Handoff</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Handoff is verified via a 4-digit PIN ensuring order security.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
            <CheckCircle2 className="h-5 w-5 text-purple-600" />
            <h4 className="text-base font-bold text-slate-900">Real-time Map Sync</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              GPS location stream keeps customers, vendors, and couriers in exact sync.
            </p>
          </div>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 px-6 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
              D
            </div>
            <span className="text-slate-700 font-semibold">Delivery Platform © 2026</span>
          </div>

          <div className="flex items-center gap-6 font-medium">
            <Link href="/downloads" className="hover:text-slate-900 transition-colors">
              App Downloads
            </Link>
            <a href="#features" className="hover:text-slate-900 transition-colors">
              Platform Features
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
