/**
 * POST /api/v1/payments/verify — Client submits gateway signature for verification
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
import { zVerifyPayment, ZodError } from "@delivery/validation";
import { verifyPayment } from "@/../../../../server/modules/payments";

export async function POST(request: NextRequest) {
  const { error } = await withCustomer(request);
  if (error) return error;

  try {
    const body = (await request.json()) as unknown;
    const input = zVerifyPayment.parse(body);

    const verified = await verifyPayment(
      input.orderId,
      input.providerPaymentId,
      input.providerSignature,
      input.providerOrderId,
    );
    return apiSuccess(verified);
  } catch (err: any) {
    if (err instanceof ZodError) return apiValidationError(err);
    if (err.message && (err.message.includes("Invalid") || err.message.includes("not found"))) {
      return apiBadRequest(err.message);
    }
    return apiInternalError(err);
  }
}
