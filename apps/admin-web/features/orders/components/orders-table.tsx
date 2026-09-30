"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter } from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { format } from "date-fns";

// ============================================================
// Types
// ============================================================

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: string;
  deliveryFee: string;
  tax: string;
  total: string;
  currency: string;
  deliveryCity: string;
  deliveryState: string;
  createdAt: string;
  vendor?: { id: string; storeName: string };
  delivery?: { id: string; status: string } | null;
  _count?: { items: number };
}

interface ApiResponse {
  success: boolean;
  data: Order[];
  meta?: { page: number; limit: number; total: number; totalPages: number };
}

// ============================================================
// API helpers
// ============================================================

async function fetchOrders(params: {
  page: number;
  search?: string;
  status?: string;
}): Promise<ApiResponse> {
  const sp = new URLSearchParams({ page: String(params.page), limit: "20" });
  if (params.search) sp.set("search", params.search);
  if (params.status) sp.set("status", params.status);
  const res = await fetch(`/api/v1/admin/orders?${sp}`);
  if (!res.ok) throw new Error("Failed to fetch orders");
  return res.json() as Promise<ApiResponse>;
}

// ============================================================
// Main component
// ============================================================

export function OrdersTable() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setSearch(v);
    clearTimeout(
      (window as Window & { _orderSearchTimer?: ReturnType<typeof setTimeout> })._orderSearchTimer,
    );
    (window as Window & { _orderSearchTimer?: ReturnType<typeof setTimeout> })._orderSearchTimer =
      setTimeout(() => {
        setDebouncedSearch(v);
        setPage(1);
      }, 400);
  }

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "orders", page, debouncedSearch, status],
    queryFn: () =>
      fetchOrders({ page, search: debouncedSearch || undefined, status: status || undefined }),
  });

  const columns: Column<Order>[] = [
    {
      key: "orderNumber",
      header: "Order #",
      render: (o) => (
        <span className="font-mono text-xs font-semibold text-primary">{o.orderNumber}</span>
      ),
    },
    {
      key: "vendor",
      header: "Vendor",
      render: (o) => o.vendor?.storeName ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: "status",
      header: "Order Status",
      render: (o) => <StatusBadge value={o.status} />,
    },
    {
      key: "delivery",
      header: "Delivery",
      render: (o) =>
        o.delivery ? (
          <StatusBadge value={o.delivery.status} />
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      key: "total",
      header: "Total",
      render: (o) => (
        <span className="font-semibold tabular-nums">
          ₹{parseFloat(o.total).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: "deliveryCity",
      header: "Delivery To",
      render: (o) =>
        o.deliveryCity ? (
          `${o.deliveryCity}${o.deliveryState ? `, ${o.deliveryState}` : ""}`
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "createdAt",
      header: "Placed",
      render: (o) => (
        <span className="text-muted-foreground text-xs whitespace-nowrap">
          {format(new Date(o.createdAt), "MMM d, yyyy HH:mm")}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search by order number…"
            value={search}
            onChange={handleSearchChange}
            id="order-search"
            className="w-full pl-9 pr-4 h-9 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            id="order-status-filter"
            className="h-9 rounded-md border border-input bg-background text-sm px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PREPARING">Preparing</option>
            <option value="READY_FOR_PICKUP">Ready for Pickup</option>
            <option value="PICKED_UP">Picked Up</option>
            <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
        {data?.meta && (
          <span className="self-center text-sm text-muted-foreground ml-auto">
            {data.meta.total.toLocaleString()} orders
          </span>
        )}
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        emptyMessage="No orders found."
        keyExtractor={(o) => o.id}
        page={page}
        totalPages={data?.meta?.totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
