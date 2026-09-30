/**
 * GET /api/v1/vendor/earnings — Vendor gross sales, platform fees, net earnings
 *
 * Requires: VENDOR role
 * spec: Task 6.6
 */

import { NextRequest } from "next/server";
import { withVendor } from "@/../../../../server/middleware/auth";
import { apiSuccess, apiInternalError } from "@/../../../../server/infrastructure/response";
import { getVendorEarnings } from "@/../../../../server/modules/vendors";

export async function GET(request: NextRequest) {
  const { ctx, error } = await withVendor(request);
  if (error) return error;

  try {
    const earnings = await getVendorEarnings(ctx.userId);
    return apiSuccess(earnings);
  } catch (err) {
    return apiInternalError(err);
  }
}
