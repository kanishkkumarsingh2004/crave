/**
 * @delivery/constants
 *
 * Platform-wide constants for the delivery platform.
 * Import from here for all magic values — never hardcode them.
 */

declare const process: { env: Record<string, string | undefined> };

// ============================================================
// API
// ============================================================

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
export const API_VERSION = "v1";
export const API_PREFIX = `/api/${API_VERSION}`;

// ============================================================
// AUTH
// ============================================================

/** Better Auth base path used across all apps */
export const AUTH_BASE_PATH = "/api/auth";

/** Session cookie name (set by Better Auth) */
export const SESSION_COOKIE_NAME = "better-auth.session_token";

/** How long a web session lasts (7 days in seconds) */
export const WEB_SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

/** How long a mobile session lasts (30 days in seconds) */
export const MOBILE_SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;

// ============================================================
// PAGINATION
// ============================================================

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// ============================================================
// ORDER
// ============================================================

/** Prefix for human-readable order numbers */
export const ORDER_NUMBER_PREFIX = "ORD";

/** Order number sequence padding (e.g. ORD-000001) */
export const ORDER_NUMBER_PAD_LENGTH = 6;

/** Minutes within which a customer can cancel an order after placement */
export const ORDER_CANCEL_WINDOW_MINUTES = 5;

// ============================================================
// DELIVERY
// ============================================================

/** Radius in km used to search for nearby available drivers */
export const DRIVER_SEARCH_RADIUS_KM = 10;

/** How long (seconds) a driver has to respond to an assignment offer */
export const DRIVER_ASSIGNMENT_EXPIRY_SECONDS = 60;

/** Max retries when auto-assigning a driver to a delivery */
export const MAX_DRIVER_ASSIGNMENT_RETRIES = 3;

// ============================================================
// PAYMENT
// ============================================================

/** Platform currency */
export const DEFAULT_CURRENCY = "INR";

/** Tax rate (as a decimal fraction, e.g. 0.18 = 18%) */
export const DEFAULT_TAX_RATE = 0.18;

/** Minimum order subtotal before delivery fee (in paise for Razorpay or smallest unit) */
export const FREE_DELIVERY_THRESHOLD_PAISE = 50000; // ₹500

/** Flat delivery fee in paise */
export const FLAT_DELIVERY_FEE_PAISE = 4900; // ₹49

// ============================================================
// PRODUCT
// ============================================================

/** Maximum number of images per product */
export const MAX_PRODUCT_IMAGES = 5;

/** Maximum SKU length */
export const MAX_SKU_LENGTH = 64;

// ============================================================
// REVIEW
// ============================================================

/** Minimum allowed review rating */
export const MIN_RATING = 1;

/** Maximum allowed review rating */
export const MAX_RATING = 5;

/** Hours after delivery within which a customer can submit a review */
export const REVIEW_WINDOW_HOURS = 72;

// ============================================================
// CART
// ============================================================

/** Maximum quantity of a single product in a cart */
export const MAX_CART_ITEM_QUANTITY = 20;

/** Maximum total items in a cart */
export const MAX_CART_ITEMS = 30;

// ============================================================
// FILE UPLOAD
// ============================================================

/** Maximum size for product/vendor/driver document uploads (10 MB) */
export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

/** Allowed MIME types for image uploads */
export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Allowed MIME types for document uploads */
export const ALLOWED_DOCUMENT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

// ============================================================
// NOTIFICATIONS
// ============================================================

export const NOTIFICATION_TYPES = {
  ORDER_PLACED: "ORDER_PLACED",
  ORDER_CONFIRMED: "ORDER_CONFIRMED",
  ORDER_PREPARING: "ORDER_PREPARING",
  ORDER_READY: "ORDER_READY",
  ORDER_PICKED_UP: "ORDER_PICKED_UP",
  ORDER_OUT_FOR_DELIVERY: "ORDER_OUT_FOR_DELIVERY",
  ORDER_DELIVERED: "ORDER_DELIVERED",
  ORDER_CANCELLED: "ORDER_CANCELLED",
  PAYMENT_SUCCESS: "PAYMENT_SUCCESS",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  REFUND_INITIATED: "REFUND_INITIATED",
  REFUND_COMPLETED: "REFUND_COMPLETED",
  DRIVER_ASSIGNED: "DRIVER_ASSIGNED",
  DRIVER_ARRIVED: "DRIVER_ARRIVED",
  VENDOR_APPROVED: "VENDOR_APPROVED",
  VENDOR_REJECTED: "VENDOR_REJECTED",
  DRIVER_APPROVED: "DRIVER_APPROVED",
  DRIVER_REJECTED: "DRIVER_REJECTED",
  NEW_ORDER_FOR_VENDOR: "NEW_ORDER_FOR_VENDOR",
  DELIVERY_ASSIGNMENT_OFFER: "DELIVERY_ASSIGNMENT_OFFER",
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

// ============================================================
// ERROR CODES (matching API spec)
// ============================================================

export const ERROR_CODES = {
  // Auth
  AUTH_REQUIRED: "AUTH_REQUIRED",
  AUTH_INVALID_SESSION: "AUTH_INVALID_SESSION",
  AUTH_SESSION_EXPIRED: "AUTH_SESSION_EXPIRED",
  AUTH_FORBIDDEN: "AUTH_FORBIDDEN",
  AUTH_INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
  AUTH_EMAIL_NOT_VERIFIED: "AUTH_EMAIL_NOT_VERIFIED",
  AUTH_ACCOUNT_SUSPENDED: "AUTH_ACCOUNT_SUSPENDED",
  AUTH_ACCOUNT_DEACTIVATED: "AUTH_ACCOUNT_DEACTIVATED",

  // Validation
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",

  // Resources
  NOT_FOUND: "NOT_FOUND",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  CONFLICT: "CONFLICT",

  // Business rules
  INSUFFICIENT_STOCK: "INSUFFICIENT_STOCK",
  CART_VENDOR_CONFLICT: "CART_VENDOR_CONFLICT",
  ORDER_CANCEL_WINDOW_EXPIRED: "ORDER_CANCEL_WINDOW_EXPIRED",
  VENDOR_NOT_APPROVED: "VENDOR_NOT_APPROVED",
  DRIVER_NOT_AVAILABLE: "DRIVER_NOT_AVAILABLE",
  REVIEW_WINDOW_EXPIRED: "REVIEW_WINDOW_EXPIRED",
  REVIEW_ALREADY_EXISTS: "REVIEW_ALREADY_EXISTS",

  // Payment
  PAYMENT_FAILED: "PAYMENT_FAILED",
  PAYMENT_ALREADY_PROCESSED: "PAYMENT_ALREADY_PROCESSED",
  REFUND_NOT_ELIGIBLE: "REFUND_NOT_ELIGIBLE",

  // Server
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// ============================================================
// PLATFORM SETTING KEYS
// ============================================================

export const PLATFORM_SETTING_KEYS = {
  DELIVERY_FEE: "delivery_fee",
  TAX_RATE: "tax_rate",
  FREE_DELIVERY_THRESHOLD: "free_delivery_threshold",
  ORDER_CANCEL_WINDOW_MINUTES: "order_cancel_window_minutes",
  DRIVER_SEARCH_RADIUS_KM: "driver_search_radius_km",
  DRIVER_ASSIGNMENT_EXPIRY_SECONDS: "driver_assignment_expiry_seconds",
  MAX_DRIVER_ASSIGNMENT_RETRIES: "max_driver_assignment_retries",
  REVIEW_WINDOW_HOURS: "review_window_hours",
} as const;

export type PlatformSettingKey = (typeof PLATFORM_SETTING_KEYS)[keyof typeof PLATFORM_SETTING_KEYS];
