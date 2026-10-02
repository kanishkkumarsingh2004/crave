/**
 * GET /api/v1/admin/refunds — Admin list refund requests
 */

import type { NextRequest } from "next/server";
import { withAdmin } from "@/lib/server/auth";
import { apiSuccess, apiInternalError } from "@/lib/server/response";

export async function GET(request: NextRequest) {
  const { error } = await withAdmin(request);
  if (error) return error;

  try {
    return apiSuccess([], 200, {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    });
  } catch (err) {
    return apiInternalError(err);
  }
}
