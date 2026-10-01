"use client";

import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, ArrowUpRight, Store, Clock, PackageCheck } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import { format } from "date-fns";

interface RecentOrder {
  id: string;
  orderNumber: string;
  status: string;
  total: string;
  createdAt: string;
  vendor: { storeName: string };
  deliveryRecipientName: string;
}

async function fetchRecentOrders(): Promise<RecentOrder[]> {
  const res = await fetch("/api/v1/admin/orders?limit=6");
  if (!res.ok) return [];
  const body = (await res.json()) as { data: RecentOrder[] };
  return body.data ?? [];
}

export function RecentActivityFeed() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin", "dashboard", "recent-orders"],
    queryFn: fetchRecentOrders,
    refetchInterval: 30_000,
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h2 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-primary" />
            <span>Recent Orders & Transactions</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Live order placements across vendor stores
          </p>
        </div>
        <Link
          href="/orders"
          className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/80 transition-colors"
        >
          <span>View All Orders</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-14 rounded-xl bg-muted/40 animate-pulse border border-border"
            />
          ))}
        </div>
      ) : !orders || orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-2">
          <PackageCheck className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-sm font-semibold text-foreground">No recent orders found</p>
          <p className="text-xs text-muted-foreground">
            Orders placed by customers will stream here live.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border/60">
          {orders.map((order) => (
            <div
              key={order.id}
              className="py-3.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0 hover:bg-muted/20 px-2 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Store className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {order.orderNumber} ·{" "}
                    <span className="font-normal text-muted-foreground">
                      {order.vendor.storeName}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <span>{order.deliveryRecipientName || "Customer"}</span>
                    <span>•</span>
                    <Clock className="h-3 w-3" />
                    <span>{format(new Date(order.createdAt), "MMM d, h:mm a")}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <StatusBadge value={order.status} />
                <span className="text-sm font-bold text-foreground tabular-nums">
                  ₹{Number(order.total).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
