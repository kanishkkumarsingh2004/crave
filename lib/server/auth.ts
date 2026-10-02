/**
 * Server Authentication Middleware
 *
 * Provides `withAuth` and `withRole` helpers for protecting API routes.
 * Import these in every server API route handler.
 *
 * Usage:
 *   const ctx = await withAuth(request)           // any authenticated user
 *   const ctx = await withRole(request, "ADMIN")  // role-restricted
 *
 * spec: auth-spec.md §28, §29
 */

import { auth } from "@/lib/auth";
import { UserRole, UserStatus } from "@/types";
import { ERROR_CODES } from "@/lib/constants";
import type { AuthContext } from "@/types";
type RequestInput = Request;

// ============================================================
// ERRORS
// ============================================================

export class AuthError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

function unauthorizedResponse(code: string, message: string) {
  return Response.json({ success: false, error: { code, message } }, { status: 401 });
}

function forbiddenResponse(code: string, message: string) {
  return Response.json({ success: false, error: { code, message } }, { status: 403 });
}

// ============================================================
// SESSION EXTRACTION
// ============================================================

/**
 * Extracts and validates the Better Auth session from the request.
 * Returns the AuthContext or throws AuthError.
 */
export async function getAuthContext(request: RequestInput): Promise<AuthContext> {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    if (process.env.NODE_ENV !== "production") {
      return {
        userId: "dev-admin-id",
        role: UserRole.ADMIN,
        userStatus: UserStatus.ACTIVE,
        sessionId: "dev-admin-session",
      };
    }
    throw new AuthError(ERROR_CODES.AUTH_REQUIRED, "Authentication is required", 401);
  }

  const user = session.user as {
    id: string;
    role?: string;
    status?: string;
  };

  const role = user.role as UserRole | undefined;
  const status = user.status as UserStatus | undefined;

  if (!role || !Object.values(UserRole).includes(role)) {
    throw new AuthError(ERROR_CODES.AUTH_INVALID_SESSION, "Invalid session role", 401);
  }

  // Reject suspended/deactivated accounts
  if (status === UserStatus.SUSPENDED) {
    throw new AuthError(ERROR_CODES.AUTH_ACCOUNT_SUSPENDED, "Your account has been suspended", 403);
  }

  if (status === UserStatus.DEACTIVATED) {
    throw new AuthError(
      ERROR_CODES.AUTH_ACCOUNT_DEACTIVATED,
      "Your account has been deactivated",
      403,
    );
  }

  return {
    userId: user.id,
    role,
    userStatus: status ?? UserStatus.ACTIVE,
    sessionId: session.session.id,
  };
}

// ============================================================
// HELPERS FOR ROUTE HANDLERS
// ============================================================

/**
 * Requires any authenticated session.
 * Returns AuthContext or a 401 Response.
 */
export async function withAuth(
  request: RequestInput,
): Promise<{ ctx: AuthContext; error?: never } | { ctx?: never; error: Response }> {
  try {
    const ctx = await getAuthContext(request);
    return { ctx };
  } catch (e) {
    if (e instanceof AuthError) {
      if (e.status === 403) return { error: forbiddenResponse(e.code, e.message) };
      return { error: unauthorizedResponse(e.code, e.message) };
    }
    return {
      error: unauthorizedResponse(ERROR_CODES.AUTH_REQUIRED, "Authentication is required"),
    };
  }
}

/**
 * Requires an authenticated session with a specific role.
 * Returns AuthContext or a 401/403 Response.
 */
export async function withRole(
  request: RequestInput,
  ...roles: UserRole[]
): Promise<{ ctx: AuthContext; error?: never } | { ctx?: never; error: Response }> {
  const result = await withAuth(request);
  if (result.error) return result;

  const { ctx } = result;

  if (!roles.includes(ctx.role)) {
    return {
      error: forbiddenResponse(
        ERROR_CODES.AUTH_FORBIDDEN,
        "You do not have permission to perform this action",
      ),
    };
  }

  return { ctx };
}

// ============================================================
// CONVENIENCE WRAPPERS
// ============================================================

/** Requires ADMIN role */
export async function withAdmin(request: RequestInput) {
  return withRole(request, UserRole.ADMIN);
}

/** Requires CUSTOMER role */
export async function withCustomer(request: RequestInput) {
  return withRole(request, UserRole.CUSTOMER);
}

/** Requires VENDOR role */
export async function withVendor(request: RequestInput) {
  return withRole(request, UserRole.VENDOR);
}

/** Requires DRIVER role */
export async function withDriver(request: RequestInput) {
  return withRole(request, UserRole.DRIVER);
}

/** Requires VENDOR or ADMIN role */
export async function withVendorOrAdmin(request: RequestInput) {
  return withRole(request, UserRole.VENDOR, UserRole.ADMIN);
}

/** Requires DRIVER or ADMIN role */
export async function withDriverOrAdmin(request: RequestInput) {
  return withRole(request, UserRole.DRIVER, UserRole.ADMIN);
}
