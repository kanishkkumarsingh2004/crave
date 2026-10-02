"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Store,
  Bike,
  ShoppingBag,
  TrendingUp,
  Settings,
  ArrowRight,
  Check,
  Copy,
  Lock,
  Layers,
  Sparkles,
  BarChart3,
  Users,
} from "lucide-react";

export default function AdminLandingPage() {
  const [copied, setCopied] = useState(false);

  const copyCredentials = () => {
    navigator.clipboard.writeText("admin@delivery.com");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white flex flex-col font-sans">
      {/* Top Banner & Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25 ring-1 ring-white/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                BlinkBite
              </span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Admin Console
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/50">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Standalone Port 3000 Active</span>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md shadow-blue-600/30 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <div className="relative overflow-hidden pt-16 pb-24 lg:pt-24 lg:pb-32">
          {/* Background Ambient Glows */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-blue-600/15 blur-[120px] pointer-events-none rounded-full" />
          <div className="absolute top-1/3 left-1/3 w-[350px] h-[350px] bg-indigo-600/10 blur-[100px] pointer-events-none rounded-full" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-8 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Enterprise Delivery Operations & Management</span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight max-w-4xl mx-auto leading-tight sm:leading-none">
              Complete Control Over Your{" "}
              <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">
                Delivery Ecosystem
              </span>
            </h1>

            <p className="mt-6 text-base sm:text-xl text-slate-400 max-w-2xl mx-auto font-normal">
              Standalone, zero-dependency administrator control panel running directly on port 3000.
              Manage vendors, live orders, fleet dispatch, financials, and platform settings.
            </p>

            {/* Quick Actions */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-xl shadow-blue-600/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Launch Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold text-sm border border-slate-700/80 transition-all hover:border-slate-600"
              >
                <Lock className="w-4 h-4 text-slate-400" />
                <span>Admin Login</span>
              </Link>
            </div>

            {/* Demo Credentials Card */}
            <div className="mt-12 max-w-lg mx-auto p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md shadow-2xl text-left">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Pre-Configured Admin Account
                </span>
                <span className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Ready to test
                </span>
              </div>
              <div className="pt-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Email / Username</p>
                  <p className="text-sm font-semibold text-white">admin@delivery.com</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Password</p>
                  <p className="text-sm font-semibold text-white">Password123</p>
                </div>
                <button
                  onClick={copyCredentials}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium inline-flex items-center gap-1.5 border border-slate-700 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Core Feature Grid */}
            <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all hover:bg-slate-900/80">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
                  <Store className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Vendor & Menu Operations</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Onboard merchant kitchens, toggle store operational status, configure commission percentages, and manage multi-category menus.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all hover:bg-slate-900/80">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Live Orders & Fulfilment</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Real-time pipeline tracking orders from PENDING to PREPARING, OUT_FOR_DELIVERY, and DELIVERED with full item details.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all hover:bg-slate-900/80">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                  <Bike className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Driver Fleet & Deliveries</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Courier vehicle verification, availability tracking (AVAILABLE/BUSY/OFFLINE), delivery assignment oversight, and ratings.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all hover:bg-slate-900/80">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Analytics & Revenue Engine</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Interactive charts showing daily order volumes and gross revenues, payment status breakdowns, and transaction logs.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all hover:bg-slate-900/80">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Customer & User Accounts</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Customer directory with verified contact information, order histories, account status controls, and role-based permissions.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all hover:bg-slate-900/80">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4">
                  <Settings className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Platform Configuration</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Dynamically adjust delivery base fees, per-km distance charges, commission rates, and operational parameters without code deploys.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-8 text-center text-xs text-slate-500">
        <p>© 2026 BlinkBite Operations. Standalone Enterprise Console on Port 3000.</p>
      </footer>
    </div>
  );
}
