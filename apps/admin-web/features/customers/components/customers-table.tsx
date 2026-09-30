"use client";

import React, { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Filter } from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { format } from "date-fns";

// ============================================================
// Types
// ============================================================

interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  emailVerified: boolean;
  createdAt: string;
}

interface ApiResponse {
  success: boolean;
  data: User[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================
// API helpers
// ============================================================

async function fetchCustomers(params: {
  page: number;
  search?: string;
  status?: string;
}): Promise<ApiResponse> {
  const sp = new URLSearchParams({
    role: "CUSTOMER",
    page: String(params.page),
    limit: "20",
  });
  if (params.search) sp.set("search", params.search);
  if (params.status) sp.set("status", params.status);

  const res = await fetch(`/api/v1/admin/users?${sp}`);
  if (!res.ok) throw new Error("Failed to fetch customers");
  return res.json() as Promise<ApiResponse>;
}

async function updateUserStatus(id: string, status: string): Promise<void> {
  const res = await fetch(`/api/v1/admin/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(body.error?.message ?? "Failed to update user status");
  }
}

// ============================================================
// Action Menu
// ============================================================

function UserActions({
  user,
  onAction,
}: {
  user: User;
  onAction: (id: string, status: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const actions = [
    user.status !== "ACTIVE" && { label: "Activate", status: "ACTIVE", danger: false },
    user.status !== "SUSPENDED" && { label: "Suspend", status: "SUSPENDED", danger: true },
    user.status !== "DEACTIVATED" && { label: "Deactivate", status: "DEACTIVATED", danger: true },
  ].filter(Boolean) as { label: string; status: string; danger: boolean }[];

  if (actions.length === 0) return <span className="text-muted-foreground text-xs">—</span>;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center justify-center h-8 px-3 rounded-md border border-input bg-background text-xs font-medium hover:bg-accent transition-colors"
        id={`user-action-btn-${user.id}`}
      >
        Actions
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-40 rounded-lg border border-border bg-popover shadow-lg z-20 overflow-hidden">
            {actions.map((a) => (
              <button
                key={a.status}
                onClick={() => {
                  setOpen(false);
                  onAction(user.id, a.status);
                }}
                className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors hover:bg-accent ${a.danger ? "text-destructive hover:text-destructive" : ""}`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// Main component
// ============================================================

export function CustomersTable() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const queryClient = useQueryClient();

  const debounce = useCallback((value: string) => {
    setDebouncedSearch(value);
  }, []);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setSearch(v);
    clearTimeout(
      (window as Window & { _searchTimer?: ReturnType<typeof setTimeout> })._searchTimer,
    );
    (window as Window & { _searchTimer?: ReturnType<typeof setTimeout> })._searchTimer = setTimeout(
      () => debounce(v),
      400,
    );
    setPage(1);
  }

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "customers", page, debouncedSearch, status],
    queryFn: () =>
      fetchCustomers({ page, search: debouncedSearch || undefined, status: status || undefined }),
  });

  const mutation = useMutation({
    mutationFn: ({ id, newStatus }: { id: string; newStatus: string }) =>
      updateUserStatus(id, newStatus),
    onSuccess: () => {
      toast.success("Customer status updated");
      void queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const columns: Column<User>[] = [
    {
      key: "name",
      header: "Customer",
      render: (u) => (
        <div>
          <p className="font-medium text-foreground">{u.name}</p>
          <p className="text-xs text-muted-foreground">{u.email}</p>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (u) => u.phone ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (u) => <StatusBadge value={u.status} />,
    },
    {
      key: "emailVerified",
      header: "Verified",
      render: (u) => (
        <span
          className={u.emailVerified ? "text-emerald-600 font-medium" : "text-muted-foreground"}
        >
          {u.emailVerified ? "Yes" : "No"}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Joined",
      render: (u) => (
        <span className="text-muted-foreground text-xs whitespace-nowrap">
          {format(new Date(u.createdAt), "MMM d, yyyy")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-28",
      render: (u) => (
        <UserActions user={u} onAction={(id, newStatus) => mutation.mutate({ id, newStatus })} />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search by name, email, phone…"
            value={search}
            onChange={handleSearchChange}
            id="customer-search"
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
            id="customer-status-filter"
            className="h-9 rounded-md border border-input bg-background text-sm px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">All Statuses</option>
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
        emptyMessage="No customers found."
        keyExtractor={(u) => u.id}
        page={page}
        totalPages={data?.meta?.totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
