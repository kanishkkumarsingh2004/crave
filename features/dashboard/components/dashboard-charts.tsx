"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useQuery } from "@tanstack/react-query";

interface ChartPoint {
  date: string;
  orders: number;
  revenue: number;
}

async function fetchChartData(): Promise<ChartPoint[]> {
  const res = await fetch("/api/v1/admin/analytics/overview?days=30");
  if (!res.ok) throw new Error("Failed to fetch chart data");
  const body = (await res.json()) as { data: ChartPoint[] };
  return body.data;
}

export function DashboardCharts() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "analytics", "overview"],
    queryFn: fetchChartData,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-5 h-72 animate-pulse bg-muted/30"
          />
        ))}
      </div>
    );
  }

  const chartData = data ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Orders over time */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-foreground">Orders Over Time (30d)</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Daily volume of placed orders</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            Order Trends
          </span>
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="orderGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(val: any) => [`${val} orders`, "Orders"]}
            />
            <Area
              type="monotone"
              dataKey="orders"
              stroke="#6366f1"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#orderGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Revenue over time */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-foreground">Revenue Over Time (30d)</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Gross GMV platform revenue</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            Financials
          </span>
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(val: any) => [`₹${val}`, "Revenue"]}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#10b981"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#revGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
