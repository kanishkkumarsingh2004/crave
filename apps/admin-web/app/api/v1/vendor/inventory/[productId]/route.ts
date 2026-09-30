/**
 * GET   /api/v1/vendor/inventory/[productId] — Get stock for single product
 * PATCH /api/v1/vendor/inventory/[productId] — Vendor update product stock
 */

import type { NextRequest } from "next/server";
import { withVendor } from "@/../../../../server/middleware/auth";
import {
  apiSuccess,
  apiNotFound,
  apiInternalError,
  apiValidationError,
} from "@/../../../../server/infrastructure/response";
import { prisma } from "@delivery/database";
import { zUpdateInventory, ZodError } from "@delivery/validation";
import { updateProductStock } from "@/../../../../server/modules/inventory";

type Params = { params: Promise<{ productId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { ctx, error } = await withVendor(request);
  if (error) return error;

  try {
    const { productId } = await params;
    const vendor = await prisma.vendor.findUnique({
      where: { userId: ctx.userId },
      select: { id: true },
    });
    if (!vendor) return apiNotFound("Vendor");

    const inventory = await prisma.inventory.findUnique({
      where: { productId },
      include: {
        product: { select: { id: true, name: true, sku: true, vendorId: true } },
      },
    });

    if (!inventory || inventory.product.vendorId !== vendor.id) {
      return apiNotFound("Inventory");
    }

    return apiSuccess(inventory);
  } catch (err) {
    return apiInternalError(err);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { ctx, error } = await withVendor(request);
  if (error) return error;

  try {
    const { productId } = await params;
    const vendor = await prisma.vendor.findUnique({
      where: { userId: ctx.userId },
      select: { id: true },
    });
    if (!vendor) return apiNotFound("Vendor");

    const body = (await request.json()) as unknown;
    const input = zUpdateInventory.parse(body);

    const updated = await updateProductStock(productId, vendor.id, input);
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
