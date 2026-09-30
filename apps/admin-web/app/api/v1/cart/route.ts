/**
 * GET    /api/v1/cart — Get current customer cart
 * DELETE /api/v1/cart — Clear current customer cart
 *
 * Requires: CUSTOMER role
 */

import type { NextRequest } from "next/server";
import { withCustomer } from "@/../../../../server/middleware/auth";
import { apiSuccess, apiInternalError } from "@/../../../../server/infrastructure/response";
import { getOrCreateCart, clearCart } from "@/../../../../server/modules/cart";

export async function GET(request: NextRequest) {
  const { ctx, error } = await withCustomer(request);
  if (error) return error;

  try {
    const cart = await getOrCreateCart(ctx.userId);
    return apiSuccess(cart);
  } catch (err) {
    return apiInternalError(err);
  }
}

export async function DELETE(request: NextRequest) {
  const { ctx, error } = await withCustomer(request);
  if (error) return error;

  try {
    const cart = await clearCart(ctx.userId);
    return apiSuccess(cart);
  } catch (err) {
    return apiInternalError(err);
  }
}
