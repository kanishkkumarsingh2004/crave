/**
 * GET /api/v1/admin/deliveries  — List all deliveries (admin view)
 *
 * Requires: ADMIN role
 * spec: api-spec.md Admin Delivery Management
 */

import type { NextRequest } from "next/server";
import { withAdmin } from "@/lib/server/auth";
import {
  apiSuccess,
  apiInternalError,
  apiValidationError,
} from "@/lib/server/response";
import { prisma } from "@/lib/db";
import { normalizePagination, buildPaginationMeta } from "@/lib/utils";
import { zPaginationQuery } from "@/lib/validation";
import { z, ZodError } from "zod";
import { DeliveryStatus } from "@/lib/db";
import type { Prisma } from "@/lib/db";

const zDeliveryListQuery = zPaginationQuery.extend({
  status: z.nativeEnum(DeliveryStatus).optional(),
  driverId: z.string().optional(),
  orderId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const { error } = await withAdmin(request);
  if (error) return error;

  try {
    const raw = Object.fromEntries(request.nextUrl.searchParams);
    const query = zDeliveryListQuery.parse(raw);
    const { page, limit, skip } = normalizePagination(query);

    const where: Prisma.DeliveryWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.driverId) where.driverId = query.driverId;
    if (query.orderId) where.orderId = query.orderId;

    const [deliveries, total] = await Promise.all([
      prisma.delivery.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          orderId: true,
          driverId: true,
          status: true,
          pickupAddress: true,
          deliveryAddress: true,
          pickupLatitude: true,
          pickupLongitude: true,
          deliveryLatitude: true,
          deliveryLongitude: true,
          assignedAt: true,
          acceptedAt: true,
          pickedUpAt: true,
          deliveredAt: true,
          createdAt: true,
          order: {
            select: {
              id: true,
              orderNumber: true,
              total: true,
              vendor: { select: { id: true, storeName: true } },
            },
          },
          driver: {
            select: {
              id: true,
              vehicleType: true,
              user: { select: { id: true, name: true, phone: true } },
            },
          },
        },
      }),
      prisma.delivery.count({ where }),
    ]);

    return apiSuccess(deliveries, 200, buildPaginationMeta(page, limit, total));
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    return apiInternalError(err);
  }
}
