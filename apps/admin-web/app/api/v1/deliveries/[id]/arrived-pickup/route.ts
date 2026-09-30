/**
 * POST /api/v1/deliveries/[id]/arrived-pickup — Driver arrives at vendor pickup location
 *
 * Requires: DRIVER role
 */

import { NextRequest } from "next/server";
import { withDriver } from "@/../../../../server/middleware/auth";
import {
  apiSuccess,
  apiBadRequest,
  apiInternalError,
} from "@/../../../../server/infrastructure/response";
import { arrivedAtPickup } from "@/../../../../server/modules/deliveries";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { ctx, error } = await withDriver(request);
  if (error) return error;

  try {
    const { id } = await params;
    const updated = await arrivedAtPickup(ctx.userId, id);
    return apiSuccess(updated);
  } catch (err: any) {
    if (err.message && err.message.includes("not assigned")) {
      return apiBadRequest(err.message);
    }
    return apiInternalError(err);
  }
}
