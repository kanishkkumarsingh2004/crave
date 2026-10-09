import { NextResponse } from 'next/server'
import { verifyToken, type JWTPayload } from '@/lib/jwt'
import { cookies } from 'next/headers'
import { getTestUser, isTestRequest, MOCK_TEST_USER } from '@/lib/test-auth'

// ─── Centralized Authorization Helpers ─────────────────────────────

export type UserRole = JWTPayload['role']

export interface AuthContext {
  user: JWTPayload | null
  isAuthenticated: boolean
}

/**
 * Get authenticated actor from request
 * Supports both production JWT and test mode via headers
 */
export async function getAuthActor(request: Request): Promise<JWTPayload | null> {
  // Check for test mode first (only allowed outside production)
  if (process.env.NODE_ENV !== 'production' && isTestRequest(request)) {
    return getTestUser(request) || MOCK_TEST_USER
  }

  // Production JWT authentication
  const authHeader = request.headers.get('authorization')
  let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) {
    try {
      const cookieStore = await cookies()
      token =
        cookieStore.get('crave_auth_token')?.value || cookieStore.get('crave_token')?.value || ''
    } catch {}
  }
  return token ? verifyToken(token) : null
}

/**
 * Require authentication - throws 401 if not authenticated
 */
export async function requireAuth(request: Request): Promise<JWTPayload> {
  const actor = await getAuthActor(request)
  if (!actor) {
    throw new AuthError('Authentication required', 401)
  }
  return actor
}

/**
 * Require specific role(s) - throws 403 if role doesn't match
 */
export async function requireRole(
  request: Request,
  allowedRoles: UserRole | UserRole[]
): Promise<JWTPayload> {
  const actor = await requireAuth(request)
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
  if (!roles.includes(actor.role)) {
    throw new AuthError('Insufficient permissions', 403)
  }
  return actor
}

/**
 * Require ownership - throws 403 if user doesn't own the resource
 */
export async function requireOwnership(
  request: Request,
  resourceOwnerId: string,
  options?: { allowAdmin?: boolean; allowRole?: UserRole[] }
): Promise<JWTPayload> {
  const actor = await requireAuth(request)

  if (options?.allowAdmin && actor.role === 'admin') {
    return actor
  }

  if (options?.allowRole?.includes(actor.role)) {
    return actor
  }

  if (actor.id !== resourceOwnerId) {
    throw new AuthError('Forbidden: You do not own this resource', 403)
  }

  return actor
}

/**
 * Require vendor ownership of restaurant
 */
export async function requireVendorOwnership(
  request: Request,
  restaurantId: string,
  getRestaurant: (id: string) => Promise<{ owner_id: string | null } | null>
): Promise<JWTPayload> {
  const actor = await requireAuth(request)

  if (actor.role === 'admin') return actor

  const restaurant = await getRestaurant(restaurantId)
  if (!restaurant) {
    throw new AuthError('Restaurant not found', 404)
  }

  if (restaurant.owner_id !== actor.id) {
    throw new AuthError('Forbidden: You do not own this restaurant', 403)
  }

  return actor
}

/**
 * AuthError for consistent error handling
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 401
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

/**
 * Handle auth errors in API routes
 */
export function handleAuthError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode })
  }
  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

/**
 * Role-based access control matrix
 */
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  user: ['orders:create', 'orders:read:own', 'profile:read', 'profile:update'],
  restaurant_vendor: [
    'orders:read:vendor',
    'orders:update:vendor',
    'restaurant:read:own',
    'restaurant:update:own',
    'menu:manage',
  ],
  cravexp_store_vendor: [
    'orders:read:vendor',
    'orders:update:vendor',
    'restaurant:read:own',
    'restaurant:update:own',
    'menu:manage',
  ],
  rider: ['orders:read:assigned', 'orders:update:driver', 'location:publish'],
  admin: ['*'], // All permissions
}

/**
 * Check if actor has permission
 */
export function hasPermission(actor: JWTPayload, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[actor.role] || []
  return permissions.includes('*') || permissions.includes(permission)
}

/**
 * Require permission - throws 403 if not authorized
 */
export async function requirePermission(request: Request, permission: string): Promise<JWTPayload> {
  const actor = await requireAuth(request)
  if (!hasPermission(actor, permission)) {
    throw new AuthError(`Permission denied: ${permission}`, 403)
  }
  return actor
}

/**
 * API route wrapper with standardized auth handling
 */
export function withAuth<T extends any[]>(
  handler: (actor: JWTPayload, ...args: T) => Promise<NextResponse>,
  options?: { roles?: UserRole[]; permission?: string }
) {
  return async (request: Request, ...args: T): Promise<NextResponse> => {
    try {
      let actor: JWTPayload

      if (options?.permission) {
        actor = await requirePermission(request, options.permission)
      } else if (options?.roles) {
        actor = await requireRole(request, options.roles)
      } else {
        actor = await requireAuth(request)
      }

      return await handler(actor, ...args)
    } catch (error) {
      return handleAuthError(error)
    }
  }
}
