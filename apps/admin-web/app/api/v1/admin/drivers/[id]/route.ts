/**
 * GET   /api/v1/admin/drivers/[id]     — Get driver detail
 * PATCH /api/v1/admin/drivers/[id]     — Update driver status (approve/reject/suspend)
 *
 * Requires: ADMIN role
 * spec: api-spec.md Admin Driver Management
 */

import type { NextRequest } from "next/server";
import { withAdmin } from "@/../../../../server/middleware/auth";
import {
  apiSuccess,
  apiNotFound,
  apiInternalError,
  apiValidationError,
} from "@/../../../../server/infrastructure/response";
import { prisma } from "@delivery/database";
import { DriverStatus } from "@delivery/database";
import { zUpdateDriverStatus } from "@delivery/validation";
import { ZodError } from "zod";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { error } = await withAdmin(request);
  if (error) return error;

  try {
    const { id } = await params;

    const driver = await prisma.driver.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            createdAt: true,
          },
        },
        documents: true,
        _count: {
          select: { deliveries: true, assignments: true },
        },
      },
    });

    if (!driver) return apiNotFound("Driver");
    return apiSuccess(driver);
  } catch (err) {
    return apiInternalError(err);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { error } = await withAdmin(request);
  if (error) return error;

  try {
    const { id } = await params;
    const body = (await request.json()) as unknown;
    const input = zUpdateDriverStatus.parse(body);

    const driver = await prisma.driver.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!driver) return apiNotFound("Driver");

    const now = new Date();
    const statusData: Record<string, unknown> = { status: input.status };

    if (input.status === DriverStatus.APPROVED) {
      statusData.approvedAt = now;
      statusData.rejectedAt = null;
      statusData.rejectionReason = null;
    } else if (input.status === DriverStatus.SUSPENDED) {
      statusData.suspendedAt = now;
    }
    // DEACTIVATED stays as-is

    const updated = await prisma.driver.update({
      where: { id },
      data: statusData,
      select: {
        id: true,
        status: true,
        availability: true,
        approvedAt: true,
        suspendedAt: true,
        updatedAt: true,
      },
    });

    return apiSuccess(updated);
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    return apiInternalError(err);
  }
}
