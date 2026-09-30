/**
 * GET /api/v1/products — Public API to browse products
 */

import { NextRequest } from "next/server";
import { apiSuccess, apiInternalError } from "@/../../../../server/infrastructure/response";
import { getPublicProducts } from "@/../../../../server/modules/catalog";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const vendorId = searchParams.get("vendorId") ?? undefined;
    const categoryId = searchParams.get("categoryId") ?? undefined;
    const search = searchParams.get("search") ?? undefined;

    const result = await getPublicProducts({
      page,
      limit,
      vendorId,
      categoryId,
      search,
    });

    return apiSuccess(result.products, 200, result.meta);
  } catch (err) {
    return apiInternalError(err);
  }
}
