/**
 * GET /api/v1/admin/products  — List all products (admin view)
 *
 * Requires: ADMIN role
 * spec: api-spec.md Admin Product Management
 */

import type { NextRequest } from "next/server";
import { withAdmin } from "@/../../server/middleware/auth";
import {
  apiSuccess,
  apiInternalError,
  apiValidationError,
} from "@/../../server/infrastructure/response";
import { prisma } from "@delivery/database";
import { normalizePagination, buildPaginationMeta } from "@delivery/utils";
import { zProductListQuery } from "@delivery/validation";
import { ZodError } from "zod";
import type { Prisma } from "@delivery/database";

export async function GET(request: NextRequest) {
  const { error } = await withAdmin(request);
  if (error) return error;

  try {
    const raw = Object.fromEntries(request.nextUrl.searchParams);
    const query = zProductListQuery.parse(raw);
    const { page, limit, skip } = normalizePagination(query);

    const where: Prisma.ProductWhereInput = { isArchived: false };
    if (query.vendorId) where.vendorId = query.vendorId;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { sku: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          sku: true,
          price: true,
          comparePrice: true,
          currency: true,
          status: true,
          imageUrl: true,
          createdAt: true,
          vendor: {
            select: { id: true, storeName: true },
          },
          category: {
            select: { id: true, name: true },
          },
          inventory: {
            select: { onHand: true, reserved: true, lowStockThreshold: true },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return apiSuccess(products, 200, buildPaginationMeta(page, limit, total));
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    return apiInternalError(err);
  }
}

export async function POST(request: NextRequest) {
  const { error } = await withAdmin(request);
  if (error) return error;

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, any>;
    const {
      vendorId,
      categoryId,
      name,
      description,
      price,
      comparePrice,
      currency = "INR",
      imageUrl,
      sku: providedSku,
      initialStock = 50,
      status = "ACTIVE",
    } = body;

    if (!vendorId) {
      return Response.json(
        { success: false, error: { message: "Vendor ID is required" } },
        { status: 400 }
      );
    }

    if (!categoryId) {
      return Response.json(
        { success: false, error: { message: "Category is required" } },
        { status: 400 }
      );
    }

    if (!name || !name.trim()) {
      return Response.json(
        { success: false, error: { message: "Product name is required" } },
        { status: 400 }
      );
    }

    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      return Response.json(
        { success: false, error: { message: "Valid price is required" } },
        { status: 400 }
      );
    }

    // Auto-generate SKU if not provided
    const sku =
      providedSku && String(providedSku).trim()
        ? String(providedSku).trim()
        : `${name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "ITM")}-${Date.now().toString(36).toUpperCase()}`;

    // Transactionally create product and its inventory
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          vendorId,
          categoryId,
          name: name.trim(),
          description: description?.trim() || null,
          sku,
          price: numPrice,
          comparePrice: comparePrice != null && !isNaN(Number(comparePrice)) ? Number(comparePrice) : null,
          currency,
          imageUrl: imageUrl?.trim() || null,
          status: status === "DRAFT" ? "DRAFT" : "ACTIVE",
        },
        include: {
          category: { select: { id: true, name: true } },
          vendor: { select: { id: true, storeName: true } },
        },
      });

      const inventory = await tx.inventory.create({
        data: {
          productId: product.id,
          onHand: Math.max(0, parseInt(String(initialStock), 10) || 50),
          reserved: 0,
          lowStockThreshold: 5,
        },
      });

      return { ...product, inventory };
    });

    return Response.json({ success: true, data: result }, { status: 201 });
  } catch (err) {
    if (err instanceof Error) {
      return Response.json(
        { success: false, error: { message: err.message } },
        { status: 400 }
      );
    }
    return apiInternalError(err);
  }
}

