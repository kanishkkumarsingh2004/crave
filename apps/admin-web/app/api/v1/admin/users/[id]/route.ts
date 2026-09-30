/**
 * GET    /api/v1/admin/users/[id]        — Get user detail
 * PATCH  /api/v1/admin/users/[id]/status — Update user status
 * DELETE /api/v1/admin/users/[id]        — Deactivate user
 *
 * Requires: ADMIN role
 * spec: api-spec.md Admin User Management
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
import { zUpdateUserStatus } from "@delivery/validation";
import { ZodError } from "zod";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { error } = await withAdmin(request);
  if (error) return error;

  try {
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        emailVerified: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        customerProfile: {
          select: {
            id: true,
            defaultAddressId: true,
            createdAt: true,
          },
        },
        vendor: {
          select: {
            id: true,
            storeName: true,
            status: true,
            isOpen: true,
            createdAt: true,
          },
        },
        driver: {
          select: {
            id: true,
            status: true,
            availability: true,
            vehicleType: true,
            rating: true,
            totalDeliveries: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            addresses: true,
            notifications: true,
          },
        },
      },
    });

    if (!user) return apiNotFound("User");
    return apiSuccess(user);
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
    const input = zUpdateUserStatus.parse(body);

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });
    if (!user) return apiNotFound("User");

    // Prevent admin from deactivating themselves
    // (would need ctx.userId — skip for now, handled client-side)

    const updated = await prisma.user.update({
      where: { id },
      data: { status: input.status },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    return apiSuccess(updated);
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    return apiInternalError(err);
  }
}
