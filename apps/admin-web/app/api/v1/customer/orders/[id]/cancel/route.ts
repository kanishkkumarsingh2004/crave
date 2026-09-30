/**
 * POST /api/v1/customer/orders/[id]/cancel — Cancel eligible order
 *
 * State-aware: Allowed from PENDING / CONFIRMED state ONLY.
 * Releases reserved inventory back to stock.
 * Requires: CUSTOMER role
 */

import type { NextRequest } from "next/server";
import { withCustomer } from "@/../../../../server/middleware/auth";
import {
  apiSuccess,
  apiError,
  apiInternalError,
  apiValidationError,
} from "@/../../../../server/infrastructure/response";
import { zCancelOrder, ZodError } from "@delivery/validation";
import { cancelCustomerOrder } from "@/../../../../server/modules/orders";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { ctx, error } = await withCustomer(request);
  if (error) return error;

  try {
    const { id } = await params;
    const body = (await request.json()) as unknown;
    const input = zCancelOrder.parse(body);

    const cancelledOrder = await cancelCustomerOrder(ctx.userId, id, input);
    return apiSuccess(cancelledOrder);
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    if (err instanceof Error) {
      return apiError("BAD_REQUEST", err.message, 400);
    }
    return apiInternalError(err);
  }
}
