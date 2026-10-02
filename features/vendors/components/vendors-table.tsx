"use client";

import React, { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Filter } from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { format } from "date-fns";
import Link from "next/link";

// ============================================================
// Types
// ============================================================

interface Vendor {
  id: string;
  storeName: string;
  description: string | null;
  logoUrl: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  status: string;
  isOpen: boolean;
  approvedAt: string | null;
  createdAt: string;
  revenue?: number;
  user: { id: string; name: string; email: string; status: string };
  _count: { products: number; orders: number };
}

interface ApiResponse {
  success: boolean;
  data: Vendor[];
  meta?: { page: number; limit: number; total: number; totalPages: number };
}

// ============================================================
// API helpers
// ============================================================

async function fetchVendors(params: {
  page: number;
  search?: string;
  status?: string;
}): Promise<ApiResponse> {
  const sp = new URLSearchParams({ page: String(params.page), limit: "20" });
  if (params.search) sp.set("search", params.search);
  if (params.status) sp.set("status", params.status);
  const res = await fetch(`/api/v1/admin/vendors?${sp}`);
  if (!res.ok) throw new Error("Failed to fetch vendors");
  return res.json() as Promise<ApiResponse>;
}

async function updateVendorStatus(id: string, status: string, reason?: string): Promise<void> {
  const res = await fetch(`/api/v1/admin/vendors/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, reason }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(body.error?.message ?? "Failed to update vendor status");
  }
}

// ============================================================
// Main component
// ============================================================

export function VendorsTable() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const queryClient = useQueryClient();

  const debounce = useCallback((value: string) => setDebouncedSearch(value), []);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setSearch(v);
    clearTimeout(
      (window as Window & { _vendorSearchTimer?: ReturnType<typeof setTimeout> })
        ._vendorSearchTimer,
    );
    (window as Window & { _vendorSearchTimer?: ReturnType<typeof setTimeout> })._vendorSearchTimer =
      setTimeout(() => debounce(v), 400);
    setPage(1);
  }

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "vendors", page, debouncedSearch, status],
    queryFn: () =>
      fetchVendors({ page, search: debouncedSearch || undefined, status: status || undefined }),
  });

  const mutation = useMutation({
    mutationFn: ({ id, newStatus, reason }: { id: string; newStatus: string; reason?: string }) =>
      updateVendorStatus(id, newStatus, reason),
    onSuccess: () => {
      toast.success("Vendor status updated");
      void queryClient.invalidateQueries({ queryKey: ["admin", "vendors"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const columns: Column<Vendor>[] = [
    {
      key: "storeName",
      header: "Store",
      render: (v) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl overflow-hidden bg-blue-50 border border-slate-200 shrink-0 flex items-center justify-center">
            {v.logoUrl ? (
              <img src={v.logoUrl} alt={v.storeName} className="w-full h-full object-cover" />
            ) : (
              <span className="font-bold text-blue-600 text-sm">{v.storeName[0]}</span>
            )}
          </div>
          <div>
            <Link
              href={`/vendors/${v.id}`}
              className="font-bold text-slate-900 hover:text-blue-600 transition-colors inline-flex items-center gap-1"
            >
              <span>{v.storeName}</span>
              <span className="text-[10px] text-blue-500 font-semibold">↗</span>
            </Link>
            <p className="text-xs text-muted-foreground">
              {v.user.name} · {v.email ?? v.user.email}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "location",
      header: "Location",
      render: (v) =>
        v.city ? (
          <span className="text-xs font-medium text-slate-700">
            {v.city}{v.state ? `, ${v.state}` : ""}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (v) => (
        <div className="flex items-center gap-2">
          <StatusBadge value={v.status} />
          {v.status === "ACTIVE" && (
            <span className={`text-xs ${v.isOpen ? "text-emerald-600" : "text-muted-foreground"}`}>
              {v.isOpen ? "Open" : "Closed"}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "products",
      header: "Menu Items",
      render: (v) => (
        <Link
          href={`/vendors/${v.id}`}
          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
        >
          <span>{v._count.products} items</span>
          <span className="text-[10px]">↗</span>
        </Link>
      ),
    },
    {
      key: "orders",
      header: "Orders",
      render: (v) => v._count.orders.toLocaleString(),
    },
    {
      key: "revenue",
      header: "Net Revenue",
      render: (v) => `₹${(v.revenue ?? 0).toLocaleString()}`,
    },
    {
      key: "createdAt",
      header: "Registered",
      render: (v) => (
        <span className="text-muted-foreground text-xs whitespace-nowrap">
          {format(new Date(v.createdAt), "MMM d, yyyy")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Action",
      className: "w-36 text-right",
      render: (v) => (
        <div className="flex items-center gap-2 justify-end">
          <Link
            href={`/vendors/${v.id}`}
            id={`manage-vendor-btn-${v.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-xs border border-blue-200 hover:border-transparent shrink-0"
          >
            <span>Manage Store</span>
            <span className="text-[10px] font-black">↗</span>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search store name, email, city…"
              value={search}
              onChange={handleSearchChange}
              id="vendor-search"
              className="w-full pl-9 pr-4 h-9 rounded-xl border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              id="vendor-status-filter"
              className="h-9 rounded-xl border border-input bg-background text-sm px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="APPROVED">Approved</option>
              <option value="PENDING">Pending</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="CLOSED">Closed</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        <Link
          href="/vendors/new"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all shrink-0"
        >
          <span>+ Add Vendor</span>
        </Link>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        emptyMessage="No vendors found."
        keyExtractor={(v) => v.id}
        page={page}
        totalPages={data?.meta?.totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
