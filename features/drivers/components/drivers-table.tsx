"use client";

import React, { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Filter, CheckCircle2, XCircle, PauseCircle } from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { format } from "date-fns";

// ============================================================
// Types
// ============================================================

interface Driver {
  id: string;
  status: string;
  availability: string;
  vehicleType: string | null;
  vehicleNumber: string | null;
  rating: string | null;
  totalDeliveries: number;
  approvedAt: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string; phone: string | null; status: string };
  _count: { deliveries: number };
}

interface ApiResponse {
  success: boolean;
  data: Driver[];
  meta?: { page: number; limit: number; total: number; totalPages: number };
}

// ============================================================
// API helpers
// ============================================================

async function fetchDrivers(params: {
  page: number;
  search?: string;
  status?: string;
}): Promise<ApiResponse> {
  const sp = new URLSearchParams({ page: String(params.page), limit: "20" });
  if (params.search) sp.set("search", params.search);
  if (params.status) sp.set("status", params.status);
  const res = await fetch(`/api/v1/admin/drivers?${sp}`);
  if (!res.ok) throw new Error("Failed to fetch drivers");
  return res.json() as Promise<ApiResponse>;
}

async function updateDriverStatus(id: string, status: string): Promise<void> {
  const res = await fetch(`/api/v1/admin/drivers/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(body.error?.message ?? "Failed to update driver status");
  }
}

// ============================================================
// Action buttons
// ============================================================

function DriverActions({
  driver,
  onAction,
}: {
  driver: Driver;
  onAction: (id: string, status: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const isApprovable = driver.status === "PENDING" || driver.status === "SUSPENDED";
  const isSuspendable = driver.status === "ACTIVE" || driver.status === "APPROVED";
  const isDeactivatable = driver.status !== "DEACTIVATED";

  if (!isApprovable && !isSuspendable && !isDeactivatable) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center justify-center h-8 px-3 rounded-md border border-input bg-background text-xs font-medium hover:bg-accent transition-colors"
        id={`driver-action-btn-${driver.id}`}
      >
        Actions
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-44 rounded-lg border border-border bg-popover shadow-lg z-20 overflow-hidden">
            {isApprovable && (
              <button
                onClick={() => {
                  setOpen(false);
                  onAction(driver.id, "APPROVED");
                }}
                className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-medium text-emerald-600 hover:bg-accent transition-colors"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Approve
              </button>
            )}
            {isSuspendable && (
              <button
                onClick={() => {
                  setOpen(false);
                  onAction(driver.id, "SUSPENDED");
                }}
                className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-medium text-orange-600 hover:bg-accent transition-colors"
              >
                <PauseCircle className="h-3.5 w-3.5" /> Suspend
              </button>
            )}
            {isDeactivatable && (
              <button
                onClick={() => {
                  setOpen(false);
                  onAction(driver.id, "DEACTIVATED");
                }}
                className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-medium text-destructive hover:bg-accent transition-colors"
              >
                <XCircle className="h-3.5 w-3.5" /> Deactivate
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// Main component
// ============================================================

export function DriversTable() {
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
      (window as Window & { _driverSearchTimer?: ReturnType<typeof setTimeout> })
        ._driverSearchTimer,
    );
    (window as Window & { _driverSearchTimer?: ReturnType<typeof setTimeout> })._driverSearchTimer =
      setTimeout(() => debounce(v), 400);
    setPage(1);
  }

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "drivers", page, debouncedSearch, status],
    queryFn: () =>
      fetchDrivers({ page, search: debouncedSearch || undefined, status: status || undefined }),
  });

  const mutation = useMutation({
    mutationFn: ({ id, newStatus }: { id: string; newStatus: string }) =>
      updateDriverStatus(id, newStatus),
    onSuccess: () => {
      toast.success("Driver status updated");
      void queryClient.invalidateQueries({ queryKey: ["admin", "drivers"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const columns: Column<Driver>[] = [
    {
      key: "driver",
      header: "Driver",
      render: (d) => (
        <div>
          <p className="font-medium text-foreground">{d.user.name}</p>
          <p className="text-xs text-muted-foreground">{d.user.email}</p>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (d) => d.user.phone ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: "vehicle",
      header: "Vehicle",
      render: (d) =>
        d.vehicleType ? (
          `${d.vehicleType}${d.vehicleNumber ? ` · ${d.vehicleNumber}` : ""}`
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (d) => (
        <div className="flex items-center gap-2">
          <StatusBadge value={d.status} />
          {d.status === "ACTIVE" && <StatusBadge value={d.availability} />}
        </div>
      ),
    },
    {
      key: "totalDeliveries",
      header: "Deliveries",
      render: (d) => d.totalDeliveries.toLocaleString(),
    },
    {
      key: "rating",
      header: "Rating",
      render: (d) =>
        d.rating ? (
          <span className="font-medium">⭐ {Number(d.rating).toFixed(1)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "createdAt",
      header: "Registered",
      render: (d) => (
        <span className="text-muted-foreground text-xs whitespace-nowrap">
          {format(new Date(d.createdAt), "MMM d, yyyy")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-28",
      render: (d) => (
        <DriverActions
          driver={d}
          onAction={(id, newStatus) => mutation.mutate({ id, newStatus })}
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
            placeholder="Search by name or email…"
            value={search}
            onChange={handleSearchChange}
            id="driver-search"
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
            id="driver-status-filter"
            className="h-9 rounded-md border border-input bg-background text-sm px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="DEACTIVATED">Deactivated</option>
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
        emptyMessage="No drivers found."
        keyExtractor={(d) => d.id}
        page={page}
        totalPages={data?.meta?.totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
