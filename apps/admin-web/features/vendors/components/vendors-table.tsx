"use client";

import React, { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Filter, CheckCircle2, XCircle, PauseCircle } from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { format } from "date-fns";

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
// Action button group
// ============================================================

function VendorActions({
  vendor,
  onAction,
}: {
  vendor: Vendor;
  onAction: (id: string, status: string, reason?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const isApproveble = vendor.status === "PENDING" || vendor.status === "SUSPENDED";
  const isRejectable = vendor.status === "PENDING";
  const isSuspendable = vendor.status === "ACTIVE" || vendor.status === "APPROVED";

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center justify-center h-8 px-3 rounded-md border border-input bg-background text-xs font-medium hover:bg-accent transition-colors"
          id={`vendor-action-btn-${vendor.id}`}
        >
          Actions
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 mt-1 w-44 rounded-lg border border-border bg-popover shadow-lg z-20 overflow-hidden">
              {isApproveble && (
                <button
                  onClick={() => {
                    setOpen(false);
                    onAction(vendor.id, "APPROVED");
                  }}
                  className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-medium text-emerald-600 hover:bg-accent transition-colors"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                </button>
              )}
              {isRejectable && (
                <button
                  onClick={() => {
                    setOpen(false);
                    setShowRejectDialog(true);
                  }}
                  className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-medium text-destructive hover:bg-accent transition-colors"
                >
                  <XCircle className="h-3.5 w-3.5" /> Reject
                </button>
              )}
              {isSuspendable && (
                <button
                  onClick={() => {
                    setOpen(false);
                    onAction(vendor.id, "SUSPENDED");
                  }}
                  className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-medium text-orange-600 hover:bg-accent transition-colors"
                >
                  <PauseCircle className="h-3.5 w-3.5" /> Suspend
                </button>
              )}
              {vendor.status === "SUSPENDED" && (
                <button
                  onClick={() => {
                    setOpen(false);
                    onAction(vendor.id, "ACTIVE");
                  }}
                  className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-medium text-emerald-600 hover:bg-accent transition-colors"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Reactivate
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Reject dialog */}
      {showRejectDialog &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="fixed inset-0" onClick={() => setShowRejectDialog(false)} />
            <div className="relative z-10 bg-card rounded-xl border border-border p-6 w-full max-w-sm shadow-2xl space-y-4 my-8 animate-in zoom-in-95 duration-200">
              <h3 className="font-bold text-base text-foreground">Reject Vendor Application</h3>
              <p className="text-sm text-muted-foreground">
                Provide a rejection reason for{" "}
                <span className="font-semibold text-foreground">{vendor.storeName}</span>:
              </p>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Incomplete documentation"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
              <div className="flex gap-2 justify-end pt-2 border-t border-border">
                <button
                  onClick={() => {
                    setShowRejectDialog(false);
                    setRejectReason("");
                  }}
                  className="h-9 px-4 rounded-lg border border-input bg-background text-sm font-medium hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowRejectDialog(false);
                    onAction(vendor.id, "REJECTED", rejectReason || undefined);
                    setRejectReason("");
                  }}
                  className="h-9 px-4 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors"
                >
                  Reject Vendor
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
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
        <div>
          <p className="font-medium text-foreground">{v.storeName}</p>
          <p className="text-xs text-muted-foreground">
            {v.user.name} · {v.email ?? v.user.email}
          </p>
        </div>
      ),
    },
    {
      key: "location",
      header: "Location",
      render: (v) =>
        v.city ? (
          `${v.city}${v.state ? `, ${v.state}` : ""}`
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
      header: "Products",
      render: (v) => v._count.products.toLocaleString(),
    },
    {
      key: "orders",
      header: "Orders",
      render: (v) => v._count.orders.toLocaleString(),
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
      header: "",
      className: "w-28",
      render: (v) => (
        <VendorActions
          vendor={v}
          onAction={(id, newStatus, reason) => mutation.mutate({ id, newStatus, reason })}
        />
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
            placeholder="Search store name, email, city…"
            value={search}
            onChange={handleSearchChange}
            id="vendor-search"
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
            id="vendor-status-filter"
            className="h-9 rounded-md border border-input bg-background text-sm px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="REJECTED">Rejected</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
        {data?.meta && (
          <span className="self-center text-sm text-muted-foreground ml-auto">
            {data.meta.total.toLocaleString()} total
          </span>
        )}
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
