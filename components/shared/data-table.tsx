"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// ============================================================
// Types
// ============================================================

export interface Column<T> {
  key?: string;
  header: string;
  accessor?: (row: T) => React.ReactNode;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

export interface PaginationConfig {
  page: number;
  totalPages: number;
  total?: number;
  onPageChange: (page: number) => void;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  isError?: boolean;
  emptyMessage?: string;
  keyExtractor?: (row: T) => string;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  pagination?: PaginationConfig;
}

// ============================================================
// Skeleton row
// ============================================================

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="border-b border-border">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded bg-muted animate-pulse w-3/4" />
        </td>
      ))}
    </tr>
  );
}

// ============================================================
// DataTable
// ============================================================

export function DataTable<T>({
  columns,
  data,
  isLoading,
  isError,
  emptyMessage = "No data found.",
  keyExtractor,
  page: pageProp,
  totalPages: totalPagesProp,
  onPageChange: onPageChangeProp,
  pagination,
}: DataTableProps<T>) {
  const currentPage = pagination?.page ?? pageProp ?? 1;
  const currentTotalPages = pagination?.totalPages ?? totalPagesProp ?? 1;
  const handlePageChange = pagination?.onPageChange ?? onPageChangeProp;

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {columns.map((col, idx) => (
                <th
                  key={col.key ?? col.header ?? String(idx)}
                  className={`px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap ${col.className ?? ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={columns.length} />)
            ) : isError ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-red-500 font-medium"
                >
                  Error loading data. Please try again.
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => {
                const rowKey = keyExtractor
                  ? keyExtractor(row)
                  : ((row as { id?: string }).id ?? String(rowIdx));

                return (
                  <tr
                    key={rowKey}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    {columns.map((col, colIdx) => {
                      const cellRenderer = col.accessor ?? col.render;
                      const cellContent = cellRenderer
                        ? cellRenderer(row)
                        : col.key
                          ? String((row as Record<string, unknown>)[col.key] ?? "—")
                          : "—";

                      return (
                        <td
                          key={col.key ?? col.header ?? String(colIdx)}
                          className={`px-4 py-3 ${col.className ?? ""}`}
                        >
                          {cellContent}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {currentTotalPages > 1 && handlePageChange && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
          <p className="text-xs text-muted-foreground">
            Page {currentPage} of {currentTotalPages}
            {pagination?.total !== undefined && ` (${pagination.total} total items)`}
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage <= 1}
              onClick={() => handlePageChange(currentPage - 1)}
              className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-input bg-background text-sm hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={currentPage >= currentTotalPages}
              onClick={() => handlePageChange(currentPage + 1)}
              className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-input bg-background text-sm hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
