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
          products: {
            where: { isArchived: false },
            include: {
              category: { select: { id: true, name: true, slug: true } },
              inventory: { select: { onHand: true, reserved: true, lowStockThreshold: true } },
            },
            orderBy: { createdAt: "desc" },
          },
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
    const body = (await request.json().catch(() => ({}))) as Record<string, any>;

    const vendor = await prisma.vendor.findUnique({
      where: { id },
      select: { id: true, status: true, userId: true },
    });
    if (!vendor) return apiNotFound("Vendor");

    const updateData: Record<string, any> = {};
    const now = new Date();

    // 1. Status update if provided
    if (body.status) {
      updateData.status = body.status;
      if (body.status === "APPROVED" || body.status === "ACTIVE") {
        updateData.approvedAt = now;
        updateData.rejectedAt = null;
        updateData.rejectionReason = null;
      } else if (body.status === "REJECTED") {
        updateData.rejectedAt = now;
        updateData.rejectionReason = body.reason ?? null;
      } else if (body.status === "SUSPENDED") {
        updateData.suspendedAt = now;
      }
    }

    // 2. Open / Closed operational toggle
    if (body.isOpen !== undefined) {
      updateData.isOpen = Boolean(body.isOpen);
    }

    // 3. Profile details
    if (body.storeName !== undefined) updateData.storeName = String(body.storeName).trim();
    if (body.description !== undefined) {
      updateData.description = body.description ? String(body.description).trim() : null;
    }
    if (body.phone !== undefined) updateData.phone = body.phone ? String(body.phone).trim() : null;
    if (body.email !== undefined) updateData.email = body.email ? String(body.email).trim().toLowerCase() : null;
    if (body.logoUrl !== undefined) updateData.logoUrl = body.logoUrl ? String(body.logoUrl).trim() : null;
    if (body.bannerUrl !== undefined) updateData.bannerUrl = body.bannerUrl ? String(body.bannerUrl).trim() : null;

    // 4. Location coordinates & address
    if (body.address !== undefined) updateData.address = body.address ? String(body.address).trim() : null;
    if (body.city !== undefined) updateData.city = body.city ? String(body.city).trim() : null;
    if (body.state !== undefined) updateData.state = body.state ? String(body.state).trim() : null;
    if (body.postalCode !== undefined) updateData.postalCode = body.postalCode ? String(body.postalCode).trim() : null;
    if (body.latitude !== undefined && body.latitude !== null && !isNaN(Number(body.latitude))) {
      updateData.latitude = Number(body.latitude);
    }
    if (body.longitude !== undefined && body.longitude !== null && !isNaN(Number(body.longitude))) {
      updateData.longitude = Number(body.longitude);
    }

    // 5. Commission & Pricing Lock
    if (body.commissionType !== undefined) {
      updateData.commissionType = body.commissionType === "MARKUP" ? "MARKUP" : "COMMISSION";
    }
    if (body.commissionRate !== undefined && !isNaN(Number(body.commissionRate))) {
      updateData.commissionRate = Number(body.commissionRate);
    }
    if (body.isPricingLocked !== undefined) {
      updateData.isPricingLocked = Boolean(body.isPricingLocked);
    }

    const updated = await prisma.vendor.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, status: true } },
      },
    });

    return apiSuccess(updated);
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    return apiInternalError(err);
  }
}
