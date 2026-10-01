/**
 * PATCH  /api/v1/admin/products/[id]  — Update menu dish details, pricing, stock, status
 * DELETE /api/v1/admin/products/[id]  — Archive/Remove menu dish from catalog
 *
 * Requires: ADMIN role
 */

import type { NextRequest } from "next/server";
import { withAdmin } from "@/../../../../server/middleware/auth";
import {
  apiSuccess,
  apiNotFound,
  apiInternalError,
} from "@/../../../../server/infrastructure/response";
import { prisma } from "@delivery/database";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { error } = await withAdmin(request);
  if (error) return error;

  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as Record<string, any>;

    const product = await prisma.product.findUnique({
      where: { id },
      include: { inventory: true },
    });
    if (!product) return apiNotFound("Product");

    const updateData: Record<string, any> = {};

    if (body.name !== undefined) updateData.name = String(body.name).trim();
    if (body.description !== undefined) {
      updateData.description = body.description ? String(body.description).trim() : null;
    }
    if (body.price !== undefined && !isNaN(Number(body.price))) {
      updateData.price = Number(body.price);
    }
    if (body.comparePrice !== undefined) {
      updateData.comparePrice =
        body.comparePrice != null && !isNaN(Number(body.comparePrice))
          ? Number(body.comparePrice)
          : null;
    }
    if (body.imageUrl !== undefined) {
      updateData.imageUrl = body.imageUrl ? String(body.imageUrl).trim() : null;
    }
    if (body.status !== undefined) {
      updateData.status = body.status === "ACTIVE" ? "ACTIVE" : "DRAFT";
    }
    if (body.categoryId !== undefined) {
      updateData.categoryId = String(body.categoryId);
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedProduct = await tx.product.update({
        where: { id },
        data: updateData,
        include: {
          category: { select: { id: true, name: true } },
          inventory: true,
        },
      });

      if (body.stock !== undefined && !isNaN(Number(body.stock))) {
        const onHand = Math.max(0, parseInt(String(body.stock), 10));
        await tx.inventory.upsert({
          where: { productId: id },
          create: {
            productId: id,
            onHand,
            reserved: 0,
            lowStockThreshold: 5,
          },
          update: {
            onHand,
          },
        });
      }

      return updatedProduct;
    });

    return apiSuccess(result);
  } catch (err) {
    return apiInternalError(err);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { error } = await withAdmin(request);
  if (error) return error;

  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return apiNotFound("Product");

    // Soft delete product by setting isArchived: true
    await prisma.product.update({
      where: { id },
      data: {
        isArchived: true,
        status: "DRAFT",
      },
    });

    return apiSuccess({ message: "Product archived successfully", id });
  } catch (err) {
    return apiInternalError(err);
  }
}
