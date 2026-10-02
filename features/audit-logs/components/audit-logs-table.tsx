"use client";

import React, { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, ShieldAlert, FileText, User } from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { format } from "date-fns";

interface AuditLog {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface ApiResponse {
  success: boolean;
  data: AuditLog[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

async function fetchAuditLogs(params: {
  page: number;
  search?: string;
  resource?: string;
  action?: string;
}): Promise<ApiResponse> {
  const sp = new URLSearchParams({
    page: String(params.page),
    limit: "20",
  });
  if (params.search) sp.set("search", params.search);
  if (params.resource) sp.set("resource", params.resource);
  if (params.action) sp.set("action", params.action);

  const res = await fetch(`/api/v1/admin/audit-logs?${sp}`);
  if (!res.ok) throw new Error("Failed to fetch audit logs");
  return res.json() as Promise<ApiResponse>;
}

export function AuditLogsTable() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [resource, setResource] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["audit-logs", page, search, resource],
    queryFn: () => fetchAuditLogs({ page, search, resource }),
  });

  const columns: Column<AuditLog>[] = [
    {
      header: "Timestamp",
      accessor: (row) => (
        <span className="text-xs font-mono text-muted-foreground">
          {format(new Date(row.createdAt), "yyyy-MM-dd HH:mm:ss")}
        </span>
      ),
    },
    {
      header: "Actor",
      accessor: (row) => (
        <div className="flex items-center gap-2">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-medium">{row.actorEmail ?? row.actorId ?? "System"}</span>
        </div>
      ),
    },
    {
      header: "Action",
      accessor: (row) => (
        <span className="inline-flex items-center rounded-md bg-blue-500/10 px-2 py-1 text-xs font-semibold text-blue-500 font-mono">
          {row.action}
        </span>
      ),
    },
    {
      header: "Resource",
      accessor: (row) => (
        <div className="text-xs">
          <span className="font-semibold">{row.resource}</span>
          {row.resourceId && (
            <span className="text-muted-foreground block font-mono text-[11px] truncate max-w-[120px]">
              {row.resourceId}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "IP Address",
      accessor: (row) => (
        <span className="text-xs font-mono text-muted-foreground">{row.ipAddress ?? "—"}</span>
      ),
    },
    {
      header: "Metadata",
      accessor: (row) =>
        row.metadata ? (
          <details className="cursor-pointer text-xs">
            <summary className="text-primary text-[11px] hover:underline font-mono">
              View Payload
            </summary>
            <pre className="mt-1 max-w-xs overflow-x-auto rounded bg-muted p-2 text-[10px] font-mono">
              {JSON.stringify(row.metadata, null, 2)}
            </pre>
          </details>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by action, email, resource..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            id="audit-search-input"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-48">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <select
              value={resource}
              onChange={(e) => {
                setResource(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring"
              id="audit-resource-select"
            >
              <option value="">All Resources</option>
              <option value="USER">USER</option>
              <option value="VENDOR">VENDOR</option>
              <option value="DRIVER">DRIVER</option>
              <option value="ORDER">ORDER</option>
              <option value="PRODUCT">PRODUCT</option>
              <option value="CATEGORY">CATEGORY</option>
              <option value="SETTING">SETTING</option>
            </select>
          </div>
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
