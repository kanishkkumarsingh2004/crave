/**
 * Audit Service
 *
 * Provides a single `createAuditLog` function used by all API routes
 * to record sensitive administrative actions. Fire-and-forget — never
 * throws so that a logging failure cannot break the primary operation.
 *
 * spec: Task 3.8 — Audit Log System
 */

import { prisma } from "@delivery/database";
import { AuditAction, UserRole } from "@delivery/database";

export interface AuditLogInput {
  actorId: string;
  actorRole: UserRole;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  reason?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

/**
 * Creates an audit log entry. Never throws — errors are swallowed
 * so that audit failures do not break the parent operation.
 */
export async function createAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        actorRole: input.actorRole,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        before: input.before as never,
        after: input.after as never,
        reason: input.reason,
        metadata: input.metadata as never,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        requestId: input.requestId,
      },
    });
  } catch (err) {
    // Never propagate — log silently
    if (process.env.NODE_ENV === "development") {
      console.error("[AuditLog] Failed to write audit log:", err);
    }
  }
}

/**
 * Helper to extract client IP from a request.
 */
export function getClientIp(request: Request): string | undefined {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    undefined
  );
}
