/**
 * GET /api/v1/driver/profile — Get driver profile & status info
 *
 * Requires: DRIVER role
 */

import { NextRequest } from "next/server";
import { withDriver } from "@/../../../../server/middleware/auth";
import { apiSuccess, apiInternalError } from "@/../../../../server/infrastructure/response";
import { getDriverProfile } from "@/../../../../server/modules/drivers";

export async function GET(request: NextRequest) {
  const { ctx, error } = await withDriver(request);
  if (error) return error;

  try {
    const profile = await getDriverProfile(ctx.userId);
    return apiSuccess(profile);
  } catch (err) {
    return apiInternalError(err);
  }
}
