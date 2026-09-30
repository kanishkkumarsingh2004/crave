"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, Package } from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { format } from "date-fns";

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  status: string;
  createdAt: string;
  vendor: {
    id: string;
    storeName: string;
  };
  category: {
    id: string;
    name: string;
  } | null;
  inventory: {
    onHand: number;
    reserved: number;
  } | null;
}

interface ApiResponse {
  success: boolean;
  data: Product[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

async function fetchProducts(params: {
  page: number;
  search?: string;
  status?: string;
}): Promise<ApiResponse> {
  const sp = new URLSearchParams({
    page: String(params.page),
    limit: "20",
  });
  if (params.search) sp.set("search", params.search);
  if (params.status) sp.set("status", params.status);

  const res = await fetch(`/api/v1/admin/products?${sp}`);
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json() as Promise<ApiResponse>;
}

export function ProductsTable() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-products", page, search, status],
    queryFn: () => fetchProducts({ page, search, status }),
  });

  const columns: Column<Product>[] = [
    {
      header: "Product",
      accessor: (row) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Package className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold text-sm">{row.name}</div>
            <div className="text-xs text-muted-foreground font-mono">SKU: {row.sku}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Vendor",
      accessor: (row) => <span className="text-sm font-medium">{row.vendor.storeName}</span>,
    },
    {
      header: "Category",
      accessor: (row) => <span className="text-sm">{row.category?.name ?? "Uncategorized"}</span>,
    },
    {
      header: "Price",
      accessor: (row) => <span className="text-sm font-semibold">${row.price.toFixed(2)}</span>,
    },
    {
      header: "Stock (Available / Reserved)",
      accessor: (row) => (
        <span className="text-xs font-mono">
          {row.inventory
            ? `${row.inventory.onHand - row.inventory.reserved} / ${row.inventory.reserved}`
            : "N/A"}
        </span>
      ),
    },
    {
      header: "Status",
      accessor: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: "Created",
      accessor: (row) => (
        <span className="text-xs text-muted-foreground">
          {format(new Date(row.createdAt), "MMM dd, yyyy")}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search product name or SKU..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            id="product-search-input"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-48">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring"
              id="product-status-select"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="DRAFT">DRAFT</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="ARCHIVED">ARCHIVED</option>
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
