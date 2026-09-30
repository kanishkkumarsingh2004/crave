"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Filter, CreditCard } from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { format } from "date-fns";

interface Payment {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  providerPaymentId: string | null;
  createdAt: string;
  order: {
    id: string;
    customer: {
      user: {
        name: string;
        email: string;
      };
    };
  };
}

interface ApiResponse {
  success: boolean;
  data: Payment[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

async function fetchPayments(params: { page: number; status?: string }): Promise<ApiResponse> {
  const sp = new URLSearchParams({
    page: String(params.page),
    limit: "20",
  });
  if (params.status) sp.set("status", params.status);

  const res = await fetch(`/api/v1/admin/payments?${sp}`);
  if (!res.ok) throw new Error("Failed to fetch payments");
  return res.json() as Promise<ApiResponse>;
}

export function PaymentsTable() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-payments", page, status],
    queryFn: () => fetchPayments({ page, status }),
  });

  const columns: Column<Payment>[] = [
    {
      header: "Transaction ID",
      accessor: (row) => (
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-primary shrink-0" />
          <span className="font-mono text-xs font-semibold">{row.id.slice(0, 8)}...</span>
        </div>
      ),
    },
    {
      header: "Customer",
      accessor: (row) => (
        <div>
          <div className="text-sm font-medium">{row.order.customer.user.name}</div>
          <div className="text-xs text-muted-foreground">{row.order.customer.user.email}</div>
        </div>
      ),
    },
    {
      header: "Order ID",
      accessor: (row) => (
        <span className="font-mono text-xs text-muted-foreground">#{row.orderId.slice(0, 8)}</span>
      ),
    },
    {
      header: "Amount",
      accessor: (row) => (
        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
          ₹{row.amount.toFixed(2)} {row.currency}
        </span>
      ),
    },
    {
      header: "Provider",
      accessor: (row) => (
        <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-muted">
          {row.provider}
        </span>
      ),
    },
    {
      header: "Status",
      accessor: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: "Date",
      accessor: (row) => (
        <span className="text-xs text-muted-foreground">
          {format(new Date(row.createdAt), "MMM dd, yyyy HH:mm")}
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
            id="payment-status-select"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="PROCESSING">PROCESSING</option>
            <option value="AUTHORIZED">AUTHORIZED</option>
            <option value="PAID">PAID</option>
            <option value="FAILED">FAILED</option>
            <option value="REFUNDED">REFUNDED</option>
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
