/**
 * POST /api/v1/driver/location — Record live GPS location updates from driver mobile app
 *
 * Requires: DRIVER role
 */

import type { NextRequest } from "next/server";
import { withDriver } from "@/../../../../server/middleware/auth";
import {
  apiSuccess,
  apiInternalError,
  apiValidationError,
} from "@/../../../../server/infrastructure/response";
import { zUpdateDriverLocation, ZodError } from "@delivery/validation";
import { recordDriverLocation } from "@/../../../../server/modules/drivers";

export async function POST(request: NextRequest) {
  const { ctx, error } = await withDriver(request);
  if (error) return error;

  try {
    const body = (await request.json()) as unknown;
    const input = zUpdateDriverLocation.parse(body);

    const record = await recordDriverLocation(ctx.userId, input);
    return apiSuccess(record);
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    return apiInternalError(err);
  }
}
