/**
 * POST /api/v1/deliveries/[id]/reject — Driver rejects delivery assignment offer
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
import { rejectDelivery } from "@/../../../../server/modules/deliveries";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { ctx, error } = await withDriver(request);
  if (error) return error;

  try {
    const { id } = await params;
    let reason: string | undefined;
    try {
      const body = (await request.json()) as { reason?: string };
      reason = body.reason;
    } catch {
      // Body optional
    }

    const updated = await rejectDelivery(ctx.userId, id, reason);
    return apiSuccess(updated);
  } catch (err: any) {
    if (err.message && err.message.includes("not assigned")) {
      return apiBadRequest(err.message);
    }
    return apiInternalError(err);
  }
}
