/**
 * GET /api/v1/admin/reviews  — List all reviews (admin view)
 *
 * Requires: ADMIN role
 * spec: Task 9.4 Admin Review Management
 */

import type { NextRequest } from "next/server";
import { withAdmin } from "@/../../../../server/middleware/auth";
import { apiSuccess, apiInternalError } from "@/../../../../server/infrastructure/response";
import { prisma } from "@delivery/database";

export async function GET(request: NextRequest) {
  const { error } = await withAdmin(request);
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const rating = searchParams.get("rating");

    const where: Record<string, unknown> = {};
    if (rating) where.rating = parseInt(rating, 10);

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          customer: { select: { name: true, email: true } },
          vendor: { select: { storeName: true } },
          product: { select: { name: true } },
        },
      }),
      prisma.review.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return apiSuccess(reviews, 200, {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    });
  } catch (err) {
    return apiInternalError(err);
  }
}
