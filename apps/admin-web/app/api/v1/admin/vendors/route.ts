/**
 * GET   /api/v1/admin/vendors          — List vendors (paginated)
 *
 * Requires: ADMIN role
 * spec: api-spec.md Admin Vendor Management
 */

import type { NextRequest } from "next/server";
import { withAdmin } from "@/../../server/middleware/auth";
import {
  apiSuccess,
  apiInternalError,
  apiValidationError,
} from "@/../../server/infrastructure/response";
import { prisma } from "@delivery/database";
import { normalizePagination, buildPaginationMeta } from "@delivery/utils";
import { zVendorListQuery } from "@delivery/validation";
import { ZodError } from "zod";
import type { Prisma } from "@delivery/database";

export async function GET(request: NextRequest) {
  const { error } = await withAdmin(request);
  if (error) return error;

  try {
    const raw = Object.fromEntries(request.nextUrl.searchParams);
    const query = zVendorListQuery.parse(raw);
    const { page, limit, skip } = normalizePagination(query);

    const where: Prisma.VendorWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { storeName: { contains: query.search, mode: "insensitive" } },
        { email: { contains: query.search, mode: "insensitive" } },
        { city: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          storeName: true,
          description: true,
          logoUrl: true,
          phone: true,
          email: true,
          city: true,
          state: true,
          status: true,
          isOpen: true,
          approvedAt: true,
          createdAt: true,
          user: {
            select: { id: true, name: true, email: true, status: true },
          },
          _count: {
            select: { products: true, orders: true },
          },
        },
      }),
      prisma.vendor.count({ where }),
    ]);

    const vendorIds = vendors.map((v) => v.id);

    const revenueByVendor = await prisma.order.groupBy({
      by: ["vendorId"],
      where: {
        vendorId: { in: vendorIds },
        OR: [{ paymentStatus: "PAID" }, { status: "DELIVERED" }],
      },
      _sum: { subtotal: true },
    });

    const revenueMap = new Map<string, number>();
    for (const r of revenueByVendor) {
      const gross = Number(r._sum.subtotal ?? 0);
      revenueMap.set(r.vendorId, Math.round(gross * 0.85 * 100) / 100);
    }

    const vendorsWithRevenue = vendors.map((v) => ({
      ...v,
      revenue: revenueMap.get(v.id) ?? 0,
    }));

    return apiSuccess(vendorsWithRevenue, 200, buildPaginationMeta(page, limit, total));
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    return apiInternalError(err);
  }
}
