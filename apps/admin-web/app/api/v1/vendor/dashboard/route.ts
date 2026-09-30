/**
 * GET /api/v1/vendor/dashboard — Vendor dashboard operational metrics
 *
 * Requires: VENDOR role
 * spec: Task 6.2
 */

import { NextRequest } from "next/server";
import { withVendor } from "@/../../../../server/middleware/auth";
import { apiSuccess, apiInternalError } from "@/../../../../server/infrastructure/response";
import { getVendorDashboard } from "@/../../../../server/modules/vendors";

export async function GET(request: NextRequest) {
  const { ctx, error } = await withVendor(request);
  if (error) return error;

  try {
    const dashboard = await getVendorDashboard(ctx.userId);
    return apiSuccess(dashboard);
  } catch (err) {
    return apiInternalError(err);
  }
}
