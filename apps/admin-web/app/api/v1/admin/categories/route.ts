/**
 * GET   /api/v1/admin/categories      — List categories
 * POST  /api/v1/admin/categories      — Create a category
 *
 * Requires: ADMIN role
 * spec: api-spec.md Admin Category Management
 */

import type { NextRequest } from "next/server";
import { withAdmin } from "@/../../server/middleware/auth";
import {
  apiSuccess,
  apiCreated,
  apiInternalError,
  apiValidationError,
  apiConflict,
} from "@/../../server/infrastructure/response";
import { prisma } from "@delivery/database";
import { zCreateCategory, zPaginationQuery } from "@delivery/validation";
import { generateSlug, normalizePagination, buildPaginationMeta } from "@delivery/utils";
import { ZodError } from "zod";

export async function GET(request: NextRequest) {
  const { error } = await withAdmin(request);
  if (error) return error;

  try {
    const raw = Object.fromEntries(request.nextUrl.searchParams);
    const query = zPaginationQuery.parse(raw);
    const { page, limit, skip } = normalizePagination(query);

    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        skip,
        take: limit,
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          imageUrl: true,
          isActive: true,
          sortOrder: true,
          createdAt: true,
          _count: { select: { products: true } },
        },
      }),
      prisma.category.count(),
    ]);

    return apiSuccess(categories, 200, buildPaginationMeta(page, limit, total));
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    return apiInternalError(err);
  }
}

export async function POST(request: NextRequest) {
  const { error } = await withAdmin(request);
  if (error) return error;

  try {
    const body = (await request.json()) as unknown;
    const input = zCreateCategory.parse(body);

    const slug = input.slug ?? generateSlug(input.name);

    // Check slug uniqueness
    const existing = await prisma.category.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (existing) return apiConflict(`A category with slug "${slug}" already exists`);

    const category = await prisma.category.create({
      data: {
        name: input.name,
        slug,
        description: input.description,
        imageUrl: input.imageUrl,
        isActive: input.isActive,
        sortOrder: input.sortOrder,
      },
    });

    return apiCreated(category);
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    return apiInternalError(err);
  }
}
