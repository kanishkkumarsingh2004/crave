/**
 * Server API response helpers
 *
 * Standardized JSON response builders for all API route handlers.
 * Every response follows the ApiResponse envelope from @delivery/types.
 *
 * Usage:
 *   return apiSuccess({ id: "abc", name: "Test" });
 *   return apiError("NOT_FOUND", "Order not found", 404);
 *   return apiPaginatedSuccess(items, meta);
 */

import type { ApiError, ApiSuccess, PaginationMeta } from "@/types";
import { ZodError } from "@/lib/validation";
import { ERROR_CODES } from "@/lib/constants";

// ============================================================
// SUCCESS RESPONSES
// ============================================================

export function apiSuccess<T>(data: T, status = 200, meta?: PaginationMeta): Response {
  const body: ApiSuccess<T> = {
    success: true,
    data,
    ...(meta ? { meta } : {}),
  };
  return Response.json(body, { status });
}

export function apiCreated<T>(data: T): Response {
  return apiSuccess(data, 201);
}

export function apiNoContent(): Response {
  return new Response(null, { status: 204 });
}

// ============================================================
// ERROR RESPONSES
// ============================================================

export function apiError(
  code: string,
  message: string,
  status = 400,
  details?: Record<string, unknown>,
): Response {
  const body: ApiError = {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  };
  return Response.json(body, { status });
}

export function apiNotFound(resource = "Resource"): Response {
  return apiError(ERROR_CODES.NOT_FOUND, `${resource} not found`, 404);
}

export function apiForbidden(message?: string): Response {
  return apiError(
    ERROR_CODES.AUTH_FORBIDDEN,
    message ?? "You do not have permission to perform this action",
    403,
  );
}

export function apiUnauthorized(message?: string): Response {
  return apiError(ERROR_CODES.AUTH_REQUIRED, message ?? "Authentication is required", 401);
}

export function apiBadRequest(message: string): Response {
  return apiError(ERROR_CODES.INVALID_INPUT || "BAD_REQUEST", message, 400);
}

export function apiConflict(message: string): Response {
  return apiError(ERROR_CODES.CONFLICT, message, 409);
}

export function apiInternalError(err?: unknown): Response {
  if (process.env.NODE_ENV === "development" && err) {
    console.error("[API] Internal error:", err);
  }
  return apiError(ERROR_CODES.INTERNAL_ERROR, "An unexpected error occurred", 500);
}

// ============================================================
// ZOD VALIDATION ERROR
// ============================================================

export function apiValidationError(error: ZodError): Response {
  const details: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path.join(".");
    details[field] = issue.message;
  }
  return apiError(ERROR_CODES.VALIDATION_ERROR, "Validation failed", 422, details);
}

// ============================================================
// GENERIC HANDLER WRAPPER
// ============================================================

/**
 * Wraps a route handler with standardized error handling.
 * Catches ZodError and unknown errors, returning proper API responses.
 */
export async function handleRoute(handler: () => Promise<Response>): Promise<Response> {
  try {
    return await handler();
  } catch (err) {
    if (err instanceof ZodError) {
      return apiValidationError(err);
    }
    if (err instanceof Error) {
      // Known business errors re-thrown as Error with a code field
      const e = err as Error & { code?: string; status?: number };
      if (e.code && e.status) {
        return apiError(e.code, e.message, e.status);
      }
    }
    return apiInternalError(err);
  }
}
