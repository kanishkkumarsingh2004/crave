"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, Sliders, DollarSign, Percent, ShieldCheck, MapPin } from "lucide-react";

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

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground animate-pulse">Loading settings...</div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Commission & Pricing Settings */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-sm">
        <h2 className="text-lg font-bold border-b border-border pb-3 flex items-center gap-2">
          <Percent className="h-5 w-5 text-primary" />
          Commission & Payout Rates
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Platform Commission Rate (%)</label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                value={formData["platform.commission_rate"] ?? "15"}
                onChange={(e) => handleChange("platform.commission_rate", e.target.value)}
                className="w-full rounded-lg border border-input bg-background p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                id="setting-commission-rate"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                %
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Fee charged to vendors on each order subtotal
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Minimum Order Subtotal (₹)</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={formData["order.minimum_amount"] ?? "10.00"}
                onChange={(e) => handleChange("order.minimum_amount", e.target.value)}
                className="w-full rounded-lg border border-input bg-background p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                id="setting-min-order"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Minimum order amount allowed for checkout
            </p>
          </div>
        </div>
      </div>

      {/* Delivery Fee Settings */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-sm">
        <h2 className="text-lg font-bold border-b border-border pb-3 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Delivery Pricing & Dispatch Configuration
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Base Delivery Fee (₹)</label>
            <input
              type="number"
              step="0.01"
              value={formData["delivery.base_fee"] ?? "3.50"}
              onChange={(e) => handleChange("delivery.base_fee", e.target.value)}
              className="w-full rounded-lg border border-input bg-background p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              id="setting-base-fee"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Per Kilometer Rate (₹)</label>
            <input
              type="number"
              step="0.01"
              value={formData["delivery.per_km_rate"] ?? "1.25"}
              onChange={(e) => handleChange("delivery.per_km_rate", e.target.value)}
              className="w-full rounded-lg border border-input bg-background p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              id="setting-per-km-rate"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Max Delivery Radius (km)</label>
            <input
              type="number"
              step="1"
              value={formData["delivery.max_radius_km"] ?? "25"}
              onChange={(e) => handleChange("delivery.max_radius_km", e.target.value)}
              className="w-full rounded-lg border border-input bg-background p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              id="setting-max-radius"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm"
          id="save-settings-btn"
        >
          <Save className="h-4 w-4" />
          {mutation.isPending ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
