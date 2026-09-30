/**
 * PATCH  /api/v1/cart/items/[id] — Update cart item quantity
 * DELETE /api/v1/cart/items/[id] — Remove item from cart
 *
 * Requires: CUSTOMER role
 */

import type { NextRequest } from "next/server";
import { withCustomer } from "@/../../../../server/middleware/auth";
import {
  apiSuccess,
  apiInternalError,
  apiValidationError,
} from "@/../../../../server/infrastructure/response";
import { zUpdateCartItem, ZodError } from "@delivery/validation";
import { updateCartItemQuantity, removeCartItem } from "@/../../../../server/modules/cart";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { ctx, error } = await withCustomer(request);
  if (error) return error;

  try {
    const { id } = await params;
    const body = (await request.json()) as unknown;
    const input = zUpdateCartItem.parse(body);

    const cart = await updateCartItemQuantity(ctx.userId, id, input);
    return apiSuccess(cart);
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    if (err instanceof Error) {
      return Response.json(
        { success: false, error: { code: "BAD_REQUEST", message: err.message } },
        { status: 400 },
      );
    }
    return apiInternalError(err);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { ctx, error } = await withCustomer(request);
  if (error) return error;

  try {
    const { id } = await params;
    const cart = await removeCartItem(ctx.userId, id);
    return apiSuccess(cart);
  } catch (err) {
    if (err instanceof Error) {
      return Response.json(
        { success: false, error: { code: "BAD_REQUEST", message: err.message } },
        { status: 400 },
      );
    }
    return apiInternalError(err);
  }
}
