"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Save,
  Percent,
  MapPin,
  Clock,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Calculator,
  Info,
  Truck,
  DollarSign,
} from "lucide-react";

interface Setting {
  id: string;
  key: string;
  value: string;
  description: string | null;
  category: string;
}

async function fetchSettings(): Promise<{ success: boolean; data: Setting[] }> {
  const res = await fetch("/api/v1/admin/settings");
  if (!res.ok) throw new Error("Failed to fetch settings");
  return res.json();
}

async function updateSetting(
  key: string,
  value: string,
  category?: string,
  description?: string,
): Promise<void> {
  const res = await fetch(`/api/v1/admin/settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value, category, description }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? "Failed to save setting");
  }
}

export function SettingsForm() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Record<string, string>>({
    "platform.commission_rate": "15",
    "delivery.base_fee": "3.50",
    "delivery.per_km_rate": "1.25",
    "delivery.max_radius_km": "25",
    "order.minimum_amount": "10.00",
    "order.cancellation_window_mins": "5",
    "system.auto_dispatch": "true",
    "system.surge_pricing": "false",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: fetchSettings,
  });

  // Populate from DB if available
  React.useEffect(() => {
    if (data?.data && data.data.length > 0) {
      const initial: Record<string, string> = { ...formData };
      data.data.forEach((s) => {
        initial[s.key] = s.value;
      });
      setFormData(initial);
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: async () => {
      for (const [key, value] of Object.entries(formData)) {
        await updateSetting(key, value, key.split(".")[0]?.toUpperCase() ?? "GENERAL");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success("Platform settings updated successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleChange = (key: string, val: string) => {
    setFormData((prev) => ({ ...prev, [key]: val }));
  };

  const toggleVal = (key: string) => {
    setFormData((prev) => ({ ...prev, [key]: prev[key] === "true" ? "false" : "true" }));
  };

  // Helper calculations for live preview
  const baseFee = parseFloat(formData["delivery.base_fee"] || "0") || 0;
  const perKm = parseFloat(formData["delivery.per_km_rate"] || "0") || 0;
  const sampleDist = 5;
  const sampleDeliveryCost = (baseFee + sampleDist * perKm).toFixed(2);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-card rounded-2xl border border-border shadow-sm space-y-3">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          Loading platform configurations...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Metric Cards Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/30 bg-gradient-to-br from-indigo-50/80 via-white to-white dark:from-indigo-950/20 dark:to-card p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Commission Rate
            </span>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground">
              {formData["platform.commission_rate"] ?? "15"}%
            </span>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/50">
              Vendor Fee
            </span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="rounded-2xl border border-cyan-100 dark:border-cyan-900/30 bg-gradient-to-br from-cyan-50/80 via-white to-white dark:from-cyan-950/20 dark:to-card p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
              Base Delivery Fee
            </span>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center shadow-md shadow-cyan-500/20">
              <Truck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground">
              ₹{formData["delivery.base_fee"] ?? "3.50"}
            </span>
            <span className="text-xs font-medium text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-200/50">
              Fixed
            </span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="rounded-2xl border border-emerald-100 dark:border-emerald-900/30 bg-gradient-to-br from-emerald-50/80 via-white to-white dark:from-emerald-950/20 dark:to-card p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Min Order
            </span>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground">
              ₹{formData["order.minimum_amount"] ?? "10.00"}
            </span>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/50">
              Checkout
            </span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="rounded-2xl border border-amber-100 dark:border-amber-900/30 bg-gradient-to-br from-amber-50/80 via-white to-white dark:from-amber-950/20 dark:to-card p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Max Radius
            </span>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <MapPin className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground">
              {formData["delivery.max_radius_km"] ?? "25"} km
            </span>
            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/50">
              Coverage
            </span>
          </div>
        </div>
      </div>

      {/* Section 1: Commission & Payout Rates */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden transition-all hover:shadow-md">
        <div className="bg-gradient-to-r from-indigo-50/90 via-purple-50/40 to-transparent dark:from-indigo-950/30 dark:to-card p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Percent className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Commission & Vendor Payout Rates
              </h2>
              <p className="text-xs text-muted-foreground">
                Set global marketplace commission cuts and order minimum thresholds
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 bg-indigo-100/70 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full border border-indigo-200/50">
            <Sparkles className="h-3.5 w-3.5" /> Financial Rules
          </span>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Platform Commission Rate (%) *
              </label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  step="0.1"
                  value={formData["platform.commission_rate"] ?? "15"}
                  onChange={(e) => handleChange("platform.commission_rate", e.target.value)}
                  className="w-full rounded-xl border border-input bg-background pl-4 pr-12 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
                  id="setting-commission-rate"
                />
                <span className="absolute right-3 text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">
                  %
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Percentage deducted from each vendor&apos;s order subtotal.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Minimum Order Subtotal (₹) *
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-xs font-bold text-slate-500">₹</span>
                <input
                  type="number"
                  step="0.01"
                  value={formData["order.minimum_amount"] ?? "10.00"}
                  onChange={(e) => handleChange("order.minimum_amount", e.target.value)}
                  className="w-full rounded-xl border border-input bg-background pl-8 pr-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
                  id="setting-min-order"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Minimum item total required before customer can checkout.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-xs text-indigo-900 dark:text-indigo-200">
            <Info className="h-4 w-4 text-indigo-600 shrink-0" />
            <span>
              Commission earnings are automatically split during payout processing. A{" "}
              <strong>15%</strong> rate yields <strong>₹150</strong> platform revenue on a ₹1,000
              vendor order.
            </span>
          </div>
        </div>
      </div>

      {/* Section 2: Delivery Pricing & Dispatch Configuration */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden transition-all hover:shadow-md">
        <div className="bg-gradient-to-r from-blue-50/90 via-cyan-50/40 to-transparent dark:from-blue-950/30 dark:to-card p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Delivery Pricing & Dispatch Configuration
              </h2>
              <p className="text-xs text-muted-foreground">
                Configure distance-based delivery fees and driver dispatch radiuses
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-100/70 dark:bg-blue-950/60 px-2.5 py-1 rounded-full border border-blue-200/50">
            <TrendingUp className="h-3.5 w-3.5" /> Logistics Fees
          </span>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Base Delivery Fee (₹)
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-xs font-bold text-slate-500">₹</span>
                <input
                  type="number"
                  step="0.01"
                  value={formData["delivery.base_fee"] ?? "3.50"}
                  onChange={(e) => handleChange("delivery.base_fee", e.target.value)}
                  className="w-full rounded-xl border border-input bg-background pl-8 pr-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                  id="setting-base-fee"
                />
              </div>
              <p className="text-xs text-muted-foreground">Flat fee applied to every delivery.</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Per Kilometer Rate (₹)
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-xs font-bold text-slate-500">₹</span>
                <input
                  type="number"
                  step="0.01"
                  value={formData["delivery.per_km_rate"] ?? "1.25"}
                  onChange={(e) => handleChange("delivery.per_km_rate", e.target.value)}
                  className="w-full rounded-xl border border-input bg-background pl-8 pr-16 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                  id="setting-per-km-rate"
                />
                <span className="absolute right-3 text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                  / km
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Variable distance rate charged per km.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Max Delivery Radius (km)
              </label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  step="1"
                  value={formData["delivery.max_radius_km"] ?? "25"}
                  onChange={(e) => handleChange("delivery.max_radius_km", e.target.value)}
                  className="w-full rounded-xl border border-input bg-background pl-4 pr-12 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                  id="setting-max-radius"
                />
                <span className="absolute right-3 text-xs font-bold text-slate-500">km</span>
              </div>
              <p className="text-xs text-muted-foreground">Maximum allowable delivery distance.</p>
            </div>
          </div>

          {/* Live Calculation Preview Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-indigo-500/10 border border-blue-200/60 dark:border-blue-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                <Calculator className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">
                  Sample 5 km Delivery Fee Preview
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Formula: Base Fee (₹{baseFee.toFixed(2)}) + 5 km × Per Km Rate (₹
                  {perKm.toFixed(2)})
                </p>
              </div>
            </div>
            <div className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white font-extrabold text-sm shadow-sm">
              ₹{sampleDeliveryCost} total fee
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Order Rules & Operational Modes */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden transition-all hover:shadow-md">
        <div className="bg-gradient-to-r from-emerald-50/90 via-teal-50/40 to-transparent dark:from-emerald-950/30 dark:to-card p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Order & System Operational Modes
              </h2>
              <p className="text-xs text-muted-foreground">
                Control customer cancellation windows and driver auto-assignment
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-100/70 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200/50">
            <Clock className="h-3.5 w-3.5" /> System Automations
          </span>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Customer Cancellation Window (Minutes)
              </label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  step="1"
                  value={formData["order.cancellation_window_mins"] ?? "5"}
                  onChange={(e) => handleChange("order.cancellation_window_mins", e.target.value)}
                  className="w-full rounded-xl border border-input bg-background pl-4 pr-16 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
                  id="setting-cancellation-window"
                />
                <span className="absolute right-3 text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                  mins
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Time window after placing an order during which penalty-free cancellation is
                permitted.
              </p>
            </div>

            {/* Toggle Switches */}
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-slate-50/50 dark:bg-card">
                <div>
                  <p className="text-xs font-bold text-foreground">Auto Driver Dispatch</p>
                  <p className="text-[11px] text-muted-foreground">
                    Automatically assign nearest driver when vendor accepts order.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleVal("system.auto_dispatch")}
                  className="text-emerald-600 hover:opacity-80 transition-opacity"
                  id="setting-auto-dispatch-toggle"
                >
                  {formData["system.auto_dispatch"] === "true" ? (
                    <ToggleRight className="h-7 w-7 text-emerald-600" />
                  ) : (
                    <ToggleLeft className="h-7 w-7 text-slate-400" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-slate-50/50 dark:bg-card">
                <div>
                  <p className="text-xs font-bold text-foreground">Peak Demand Surge Pricing</p>
                  <p className="text-[11px] text-muted-foreground">
                    Apply 1.25x delivery fee multiplier during high order volume.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleVal("system.surge_pricing")}
                  className="text-emerald-600 hover:opacity-80 transition-opacity"
                  id="setting-surge-pricing-toggle"
                >
                  {formData["system.surge_pricing"] === "true" ? (
                    <ToggleRight className="h-7 w-7 text-emerald-600" />
                  ) : (
                    <ToggleLeft className="h-7 w-7 text-slate-400" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Settings Action Footer Bar */}
      <div className="p-4 rounded-2xl border border-border bg-card shadow-md flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Info className="h-4 w-4 text-indigo-600" />
          <span>Changes take effect immediately across vendor, customer, and driver apps.</span>
        </div>
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="inline-flex items-center gap-2.5 px-7 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 text-white font-bold text-sm hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/25"
          id="save-settings-btn"
        >
          <Save className="h-4 w-4" />
          {mutation.isPending ? "Saving Configurations..." : "Save Platform Settings"}
        </button>
      </div>
    </div>
  );
}
