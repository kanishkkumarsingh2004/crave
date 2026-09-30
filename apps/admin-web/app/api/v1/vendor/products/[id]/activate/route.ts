/**
 * POST /api/v1/vendor/products/[id]/activate — Vendor activate product (DRAFT/INACTIVE -> ACTIVE)
 */

import { NextRequest } from "next/server";
import { withVendor } from "@/../../../../server/middleware/auth";
import {
  apiSuccess,
  apiNotFound,
  apiInternalError,
} from "@/../../../../server/infrastructure/response";
import { prisma, ProductStatus } from "@delivery/database";
import { updateProductStatus } from "@/../../../../server/modules/catalog";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { ctx, error } = await withVendor(request);
  if (error) return error;

  try {
    const { id } = await params;
    const vendor = await prisma.vendor.findUnique({
      where: { userId: ctx.userId },
      select: { id: true },
    });
    if (!vendor) return apiNotFound("Vendor");

    const updated = await updateProductStatus(id, vendor.id, ProductStatus.ACTIVE);
    return apiSuccess(updated);
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
