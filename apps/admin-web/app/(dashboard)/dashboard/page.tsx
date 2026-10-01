import type { Metadata } from "next";
import { DashboardMetrics } from "@/features/dashboard/components/dashboard-metrics";
import { DashboardCharts } from "@/features/dashboard/components/dashboard-charts";
import { RecentActivityFeed } from "@/features/dashboard/components/recent-activity-feed";
import { Sparkles, Activity, RefreshCw } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Dashboard — Akshaya Ventures Admin" };

export default function DashboardPage() {
  return (
    <div className="space-y-8 pb-8">
      {/* Top Banner & Quick Actions */}
      <div className="relative overflow-hidden rounded-3xl border border-blue-200/80 bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600 p-6 sm:p-8 text-white shadow-xl shadow-blue-600/15">
        {/* Background glow accents */}
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-sky-400/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-md border border-white/20">
              <Activity className="h-3.5 w-3.5 text-emerald-300 animate-pulse" />
              <span>Akshaya Ventures Engine Active</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl text-white">
              Executive Platform Dashboard
            </h1>
            <p className="text-sm text-blue-100 max-w-xl font-medium">
              Monitor real-time delivery operations, marketplace revenue streams, active vendors,
              and order fulfillments across Akshaya Ventures.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/analytics"
              prefetch={true}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold text-xs px-4 py-2.5 backdrop-blur-md border border-white/20 transition-all duration-200 shadow-sm active:scale-95"
            >
              <Sparkles className="h-4 w-4 text-amber-300" />
              <span>Deep Analytics</span>
            </Link>
            <Link
              href="/settings"
              prefetch={true}
              className="inline-flex items-center gap-2 rounded-xl bg-white text-blue-900 hover:bg-blue-50 font-bold text-xs px-4 py-2.5 transition-all duration-200 shadow-lg active:scale-95 cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Platform Settings</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Primary Platform Metrics */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span>Key Metrics & Financial Summary</span>
          </h2>
          <span className="text-xs text-slate-500 font-semibold">Live System Stats</span>
        </div>
        <DashboardMetrics />
      </div>

      {/* Main Grid: Visual Charts & Recent Activity */}
      <div className="space-y-6">
        <DashboardCharts />
        <RecentActivityFeed />
      </div>
    </div>
  );
}
