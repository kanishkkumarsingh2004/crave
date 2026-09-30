/**
 * GET /api/v1/driver/deliveries — Query driver past delivery history
 *
 * Requires: DRIVER role
 */

import { NextRequest } from "next/server";
import { withDriver } from "@/../../../../server/middleware/auth";
import { apiSuccess, apiInternalError } from "@/../../../../server/infrastructure/response";
import { getDriverDeliveryHistory } from "@/../../../../server/modules/drivers";

export async function GET(request: NextRequest) {
  const { ctx, error } = await withDriver(request);
  if (error) return error;

  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const history = await getDriverDeliveryHistory(ctx.userId, page, limit);
    return apiSuccess(history.data, 200, history.pagination);
  } catch (err) {
    return apiInternalError(err);
  }
}
