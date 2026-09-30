/**
 * POST /api/v1/customer/addresses/[id]/default — Set address as default
 *
 * Requires: CUSTOMER role
 */

import type { NextRequest } from "next/server";
import { withCustomer } from "@/../../../../server/middleware/auth";
import { apiSuccess, apiInternalError } from "@/../../../../server/infrastructure/response";
import { setDefaultAddress } from "@/../../../../server/modules/customers";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { ctx, error } = await withCustomer(request);
  if (error) return error;

  try {
    const { id } = await params;
    const result = await setDefaultAddress(ctx.userId, id);
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
