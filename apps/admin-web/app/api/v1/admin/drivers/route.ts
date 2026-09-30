/**
 * GET   /api/v1/admin/drivers          — List drivers (paginated)
 *
 * Requires: ADMIN role
 * spec: api-spec.md Admin Driver Management
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
import { zDriverListQuery } from "@delivery/validation";
import { ZodError } from "zod";
import type { Prisma } from "@delivery/database";

export async function GET(request: NextRequest) {
  const { error } = await withAdmin(request);
  if (error) return error;

  try {
    const raw = Object.fromEntries(request.nextUrl.searchParams);
    const query = zDriverListQuery.parse(raw);
    const { page, limit, skip } = normalizePagination(query);

    const where: Prisma.DriverWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.availability) where.availability = query.availability;
    if (query.search) {
      where.user = {
        OR: [
          { name: { contains: query.search, mode: "insensitive" } },
          { email: { contains: query.search, mode: "insensitive" } },
        ],
      };
    }

    const [drivers, total] = await Promise.all([
      prisma.driver.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          availability: true,
          vehicleType: true,
          vehicleNumber: true,
          rating: true,
          totalDeliveries: true,
          approvedAt: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              status: true,
            },
          },
          _count: {
            select: { deliveries: true },
          },
        },
      }),
      prisma.driver.count({ where }),
    ]);

    return apiSuccess(drivers, 200, buildPaginationMeta(page, limit, total));
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    return apiInternalError(err);
  }
}
