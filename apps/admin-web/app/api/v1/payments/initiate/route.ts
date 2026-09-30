/**
 * POST /api/v1/payments/initiate — Initiate payment for customer order
 *
 * Requires: CUSTOMER role
 */

import type { NextRequest } from "next/server";
import { withCustomer } from "@/../../../../server/middleware/auth";
import {
  apiSuccess,
  apiBadRequest,
  apiInternalError,
  apiValidationError,
} from "@/../../../../server/infrastructure/response";
import { zInitiatePayment, ZodError } from "@delivery/validation";
import { initiatePayment } from "@/../../../../server/modules/payments";

export async function POST(request: NextRequest) {
  const { ctx, error } = await withCustomer(request);
  if (error) return error;

  try {
    const body = (await request.json()) as unknown;
    const input = zInitiatePayment.parse(body);

    const intent = await initiatePayment(input.orderId, ctx.userId, input.provider);
    return apiSuccess(intent);
  } catch (err: any) {
    if (err instanceof ZodError) return apiValidationError(err);
    if (err.message && (err.message.includes("not found") || err.message.includes("belong"))) {
      return apiBadRequest(err.message);
    }
    return apiInternalError(err);
  }
}
