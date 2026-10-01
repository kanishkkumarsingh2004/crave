/**
 * GET   /api/v1/admin/vendors/[id]         — Get vendor detail
 * PATCH /api/v1/admin/vendors/[id]/status  — Approve/Reject/Suspend vendor
 *
 * Requires: ADMIN role
 * spec: api-spec.md Admin Vendor Management
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
import { VendorStatus } from "@delivery/database";
import { zUpdateVendorStatus } from "@delivery/validation";
import { ZodError } from "zod";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { error } = await withAdmin(request);
  if (error) return error;

  try {
    const { id } = await params;

    const [vendor, orderRevenue] = await Promise.all([
      prisma.vendor.findUnique({
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
            select: {
              products: true,
              orders: true,
              reviews: true,
            },
          },
        },
      }),
      prisma.order.aggregate({
        where: {
          vendorId: id,
          OR: [{ paymentStatus: "PAID" }, { status: "DELIVERED" }],
        },
        _sum: {
          subtotal: true,
          total: true,
        },
      }),
    ]);

    if (!vendor) return apiNotFound("Vendor");

    const grossSales = Number(orderRevenue._sum.subtotal ?? 0);
    const netEarnings = Math.round(grossSales * 0.85 * 100) / 100;

    return apiSuccess({
      ...vendor,
      grossSales,
      netEarnings,
      totalRevenue: netEarnings,
    });
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
    const input = zUpdateVendorStatus.parse(body);

    const vendor = await prisma.vendor.findUnique({
      where: { id },
      select: { id: true, status: true, userId: true },
    });
    if (!vendor) return apiNotFound("Vendor");

    // Set timestamps based on status transition
    const now = new Date();
    const statusData: Record<string, unknown> = { status: input.status };

    if (input.status === VendorStatus.APPROVED) {
      statusData.approvedAt = now;
      statusData.rejectedAt = null;
      statusData.rejectionReason = null;
    } else if (input.status === VendorStatus.REJECTED) {
      statusData.rejectedAt = now;
      statusData.rejectionReason = input.reason ?? null;
    } else if (input.status === VendorStatus.SUSPENDED) {
      statusData.suspendedAt = now;
    }

    const updated = await prisma.vendor.update({
      where: { id },
      data: statusData,
      select: {
        id: true,
        storeName: true,
        status: true,
        approvedAt: true,
        rejectedAt: true,
        rejectionReason: true,
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
