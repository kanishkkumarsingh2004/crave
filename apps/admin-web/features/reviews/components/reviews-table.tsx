"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Filter, Star, User, Store, Package, Truck } from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { format } from "date-fns";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  customer: {
    name: string;
    email: string;
  };
  vendor: {
    storeName: string;
  } | null;
  product: {
    name: string;
  } | null;
}

interface ApiResponse {
  success: boolean;
  data: Review[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

async function fetchReviews(params: { page: number; rating?: string }): Promise<ApiResponse> {
  const sp = new URLSearchParams({
    page: String(params.page),
    limit: "20",
  });
  if (params.rating) sp.set("rating", params.rating);

  const res = await fetch(`/api/v1/admin/reviews?${sp}`);
  if (!res.ok) throw new Error("Failed to fetch reviews");
  return res.json() as Promise<ApiResponse>;
}

export function ReviewsTable() {
  const [page, setPage] = useState(1);
  const [rating, setRating] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-reviews", page, rating],
    queryFn: () => fetchReviews({ page, rating }),
  });

  const columns: Column<Review>[] = [
    {
      header: "Customer",
      accessor: (row) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground shrink-0" />
          <div>
            <div className="text-sm font-medium">{row.customer.name}</div>
            <div className="text-xs text-muted-foreground">{row.customer.email}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Target Entity",
      accessor: (row) => (
        <div className="text-xs space-y-0.5">
          {row.vendor && (
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <Store className="h-3.5 w-3.5 text-primary" />
              <span>{row.vendor.storeName}</span>
            </div>
          )}
          {row.product && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Package className="h-3.5 w-3.5" />
              <span>{row.product.name}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      header: "Rating",
      accessor: (row) => (
        <div className="flex items-center gap-1">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          <span className="font-bold text-sm">{row.rating}.0</span>
        </div>
      ),
    },
    {
      header: "Comment",
      accessor: (row) => (
        <p className="text-xs text-muted-foreground line-clamp-2 max-w-xs">
          {row.comment ?? "No comment provided"}
        </p>
      ),
    },
    {
      header: "Date",
      accessor: (row) => (
        <span className="text-xs text-muted-foreground">
          {format(new Date(row.createdAt), "MMM dd, yyyy")}
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
            value={rating}
            onChange={(e) => {
              setRating(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring"
            id="review-rating-select"
          >
            <option value="">All Ratings</option>
            <option value="5">5 Stars ★★★★★</option>
            <option value="4">4 Stars ★★★★☆</option>
            <option value="3">3 Stars ★★★☆☆</option>
            <option value="2">2 Stars ★★☆☆☆</option>
            <option value="1">1 Star ★☆☆☆☆</option>
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
