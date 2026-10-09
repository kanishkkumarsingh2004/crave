import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, type JWTPayload } from '@/lib/jwt'
import { cookies } from 'next/headers'
import { getTestUser, isTestRequest, MOCK_TEST_USER, MOCK_TEST_ADMIN } from '@/lib/test-auth'

export type UserRole = JWTPayload['role']

/**
 * Get authenticated actor from request
 * Supports both production JWT and test mode via headers
 */
export async function getApiActor(request: Request): Promise<JWTPayload | null> {
  // Check for test mode first (uses headers, no JWT required)
  if (isTestRequest(request)) {
    // SECURITY: Test auth headers must NEVER work in production
    if (process.env.NODE_ENV === 'production' && !process.env.CI) {
      throw new Error('Test authentication headers are not allowed in production')
    }
    const testUser = getTestUser(request)
    return testUser || MOCK_TEST_USER
  }

  // Production JWT authentication
  const authHeader = request.headers.get('authorization')
  let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) {
    try {
      const cookieStore = await cookies()
      token =
        cookieStore.get('crave_auth_token')?.value ||
        cookieStore.get('crave_token')?.value ||
        cookieStore.get('drop_auth_token')?.value ||
        ''
    } catch {}
  }
  return token ? verifyToken(token) : null
}

/**
 * Require admin role - throws 403 if not admin
 */
export async function requireAdmin(request: Request): Promise<JWTPayload> {
  const actor = await getApiActor(request)
  if (!actor || actor.role !== 'admin') {
    throw new Error('Admin access required')
  }
  return actor
}

/**
 * Require authentication - throws 401 if not authenticated
 */
export async function requireAuthApi(request: Request): Promise<JWTPayload> {
  const actor = await getApiActor(request)
  if (!actor) {
    throw new Error('Authentication required')
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
    throw new Error('Insufficient permissions')
  }
  return actor
}

/**
 * Wrapper for API routes with standardized auth handling
 */
export function withAuthApi<T extends any[]>(
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
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}
