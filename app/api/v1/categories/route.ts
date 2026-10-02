/**
 * GET /api/v1/categories — Public API to list all active categories
 */

import type { NextRequest } from "next/server";
import { apiSuccess, apiInternalError } from "@/lib/server/response";
import { prisma } from "@/lib/db";

export async function GET(_request: NextRequest) {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: { _count: true },
    });
    return apiSuccess(categories);
  } catch (err) {
    return apiInternalError(err);
  }
}
