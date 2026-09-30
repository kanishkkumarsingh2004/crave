/**
 * PATCH /api/v1/driver/availability — Toggle driver online status (OFFLINE / AVAILABLE / BUSY)
 *
 * Requires: DRIVER role
 */

import type { NextRequest } from "next/server";
import { withDriver } from "@/../../../../server/middleware/auth";
import {
  apiSuccess,
  apiBadRequest,
  apiInternalError,
  apiValidationError,
} from "@/../../../../server/infrastructure/response";
import { zUpdateDriverAvailability, ZodError } from "@delivery/validation";
import { updateDriverAvailability } from "@/../../../../server/modules/drivers";

export async function PATCH(request: NextRequest) {
  const { ctx, error } = await withDriver(request);
  if (error) return error;

  try {
    const body = (await request.json()) as unknown;
    const input = zUpdateDriverAvailability.parse(body);

    const updated = await updateDriverAvailability(ctx.userId, input.availability);
    return apiSuccess(updated);
  } catch (err: any) {
    if (err instanceof ZodError) return apiValidationError(err);
    if (err.message && err.message.includes("Cannot")) {
      return apiBadRequest(err.message);
    }
    return apiInternalError(err);
  }
}
