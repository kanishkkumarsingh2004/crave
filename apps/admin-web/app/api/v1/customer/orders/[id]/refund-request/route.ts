/**
 * POST /api/v1/customer/orders/[id]/refund-request — Customer submits refund request for paid order
 *
 * Requires: CUSTOMER role
 */

import { NextRequest } from "next/server";
import { withCustomer } from "@/../../../../server/middleware/auth";
import {
  apiSuccess,
  apiBadRequest,
  apiInternalError,
  apiValidationError,
} from "@/../../../../server/infrastructure/response";
import { zRequestRefund, ZodError } from "@delivery/validation";
import { requestRefund } from "@/../../../../server/modules/payments";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { ctx, error } = await withCustomer(request);
  if (error) return error;

  try {
    const { id } = await params;
    const body = (await request.json()) as unknown;
    const input = zRequestRefund.parse({ ...(body as object), orderId: id });

    const refund = await requestRefund(ctx.userId, id, input.reason, input.amount);
    return apiSuccess(refund);
  } catch (err: any) {
    if (err instanceof ZodError) return apiValidationError(err);
    if (err.message && (err.message.includes("not found") || err.message.includes("paid"))) {
      return apiBadRequest(err.message);
    }
    return apiInternalError(err);
  }
}
