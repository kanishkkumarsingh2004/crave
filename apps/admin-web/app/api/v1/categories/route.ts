/**
 * GET /api/v1/categories — Public API to list all active categories
 */

import type { NextRequest } from "next/server";
import { apiSuccess, apiInternalError } from "@/../../../../server/infrastructure/response";
import { getActiveCategories } from "@/../../../../server/modules/catalog";

export async function GET(_request: NextRequest) {
  try {
    const categories = await getActiveCategories();
    return apiSuccess(categories);
  } catch (err) {
    return apiInternalError(err);
  }
}
