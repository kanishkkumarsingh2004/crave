/**
 * GET /api/v1/driver/active-delivery — Fetch currently active delivery assigned to driver
 *
 * Requires: DRIVER role
 */

import { NextRequest } from "next/server";
import { withDriver } from "@/../../../../server/middleware/auth";
import { apiSuccess, apiInternalError } from "@/../../../../server/infrastructure/response";
import { getDriverActiveDelivery } from "@/../../../../server/modules/drivers";

export async function GET(request: NextRequest) {
  const { ctx, error } = await withDriver(request);
  if (error) return error;

  try {
    const delivery = await getDriverActiveDelivery(ctx.userId);
    return apiSuccess(delivery);
  } catch (err) {
    return apiInternalError(err);
  }
}
