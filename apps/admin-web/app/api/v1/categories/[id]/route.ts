/**
 * GET /api/v1/categories/[id] — Public API for category detail
 */

import type { NextRequest } from "next/server";
import {
  apiSuccess,
  apiNotFound,
  apiInternalError,
} from "@/../../../../server/infrastructure/response";
import { getCategoryById } from "@/../../../../server/modules/catalog";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const category = await getCategoryById(id);
    if (!category) return apiNotFound("Category");
    return apiSuccess(category);
  } catch (err) {
    return apiInternalError(err);
  }
}
