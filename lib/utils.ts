import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from "@/lib/constants";
import type { PaginationMeta, PaginationQuery } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizePagination(query: PaginationQuery): {
  page: number;
  limit: number;
  skip: number;
} {
  const page = Math.max(1, Number(query.page) || DEFAULT_PAGE);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(query.limit) || DEFAULT_PAGE_SIZE));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + "…";
}
