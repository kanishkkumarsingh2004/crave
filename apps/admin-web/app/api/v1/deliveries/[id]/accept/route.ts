/**
 * POST /api/v1/deliveries/[id]/accept — Driver accepts delivery assignment offer
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
import { acceptDelivery } from "@/../../../../server/modules/deliveries";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { ctx, error } = await withDriver(request);
  if (error) return error;

  try {
    const { id } = await params;
    const delivery = await acceptDelivery(ctx.userId, id);
    return apiSuccess(delivery);
  } catch (err: any) {
    if (err.message && err.message.includes("not assigned")) {
      return apiBadRequest(err.message);
    }
    return apiInternalError(err);
  }
}
