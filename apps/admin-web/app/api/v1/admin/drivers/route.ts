/**
 * GET   /api/v1/admin/drivers          — List drivers (paginated)
 *
 * Requires: ADMIN role
 * spec: api-spec.md Admin Driver Management
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
import { zDriverListQuery } from "@delivery/validation";
import { ZodError } from "zod";
import type { Prisma } from "@delivery/database";
import { hashPassword } from "@delivery/auth";

export async function GET(request: NextRequest) {
  const { error } = await withAdmin(request);
  if (error) return error;

  try {
    const raw = Object.fromEntries(request.nextUrl.searchParams);
    const query = zDriverListQuery.parse(raw);
    const { page, limit, skip } = normalizePagination(query);

    const where: Prisma.DriverWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.availability) where.availability = query.availability;
    if (query.search) {
      where.user = {
        OR: [
          { name: { contains: query.search, mode: "insensitive" } },
          { email: { contains: query.search, mode: "insensitive" } },
        ],
      };
    }

    const [drivers, total] = await Promise.all([
      prisma.driver.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          availability: true,
          vehicleType: true,
          vehicleNumber: true,
          rating: true,
          totalDeliveries: true,
          approvedAt: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              status: true,
            },
          },
          _count: {
            select: { deliveries: true },
          },
        },
      }),
      prisma.driver.count({ where }),
    ]);

    return apiSuccess(drivers, 200, buildPaginationMeta(page, limit, total));
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
      name,
      email,
      password = "Password123",
      phone,
      vehicleType = "BIKE",
      vehicleNumber = "",
      licenseNumber = "",
    } = body;

    if (!name || !name.trim()) {
      return Response.json(
        { success: false, error: { message: "Driver name is required" } },
        { status: 400 }
      );
    }

    if (!email || !email.trim()) {
      return Response.json(
        { success: false, error: { message: "Driver email is required" } },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: { driver: true },
    });

    if (user?.driver) {
      return Response.json(
        { success: false, error: { message: "A driver profile already exists for this email address" } },
        { status: 400 }
      );
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: name.trim(),
          email: cleanEmail,
          phone: phone?.trim() || null,
          role: "DRIVER",
          status: "ACTIVE",
          emailVerified: true,
        },
        include: { driver: true },
      });

      // Create credential account for Better Auth
      const hashedPassword = await hashPassword(password);
      await prisma.account.create({
        data: {
          userId: user.id,
          accountId: user.id,
          providerId: "credential",
          password: hashedPassword,
        },
      });
    }

    // Create the driver profile
    const driver = await prisma.driver.create({
      data: {
        userId: user.id,
        status: "APPROVED",
        availability: "OFFLINE",
        vehicleType: vehicleType || "BIKE",
        vehicleNumber: vehicleNumber?.trim() || "KA-01-DR-1001",
        licenseNumber: licenseNumber?.trim() || "DL-908123712",
        approvedAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        availability: true,
        vehicleType: true,
        vehicleNumber: true,
        licenseNumber: true,
        approvedAt: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
          },
        },
      },
    });

    return Response.json({ success: true, data: driver }, { status: 201 });
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

