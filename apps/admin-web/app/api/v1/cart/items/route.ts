/**
 * POST /api/v1/cart/items — Add item to cart
 *
 * Enforces CART_VENDOR_CONFLICT if adding item from different vendor.
 * Requires: CUSTOMER role
 */

import { NextRequest } from "next/server";
import { withCustomer } from "@/../../../../server/middleware/auth";
import {
  apiSuccess,
  apiInternalError,
  apiValidationError,
} from "@/../../../../server/infrastructure/response";
import { zAddCartItem, ZodError } from "@delivery/validation";
import { addItemToCart } from "@/../../../../server/modules/cart";

export async function POST(request: NextRequest) {
  const { ctx, error } = await withCustomer(request);
  if (error) return error;

  try {
    const body = (await request.json()) as unknown;
    const input = zAddCartItem.parse(body);

    const cart = await addItemToCart(ctx.userId, input);
    return apiSuccess(cart, 201);
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    if (err instanceof Error) {
      const e = err as Error & { code?: string };
      return Response.json(
        {
          success: false,
          error: {
            code: e.code ?? "BAD_REQUEST",
            message: e.message,
          },
        },
        { status: e.code === "CART_VENDOR_CONFLICT" ? 409 : 400 },
      );
    }
    return apiInternalError(err);
  }
}
