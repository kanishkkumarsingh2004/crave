/**
 * POST /api/v1/deliveries/[id]/arriving — Driver marks arrival near customer location (ARRIVING)
 *
 * Requires: DRIVER role
 */

import type { NextRequest } from "next/server";
import { withDriver } from "@/../../../../server/middleware/auth";
import {
  apiSuccess,
  apiBadRequest,
  apiInternalError,
} from "@/../../../../server/infrastructure/response";
import { arrivingAtCustomer } from "@/../../../../server/modules/deliveries";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { ctx, error } = await withDriver(request);
  if (error) return error;

  try {
    const { id } = await params;
    const updated = await arrivingAtCustomer(ctx.userId, id);
    return apiSuccess(updated);
  } catch (err: any) {
    if (err.message && err.message.includes("not assigned")) {
      return apiBadRequest(err.message);
    }
    return apiInternalError(err);
  }
}
