/**
 * POST /api/v1/admin/refunds/[id]/reject — Admin rejects refund request
 *
 * Requires: ADMIN role
 */

import { NextRequest } from "next/server";
import { withAdmin } from "@/../../../../server/middleware/auth";
import {
  apiSuccess,
  apiBadRequest,
  apiInternalError,
} from "@/../../../../server/infrastructure/response";
import { rejectRefund } from "@/../../../../server/modules/payments";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { ctx, error } = await withAdmin(request);
  if (error) return error;

  try {
    const { id } = await params;
    const body = (await request.json()) as { reason?: string };
    if (!body.reason) {
      return apiBadRequest("Rejection reason is required");
    }

    const refund = await rejectRefund(ctx.userId, id, body.reason);
    return apiSuccess(refund);
  } catch (err: any) {
    if (err.message && err.message.includes("not found")) {
      return apiBadRequest(err.message);
    }
    return apiInternalError(err);
  }
}
