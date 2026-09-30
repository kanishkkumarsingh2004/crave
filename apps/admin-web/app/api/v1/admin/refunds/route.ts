/**
 * GET /api/v1/admin/refunds — Admin list refund requests
 *
 * Requires: ADMIN role
 */

import type { NextRequest } from "next/server";
import { withAdmin } from "@/../../../../server/middleware/auth";
import { apiSuccess, apiInternalError } from "@/../../../../server/infrastructure/response";
import { getAdminRefunds } from "@/../../../../server/modules/payments";

export async function GET(request: NextRequest) {
  const { error } = await withAdmin(request);
  if (error) return error;

  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const result = await getAdminRefunds(page, limit);
    return apiSuccess(result.data, 200, result.pagination);
  } catch (err) {
    return apiInternalError(err);
  }
}
