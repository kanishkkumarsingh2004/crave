import type { Metadata } from "next";
import { DashboardMetrics } from "@/features/dashboard/components/dashboard-metrics";
import { DashboardCharts } from "@/features/dashboard/components/dashboard-charts";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Platform overview and operational metrics</p>
      </div>
      <DashboardMetrics />
      <DashboardCharts />
    </div>
  );
}
