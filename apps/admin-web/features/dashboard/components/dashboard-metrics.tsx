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
  color: string;
  bg: string;
}

function MetricCard({ label, value, sub, icon: Icon, color, bg }: MetricItem) {
  return (
    <div className="group rounded-xl border border-border bg-card p-4 space-y-2 transition-all hover:border-primary/30 hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider line-clamp-1">
          {label}
        </p>
        <div className={`p-2 rounded-lg ${bg} ${color} flex-shrink-0 transition-transform group-hover:scale-105`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold tabular-nums text-foreground tracking-tight">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1 font-medium">{sub}</p>}
      </div>
    </div>
  );
}

export function DashboardMetrics() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: fetchDashboardStats,
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-4 h-24 animate-pulse bg-muted/40"
          />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive font-medium">
        Failed to load dashboard metrics. Please refresh the page.
      </div>
    );
  }

  const metrics: MetricItem[] = [
    {
      label: "Total Customers",
      value: data.customers.total,
      sub: `${data.customers.active} active`,
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      label: "Total Vendors",
      value: data.vendors.total,
      sub: `${data.vendors.active} active · ${data.vendors.pending} pending`,
      icon: Store,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-500/10",
    },
    {
      label: "Total Drivers",
      value: data.drivers.total,
      sub: `${data.drivers.active} active · ${data.drivers.pending} pending`,
      icon: Truck,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      label: "Total Orders",
      value: data.orders.total,
      sub: `${data.orders.pending} pending`,
      icon: ShoppingBag,
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-500/10",
    },
    {
      label: "Active Orders",
      value: data.orders.active,
      sub: "In preparation",
      icon: Clock,
      color: "text-cyan-600 dark:text-cyan-400",
      bg: "bg-cyan-500/10",
    },
    {
      label: "Completed Orders",
      value: data.orders.completed,
      sub: "Successfully delivered",
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Cancelled Orders",
      value: data.orders.cancelled,
      sub: "Refunded / Cancelled",
      icon: XCircle,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-500/10",
    },
    {
      label: "Active Deliveries",
      value: data.deliveries.active,
      sub: "Drivers en route",
      icon: Navigation,
      color: "text-teal-600 dark:text-teal-400",
      bg: "bg-teal-500/10",
    },
    {
      label: "Total Revenue",
      value: `₹${data.revenue.total}`,
      sub: `Platform: ₹${data.revenue.platformRevenue}`,
      icon: IndianRupee,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-500/10",
    },
    {
      label: "Vendor Revenue",
      value: `₹${data.revenue.vendorRevenue}`,
      sub: `Driver: ₹${data.revenue.driverPayments}`,
      icon: Wallet,
      color: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-500/10",
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
