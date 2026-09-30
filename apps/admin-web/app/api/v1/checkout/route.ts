/**
 * POST /api/v1/checkout — Process order checkout
 *
 * Enforces server-side price calculation, Idempotency-Key validation,
 * and atomic DB transaction (Order + OrderItems + Reserve Inventory + Payment + Delivery + Clear Cart).
 *
 * Requires: CUSTOMER role
 * spec: Phase 5 §5.6
 */

import type { NextRequest } from "next/server";
import { withCustomer } from "@/../../../../server/middleware/auth";
import {
  apiCreated,
  apiError,
  apiInternalError,
  apiValidationError,
} from "@/../../../../server/infrastructure/response";
import { zCreateOrder, ZodError } from "@delivery/validation";
import { processCheckout } from "@/../../../../server/modules/orders";

export async function POST(request: NextRequest) {
  const { ctx, error } = await withCustomer(request);
  if (error) return error;

  try {
    const idempotencyKey = request.headers.get("Idempotency-Key");
    if (!idempotencyKey) {
      return apiError("BAD_REQUEST", "Idempotency-Key header is required for checkout", 400);
    }

    const body = (await request.json()) as unknown;
    const input = zCreateOrder.parse(body);

    const orderResult = await processCheckout(ctx.userId, input);
    return apiCreated(orderResult);
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    if (err instanceof Error) {
      return apiError("BAD_REQUEST", err.message, 400);
    }
    return apiInternalError(err);
  }
}
