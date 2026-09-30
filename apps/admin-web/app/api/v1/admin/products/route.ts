/**
 * GET /api/v1/admin/products  — List all products (admin view)
 *
 * Requires: ADMIN role
 * spec: api-spec.md Admin Product Management
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
import { zProductListQuery } from "@delivery/validation";
import { ZodError } from "zod";
import type { Prisma } from "@delivery/database";

export async function GET(request: NextRequest) {
  const { error } = await withAdmin(request);
  if (error) return error;

  try {
    const raw = Object.fromEntries(request.nextUrl.searchParams);
    const query = zProductListQuery.parse(raw);
    const { page, limit, skip } = normalizePagination(query);

    const where: Prisma.ProductWhereInput = { isArchived: false };
    if (query.vendorId) where.vendorId = query.vendorId;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { sku: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          sku: true,
          price: true,
          comparePrice: true,
          currency: true,
          status: true,
          imageUrl: true,
          createdAt: true,
          vendor: {
            select: { id: true, storeName: true },
          },
          category: {
            select: { id: true, name: true },
          },
          inventory: {
            select: { onHand: true, reserved: true, lowStockThreshold: true },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return apiSuccess(products, 200, buildPaginationMeta(page, limit, total));
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    return apiInternalError(err);
  }
}
