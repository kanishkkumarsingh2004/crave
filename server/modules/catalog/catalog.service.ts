/**
 * Catalog Service
 *
 * Handles products and categories queries, vendor product management,
 * and status updates per Phase 4 specification.
 */

import { prisma, ProductStatus, VendorStatus } from "@delivery/database";
import type {
  CreateProductInput,
  UpdateProductInput,
  ProductListQuery,
} from "@delivery/validation";

export async function getActiveCategories() {
  return prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getCategoryById(id: string) {
  return prisma.category.findUnique({
    where: { id },
  });
}

export async function getPublicProducts(query: ProductListQuery) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    status: ProductStatus.ACTIVE,
  };

  if (query.vendorId) where.vendorId = query.vendorId;
  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { description: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        vendor: { select: { id: true, storeName: true, isOpen: true } },
        category: { select: { id: true, name: true } },
        inventory: { select: { onHand: true, reserved: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    products,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

export async function getProductById(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      vendor: { select: { id: true, storeName: true, isOpen: true, status: true } },
      category: { select: { id: true, name: true, slug: true } },
      inventory: { select: { onHand: true, reserved: true, lowStockThreshold: true } },
      images: { orderBy: { sortOrder: "asc" } },
    },
  });
}

export async function createVendorProduct(vendorId: string, input: CreateProductInput) {
  // 1. Verify vendor is active
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: { id: true, status: true },
  });

  if (!vendor || vendor.status !== VendorStatus.APPROVED) {
    throw new Error("Vendor account must be APPROVED to list products");
  }

  // 2. Verify category exists
  const category = await prisma.category.findUnique({
    where: { id: input.categoryId },
  });
  if (!category) {
    throw new Error("Specified category does not exist");
  }

  // 3. Transactional create of Product + Inventory
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        vendorId,
        categoryId: input.categoryId,
        name: input.name,
        description: input.description,
        sku: input.sku,
        price: input.price,
        comparePrice: input.comparePrice,
        currency: input.currency ?? "INR",
        imageUrl: input.imageUrl,
        status: input.status ?? ProductStatus.DRAFT,
      },
    });

    await tx.inventory.create({
      data: {
        productId: product.id,
        onHand: 0,
        reserved: 0,
        lowStockThreshold: 5,
      },
    });

    return product;
  });
}

export async function updateVendorProduct(
  productId: string,
  vendorId: string,
  input: UpdateProductInput,
) {
  const existing = await prisma.product.findUnique({
    where: { id: productId },
    select: { vendorId: true },
  });

  if (!existing || existing.vendorId !== vendorId) {
    throw new Error("Product not found or not owned by vendor");
  }

  return prisma.product.update({
    where: { id: productId },
    data: input,
  });
}

export async function updateProductStatus(
  productId: string,
  vendorId: string,
  status: ProductStatus,
) {
  const existing = await prisma.product.findUnique({
    where: { id: productId },
    select: { vendorId: true },
  });

  if (!existing || existing.vendorId !== vendorId) {
    throw new Error("Product not found or not owned by vendor");
  }

  return prisma.product.update({
    where: { id: productId },
    data: { status },
  });
}
