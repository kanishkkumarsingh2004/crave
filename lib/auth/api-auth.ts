import { AuthError, getAuthActor, requireAuth, type UserRole } from '@/lib/auth/auth-helpers'
import type { JWTPayload } from '@/lib/jwt'
import { NextResponse } from 'next/server'

export type { UserRole }
export { AuthError as AuthApiError }
export const getApiActor = getAuthActor
export const requireAuthApi = requireAuth

/**
 * Require admin role - throws 403 if not admin, 401 if not authenticated
 */
export async function requireAdmin(request: Request): Promise<JWTPayload> {
  const actor = await getApiActor(request)
  if (!actor) {
    throw new AuthError('Authentication required', 401)
  }
  if (actor.role !== 'admin') {
    throw new AuthError('Admin access required', 403)
  }
  return actor
}

/**
 * Require specific role(s) - throws 403 if role doesn't match
 */
export async function requireRoleApi(
  request: Request,
  allowedRoles: string | string[]
): Promise<JWTPayload> {
  const actor = await requireAuthApi(request)
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
  if (!roles.includes(actor.role)) {
    throw new AuthError('Insufficient permissions', 403)
  }
  return actor
}

/**
 * Handle API auth error consistently across API handlers
 */
export function handleApiAuthError(error: any): NextResponse | null {
  if (error instanceof AuthError || error?.name === 'AuthError' || error?.statusCode) {
    return NextResponse.json(
      { error: error.message || 'Unauthorized' },
      { status: error.statusCode || 401 }
    )
  }
  if (error?.message === 'Authentication required') {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  if (error?.message === 'Admin access required') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }
  if (error?.message === 'Insufficient permissions') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }
  return null
}

/**
 * Wrapper for API routes with standardized auth handling
 */
export function withAuthApi(
  handler: (actor: JWTPayload, ...args: unknown[]) => Promise<NextResponse>,
  options?: { roles?: string | string[]; requireAdmin?: boolean }
) {
  return async (request: Request, ...args: unknown[]): Promise<NextResponse> => {
    try {
      let actor: JWTPayload | null = null

      if (options?.requireAdmin) {
        actor = await getApiActor(request)
        if (!actor || actor.role !== 'admin') {
          return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }
      } else if (options?.roles) {
        actor = await getApiActor(request)
        if (!actor) {
          return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }
        const roles = Array.isArray(options.roles) ? options.roles : [options.roles]
        if (!roles.includes(actor.role)) {
          return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
        }
      } else {
        actor = await getApiActor(request)
        if (!actor) {
          return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }
      }

      // At this point, actor is guaranteed to be non-null
      const resolvedActor = actor as JWTPayload

      return await handler(resolvedActor, ...args)
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Authentication required') {
          return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }
        if (
          error.message === 'Admin access required' ||
          error.message === 'Insufficient permissions'
        ) {
          return NextResponse.json({ error: error.message }, { status: 403 })
        }
        console.error('[auth] Unexpected API authorization wrapper error:', error)
        return NextResponse.json(
          {
            error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
          },
          { status: 500 }
        )
      }
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}
