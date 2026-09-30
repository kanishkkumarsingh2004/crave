/**
 * GET /api/v1/vendor/analytics — Vendor top selling products, sales trends, cancellation rate
 *
 * Requires: VENDOR role
 * spec: Task 6.8
 */

import type { NextRequest } from "next/server";
import { withVendor } from "@/../../../../server/middleware/auth";
import { apiSuccess, apiInternalError } from "@/../../../../server/infrastructure/response";
import { getVendorAnalytics } from "@/../../../../server/modules/vendors";

export async function GET(request: NextRequest) {
  const { ctx, error } = await withVendor(request);
  if (error) return error;

  try {
    const analytics = await getVendorAnalytics(ctx.userId);
    return apiSuccess(analytics);
  } catch (err) {
    return apiInternalError(err);
  }
}
