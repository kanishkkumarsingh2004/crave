"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, Truck } from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { format } from "date-fns";

interface Delivery {
  id: string;
  orderId: string;
  driverId: string | null;
  status: string;
  trackingCode: string | null;
  estimatedTimeMin: number | null;
  distanceKm: number | null;
  pickupAddress: string;
  dropAddress: string;
  createdAt: string;
  driver: {
    id: string;
    user: {
      name: string;
      phone: string | null;
    };
  } | null;
  order: {
    id: string;
    customer: {
      user: {
        name: string;
      };
    };
  };
}

interface ApiResponse {
  success: boolean;
  data: Delivery[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

async function fetchDeliveries(params: { page: number; status?: string }): Promise<ApiResponse> {
  const sp = new URLSearchParams({
    page: String(params.page),
    limit: "20",
  });
  if (params.status) sp.set("status", params.status);

  const res = await fetch(`/api/v1/admin/deliveries?${sp}`);
  if (!res.ok) throw new Error("Failed to fetch deliveries");
  return res.json() as Promise<ApiResponse>;
}

export function DeliveriesTable() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-deliveries", page, status],
    queryFn: () => fetchDeliveries({ page, status }),
  });

  const columns: Column<Delivery>[] = [
    {
      header: "Delivery ID",
      accessor: (row) => (
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-primary shrink-0" />
          <span className="font-mono text-xs font-semibold">{row.id.slice(0, 8)}...</span>
        </div>
      ),
    },
    {
      header: "Order / Customer",
      accessor: (row) => (
        <div>
          <div className="font-mono text-xs text-muted-foreground">
            Order #{row.orderId.slice(0, 8)}
          </div>
          <div className="text-sm font-medium">{row.order.customer.user.name}</div>
        </div>
      ),
    },
    {
      header: "Assigned Driver",
      accessor: (row) =>
        row.driver ? (
          <div>
            <div className="text-sm font-medium">{row.driver.user.name}</div>
            <div className="text-xs text-muted-foreground">
              {row.driver.user.phone ?? "No phone"}
            </div>
          </div>
        ) : (
          <span className="text-xs text-amber-500 font-medium bg-amber-500/10 px-2 py-1 rounded-md">
            Unassigned
          </span>
        ),
    },
    {
      header: "Status",
      accessor: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: "Distance / Est.",
      accessor: (row) => (
        <span className="text-xs font-mono">
          {row.distanceKm ? `${row.distanceKm.toFixed(1)} km` : "N/A"} •{" "}
          {row.estimatedTimeMin ? `${row.estimatedTimeMin} mins` : "N/A"}
        </span>
      ),
    },
    {
      header: "Created",
      accessor: (row) => (
        <span className="text-xs text-muted-foreground">
          {format(new Date(row.createdAt), "MMM dd, HH:mm")}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex justify-end items-center">
        <div className="relative w-full sm:w-56">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring"
            id="delivery-status-select"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="ASSIGNING">ASSIGNING</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="DRIVER_ACCEPTED">DRIVER_ACCEPTED</option>
            <option value="PICKUP_READY">PICKUP_READY</option>
            <option value="PICKED_UP">PICKED_UP</option>
            <option value="IN_TRANSIT">IN_TRANSIT</option>
            <option value="ARRIVING">ARRIVING</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="FAILED">FAILED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        isError={isError}
        pagination={
          data?.meta
            ? {
                page: data.meta.page,
                totalPages: data.meta.totalPages,
                total: data.meta.total,
                onPageChange: (p) => setPage(p),
              }
            : undefined
        }
      />
    </div>
  );
}
