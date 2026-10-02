/**
 * GET /api/v1/categories/[id] — Public API for category detail
 */

import type { NextRequest } from "next/server";
import {
  apiSuccess,
  apiNotFound,
  apiInternalError,
} from "@/lib/server/response";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const category = await prisma.category.findUnique({
      where: { id },
      include: { products: true },
    });
    if (!category) return apiNotFound("Category");
    return apiSuccess(category);
  } catch (err) {
    return apiInternalError(err);
  }
}
