/**
 * BlinkBite Admin Console - Constants
 *
 * Central configuration and constants for the admin platform.
 */

// ============================================================
// API & NETWORK
// ============================================================

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
export const API_VERSION = "v1";
export const API_PREFIX = `/api/${API_VERSION}`;

// ============================================================
// AUTH & SESSIONS
// ============================================================

export const AUTH_BASE_PATH = "/api/v1/auth";
export const SESSION_COOKIE_NAME = "blinkbite_session";
export const WEB_SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 days

// ============================================================
// PAGINATION
// ============================================================

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// ============================================================
// SYSTEM IDENTIFIERS
// ============================================================

export const ORDER_NUMBER_PREFIX = "ORD";
export const ORDER_NUMBER_PAD_LENGTH = 6;
export const DEFAULT_CURRENCY = "INR";

// ============================================================
// CATALOG & CONTENT LIMITS
// ============================================================

export const MAX_PRODUCT_IMAGES = 5;
export const MAX_SKU_LENGTH = 64;
export const MIN_RATING = 1;
export const MAX_RATING = 5;
export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

// ============================================================
// ERROR CODES
// ============================================================

export const ERROR_CODES = {
  // Auth
  AUTH_REQUIRED: "AUTH_REQUIRED",
  AUTH_INVALID_SESSION: "AUTH_INVALID_SESSION",
  AUTH_SESSION_EXPIRED: "AUTH_SESSION_EXPIRED",
  AUTH_FORBIDDEN: "AUTH_FORBIDDEN",
  AUTH_INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
  AUTH_ACCOUNT_SUSPENDED: "AUTH_ACCOUNT_SUSPENDED",
  AUTH_ACCOUNT_DEACTIVATED: "AUTH_ACCOUNT_DEACTIVATED",

  // Validation
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",

  // Resources
  NOT_FOUND: "NOT_FOUND",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  CONFLICT: "CONFLICT",

  // Business Rules
  VENDOR_NOT_APPROVED: "VENDOR_NOT_APPROVED",
  DRIVER_NOT_AVAILABLE: "DRIVER_NOT_AVAILABLE",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  REFUND_NOT_ELIGIBLE: "REFUND_NOT_ELIGIBLE",

  // Server
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// ============================================================
// PLATFORM SETTINGS
// ============================================================

export const PLATFORM_SETTING_KEYS = {
  DELIVERY_FEE: "delivery_fee",
  TAX_RATE: "tax_rate",
  FREE_DELIVERY_THRESHOLD: "free_delivery_threshold",
  ORDER_CANCEL_WINDOW_MINUTES: "order_cancel_window_minutes",
  DRIVER_SEARCH_RADIUS_KM: "driver_search_radius_km",
  REVIEW_WINDOW_HOURS: "review_window_hours",
} as const;

export type PlatformSettingKey = (typeof PLATFORM_SETTING_KEYS)[keyof typeof PLATFORM_SETTING_KEYS];
