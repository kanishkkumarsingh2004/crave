/**
 * POST /api/v1/deliveries/[id]/start — Driver starts transit to customer address (IN_TRANSIT)
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
import { startTransit } from "@/../../../../server/modules/deliveries";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { ctx, error } = await withDriver(request);
  if (error) return error;

  try {
    const { id } = await params;
    const delivery = await startTransit(ctx.userId, id);
    return apiSuccess(delivery);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("not assigned")) {
      return apiBadRequest(err.message);
    }
    return apiInternalError(err);
  }
}
