"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Store,
  Truck,
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
  Navigation,
  IndianRupee,
  Wallet,
  LucideIcon,
} from "lucide-react";

interface DashboardStats {
  customers: { total: number; active: number };
  vendors: { total: number; active: number; pending: number };
  drivers: { total: number; active: number; pending: number };
  orders: { total: number; pending: number; active: number; completed: number; cancelled: number };
  revenue: {
    total: string;
    vendorRevenue: string;
    driverPayments: string;
    platformRevenue: string;
  };
  deliveries: { active: number };
}

async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await fetch("/api/v1/admin/dashboard");
  if (!res.ok) throw new Error("Failed to fetch dashboard stats");
  const body = (await res.json()) as { data: DashboardStats };
  return body.data;
}

interface MetricItem {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  badgeClass: string;
  borderHoverClass: string;
}

function MetricCard({ label, value, sub, icon: Icon, badgeClass, borderHoverClass }: MetricItem) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-border bg-card p-4 space-y-3 transition-all duration-300 ${borderHoverClass} hover:shadow-md hover:-translate-y-0.5 cursor-default`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider line-clamp-1">
          {label}
        </p>
        <div
          className={`w-9 h-9 rounded-xl ${badgeClass} flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110`}
        >
          <Icon className="h-4 w-4 text-white shrink-0" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-black tabular-nums text-foreground tracking-tight">{value}</p>
        {sub && (
          <div className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
            <span>{sub}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function DashboardMetrics() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: fetchDashboardStats,
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-card p-4 h-28 animate-pulse bg-muted/30"
          />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive font-semibold">
        Failed to load dashboard metrics. Please check network connection.
      </div>
    );
  }

  const metrics: MetricItem[] = [
    {
      label: "Total Customers",
      value: data.customers.total.toLocaleString(),
      sub: `${data.customers.active} Active`,
      icon: Users,
      badgeClass: "bg-blue-600 text-white shadow-md shadow-blue-600/20",
      borderHoverClass: "hover:border-blue-500/40",
    },
    {
      label: "Total Vendors",
      value: data.vendors.total.toLocaleString(),
      sub: `${data.vendors.active} Active · ${data.vendors.pending} Pending`,
      icon: Store,
      badgeClass: "bg-purple-600 text-white shadow-md shadow-purple-600/20",
      borderHoverClass: "hover:border-purple-500/40",
    },
    {
      label: "Total Drivers",
      value: data.drivers.total.toLocaleString(),
      sub: `${data.drivers.active} Active · ${data.drivers.pending} Pending`,
      icon: Truck,
      badgeClass: "bg-amber-600 text-white shadow-md shadow-amber-600/20",
      borderHoverClass: "hover:border-amber-500/40",
    },
    {
      label: "Total Orders",
      value: data.orders.total.toLocaleString(),
      sub: `${data.orders.pending} Pending Approval`,
      icon: ShoppingBag,
      badgeClass: "bg-indigo-600 text-white shadow-md shadow-indigo-600/20",
      borderHoverClass: "hover:border-indigo-500/40",
    },
    {
      label: "Active Orders",
      value: data.orders.active.toLocaleString(),
      sub: "In Preparation / Transit",
      icon: Clock,
      badgeClass: "bg-cyan-600 text-white shadow-md shadow-cyan-600/20",
      borderHoverClass: "hover:border-cyan-500/40",
    },
    {
      label: "Completed Orders",
      value: data.orders.completed.toLocaleString(),
      sub: "Delivered",
      icon: CheckCircle2,
      badgeClass: "bg-emerald-600 text-white shadow-md shadow-emerald-600/20",
      borderHoverClass: "hover:border-emerald-500/40",
    },
    {
      label: "Cancelled Orders",
      value: data.orders.cancelled.toLocaleString(),
      sub: "Refunded",
      icon: XCircle,
      badgeClass: "bg-rose-600 text-white shadow-md shadow-rose-600/20",
      borderHoverClass: "hover:border-rose-500/40",
    },
    {
      label: "Active Deliveries",
      value: data.deliveries.active.toLocaleString(),
      sub: "Drivers En Route",
      icon: Navigation,
      badgeClass: "bg-teal-600 text-white shadow-md shadow-teal-600/20",
      borderHoverClass: "hover:border-teal-500/40",
    },
    {
      label: "Total GMV Revenue",
      value: `₹${Number(data.revenue.total).toLocaleString()}`,
      sub: `Platform: ₹${Number(data.revenue.platformRevenue).toLocaleString()}`,
      icon: IndianRupee,
      badgeClass: "bg-green-600 text-white shadow-md shadow-green-600/20",
      borderHoverClass: "hover:border-green-500/40",
    },
    {
      label: "Vendor Net Revenue",
      value: `₹${Number(data.revenue.vendorRevenue).toLocaleString()}`,
      sub: `Driver Payouts: ₹${Number(data.revenue.driverPayments).toLocaleString()}`,
      icon: Wallet,
      badgeClass: "bg-violet-600 text-white shadow-md shadow-violet-600/20",
      borderHoverClass: "hover:border-violet-500/40",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {metrics.map((m) => (
        <MetricCard key={m.label} {...m} />
      ))}
    </div>
  );
}
