/**
 * @delivery/utils
 *
 * Shared utility functions for the delivery platform.
 * Pure functions only — no framework dependencies.
 */

export * from "./h3";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  ORDER_NUMBER_PREFIX,
  ORDER_NUMBER_PAD_LENGTH,
} from "@/lib/constants";
import type { PaginationMeta, PaginationQuery } from "@/types";

// ============================================================
// PAGINATION
// ============================================================

/**
 * Normalizes incoming page/limit query params with safe defaults.
 */
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

/**
 * Builds a PaginationMeta object from page/limit/total.
 */
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

// ============================================================
// STRING UTILS
// ============================================================

/**
 * Normalizes an email: trims and lowercases.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Generates a URL-friendly slug from a string.
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Truncates a string to maxLength, appending ellipsis if needed.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

/**
 * Capitalizes the first letter of a string.
 */
export function capitalize(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

// ============================================================
// ORDER NUMBER
// ============================================================

/**
 * Generates a human-readable order number from a sequential number.
 * e.g. generateOrderNumber(1) => "ORD-000001"
 */
export function generateOrderNumber(sequence: number): string {
  return `${ORDER_NUMBER_PREFIX}-${String(sequence).padStart(ORDER_NUMBER_PAD_LENGTH, "0")}`;
}

/**
 * Generates a random 12-character uppercase alphanumeric string.
 * Consists of characters A-Z and 0-9 (e.g., "7B94X2K91M0P").
 */
export function generateAlphanumeric12Digit(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generates a random 12-digit numeric string (digits 0-9).
 * Used for generating unique NPCI UPI tr transaction reference IDs.
 */
export function generatenumeric12Digit(): string {
  const chars = "0123456789";
  let result = "";
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ============================================================
// CURRENCY / MONETARY
// ============================================================

/**
 * Formats a monetary amount (as Decimal string from Prisma) to a
 * human-readable currency string.
 * e.g. formatCurrency("1234.50", "INR") => "₹1,234.50"
 */
export function formatCurrency(
  amount: string | number,
  currency = "INR",
  locale = "en-IN",
): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Converts paise (smallest INR unit) to rupees string.
 * e.g. 4900 => "49.00"
 */
export function paiseToRupees(paise: number): string {
  return (paise / 100).toFixed(2);
}

/**
 * Converts rupees string to paise.
 * e.g. "49.00" => 4900
 */
export function rupeesToPaise(rupees: string | number): number {
  return Math.round(parseFloat(String(rupees)) * 100);
}

// ============================================================
// DATE UTILS
// ============================================================

/**
 * Returns a Date object for N minutes from now.
 */
export function minutesFromNow(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

/**
 * Returns a Date object for N hours from now.
 */
export function hoursFromNow(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

/**
 * Returns a Date object for N days from now.
 */
export function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

/**
 * Returns true if the given date is in the past.
 */
export function isPast(date: Date): boolean {
  return date < new Date();
}

/**
 * Returns true if the given date is within the last N hours.
 */
export function isWithinHours(date: Date, hours: number): boolean {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  return date >= cutoff;
}

// ============================================================
// ARRAY UTILS
// ============================================================

/**
 * Returns unique values from an array.
 */
export function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

/**
 * Groups an array of objects by a key.
 */
export function groupBy<T, K extends keyof T>(arr: T[], key: K): Record<string, T[]> {
  return arr.reduce(
    (acc, item) => {
      const groupKey = String(item[key]);
      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(item);
      return acc;
    },
    {} as Record<string, T[]>,
  );
}

// ============================================================
// OBJECT UTILS
// ============================================================

/**
 * Strips undefined values from an object (for use in Prisma update payloads).
 */
export function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

/**
 * Deep-picks only the specified keys from an object.
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): Pick<T, K> {
  return Object.fromEntries(keys.filter((k) => k in obj).map((k) => [k, obj[k]])) as Pick<T, K>;
}

// ============================================================
// VALIDATION HELPERS
// ============================================================

/**
 * Checks if a string is a valid CUID (Prisma default ID format).
 */
export function isCuid(value: string): boolean {
  return /^c[a-z0-9]{24}$/.test(value);
}

/**
 * Checks if a string is a valid email.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Checks if a string is a valid Indian phone number.
 */
export function isValidIndianPhone(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone.replace(/[\s+\-()]/g, ""));
}

// ============================================================
// GEOMETRY
// ============================================================

export * from "./geo";

// ============================================================
// IDEMPOTENCY
// ============================================================

/**
 * Generates a deterministic idempotency key from composite parts.
 * e.g. buildIdempotencyKey("order", orderId, "payment") => "order:abc123:payment"
 */
export function buildIdempotencyKey(...parts: string[]): string {
  return parts.join(":");
}

// ============================================================
// DISPATCH ALGORITHM
// ============================================================
export * from "./dispatch";
export * from "./verification";
export * from "./tracking";
export * from "./aStar";

