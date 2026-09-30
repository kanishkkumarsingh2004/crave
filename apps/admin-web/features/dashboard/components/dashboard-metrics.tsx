"use client";

import { useQuery } from "@tanstack/react-query";

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

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-1">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-5 h-24 animate-pulse bg-muted"
          />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">
        Failed to load dashboard metrics. Please refresh.
      </div>
    );
  }

  const metrics = [
    {
      label: "Total Customers",
      value: data.customers.total,
      sub: `${data.customers.active} active`,
    },
    {
      label: "Total Vendors",
      value: data.vendors.total,
      sub: `${data.vendors.active} active · ${data.vendors.pending} pending`,
    },
    {
      label: "Total Drivers",
      value: data.drivers.total,
      sub: `${data.drivers.active} active · ${data.drivers.pending} pending`,
    },
    { label: "Total Orders", value: data.orders.total, sub: `${data.orders.pending} pending` },
    { label: "Active Orders", value: data.orders.active },
    { label: "Completed Orders", value: data.orders.completed },
    { label: "Cancelled Orders", value: data.orders.cancelled },
    { label: "Active Deliveries", value: data.deliveries.active },
    {
      label: "Total Revenue",
      value: `₹${data.revenue.total}`,
      sub: `Platform: ₹${data.revenue.platformRevenue}`,
    },
    {
      label: "Vendor Revenue",
      value: `₹${data.revenue.vendorRevenue}`,
      sub: `Driver: ₹${data.revenue.driverPayments}`,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {metrics.map((m) => (
        <MetricCard key={m.label} label={m.label} value={m.value} sub={m.sub} />
      ))}
    </div>
  );
}
