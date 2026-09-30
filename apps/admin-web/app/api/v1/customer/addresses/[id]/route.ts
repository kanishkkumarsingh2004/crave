/**
 * PATCH  /api/v1/customer/addresses/[id] — Update address
 * DELETE /api/v1/customer/addresses/[id] — Delete address
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
import { zUpdateAddress, ZodError } from "@delivery/validation";
import {
  updateCustomerAddress,
  deleteCustomerAddress,
} from "@/../../../../server/modules/customers";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { ctx, error } = await withCustomer(request);
  if (error) return error;

  try {
    const { id } = await params;
    const body = (await request.json()) as unknown;
    const input = zUpdateAddress.parse(body);

    const updated = await updateCustomerAddress(ctx.userId, id, input);
    return apiSuccess(updated);
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
    const result = await deleteCustomerAddress(ctx.userId, id);
    return apiSuccess(result);
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
