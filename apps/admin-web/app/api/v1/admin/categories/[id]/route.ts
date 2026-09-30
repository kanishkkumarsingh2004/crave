/**
 * PATCH  /api/v1/admin/categories/[id]  — Update category
 * DELETE /api/v1/admin/categories/[id]  — Delete category
 *
 * Requires: ADMIN role
 * spec: api-spec.md Admin Category Management
 */

import type { NextRequest } from "next/server";
import { withAdmin } from "@/../../../../server/middleware/auth";
import {
  apiSuccess,
  apiNotFound,
  apiNoContent,
  apiInternalError,
  apiValidationError,
  apiConflict,
} from "@/../../../../server/infrastructure/response";
import { prisma } from "@delivery/database";
import { zUpdateCategory } from "@delivery/validation";
import { generateSlug } from "@delivery/utils";
import { ZodError } from "zod";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { error } = await withAdmin(request);
  if (error) return error;

  try {
    const { id } = await params;

    const existing = await prisma.category.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) return apiNotFound("Category");

    const body = (await request.json()) as unknown;
    const input = zUpdateCategory.parse(body);

    // If slug changed, check uniqueness
    if (input.slug) {
      const slugConflict = await prisma.category.findFirst({
        where: { slug: input.slug, NOT: { id } },
        select: { id: true },
      });
      if (slugConflict) return apiConflict(`A category with slug "${input.slug}" already exists`);
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.slug !== undefined
          ? { slug: input.slug }
          : input.name !== undefined
            ? { slug: generateSlug(input.name) }
            : {}),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.imageUrl !== undefined && { imageUrl: input.imageUrl }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
      },
    });

    return apiSuccess(updated);
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    return apiInternalError(err);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { error } = await withAdmin(request);
  if (error) return error;

  try {
    const { id } = await params;

    const category = await prisma.category.findUnique({
      where: { id },
      select: { id: true, _count: { select: { products: true } } },
    });
    if (!category) return apiNotFound("Category");

    await prisma.category.delete({ where: { id } });
    return apiNoContent();
  } catch (err) {
    return apiInternalError(err);
  }
}
