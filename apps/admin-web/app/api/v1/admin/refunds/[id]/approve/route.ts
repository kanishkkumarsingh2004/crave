/**
 * POST /api/v1/admin/refunds/[id]/approve — Admin approves refund request
 *
 * Requires: ADMIN role
 */

import type { NextRequest } from "next/server";
import { withAdmin } from "@/../../../../server/middleware/auth";
import {
  apiSuccess,
  apiBadRequest,
  apiInternalError,
} from "@/../../../../server/infrastructure/response";
import { approveRefund } from "@/../../../../server/modules/payments";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { ctx, error } = await withAdmin(request);
  if (error) return error;

  try {
    const { id } = await params;
    const refund = await approveRefund(ctx.userId, id);
    return apiSuccess(refund);
  } catch (err: any) {
    if (err.message && err.message.includes("cannot be approved")) {
      return apiBadRequest(err.message);
    }
    return apiInternalError(err);
  }
}
