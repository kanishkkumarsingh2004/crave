/**
 * GET  /api/v1/admin/users       — List all users (paginated, filterable)
 * POST /api/v1/admin/users       — Create a user (admin-only)
 *
 * Requires: ADMIN role
 * spec: api-spec.md Admin User Management
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
import { normalizePagination, buildPaginationMeta } from "@delivery/utils";
import { zUserListQuery, zAdminCreateUser } from "@delivery/validation";
import { ZodError } from "zod";
import type { Prisma } from "@delivery/database";

export async function GET(request: NextRequest) {
  const { ctx, error } = await withAdmin(request);
  if (error) return error;

  try {
    const raw = Object.fromEntries(request.nextUrl.searchParams);
    const query = zUserListQuery.parse(raw);
    const { page, limit, skip } = normalizePagination(query);

    const where: Prisma.UserWhereInput = {};
    if (query.role) where.role = query.role;
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { email: { contains: query.search, mode: "insensitive" } },
        { phone: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          emailVerified: true,
          image: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return apiSuccess(users, 200, buildPaginationMeta(page, limit, total));
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    return apiInternalError(err);
  }
}

export async function POST(request: NextRequest) {
  const { ctx, error } = await withAdmin(request);
  if (error) return error;

  try {
    const body = (await request.json()) as unknown;
    const input = zAdminCreateUser.parse(body);

    // Check email uniqueness
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (existing) return apiConflict("A user with this email already exists");

    // Create via Better Auth to ensure password hashing
    // For MVP, create the user record directly and let BA handle the account on first login
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        role: input.role,
        phone: input.phone,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return apiCreated(user);
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    return apiInternalError(err);
  }
}
