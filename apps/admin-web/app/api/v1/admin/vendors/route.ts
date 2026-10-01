/**
 * GET   /api/v1/admin/vendors          — List vendors (paginated)
 *
 * Requires: ADMIN role
 * spec: api-spec.md Admin Vendor Management
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
import { zVendorListQuery } from "@delivery/validation";
import { ZodError } from "zod";
import type { Prisma } from "@delivery/database";
import { hashPassword } from "better-auth/crypto";

export async function GET(request: NextRequest) {
  const { error } = await withAdmin(request);
  if (error) return error;

  try {
    const raw = Object.fromEntries(request.nextUrl.searchParams);
    const query = zVendorListQuery.parse(raw);
    const { page, limit, skip } = normalizePagination(query);

    const where: Prisma.VendorWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { storeName: { contains: query.search, mode: "insensitive" } },
        { email: { contains: query.search, mode: "insensitive" } },
        { city: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          storeName: true,
          description: true,
          logoUrl: true,
          phone: true,
          email: true,
          city: true,
          state: true,
          status: true,
          isOpen: true,
          approvedAt: true,
          createdAt: true,
          user: {
            select: { id: true, name: true, email: true, status: true },
          },
          _count: {
            select: { products: true, orders: true },
          },
        },
      }),
      prisma.vendor.count({ where }),
    ]);

    const vendorIds = vendors.map((v) => v.id);

    const revenueByVendor = await prisma.order.groupBy({
      by: ["vendorId"],
      where: {
        vendorId: { in: vendorIds },
        OR: [{ paymentStatus: "PAID" }, { status: "DELIVERED" }],
      },
      _sum: { subtotal: true },
    });

    const revenueMap = new Map<string, number>();
    for (const r of revenueByVendor) {
      const gross = Number(r._sum.subtotal ?? 0);
      revenueMap.set(r.vendorId, Math.round(gross * 0.85 * 100) / 100);
    }

    const vendorsWithRevenue = vendors.map((v) => ({
      ...v,
      revenue: revenueMap.get(v.id) ?? 0,
    }));

    return apiSuccess(vendorsWithRevenue, 200, buildPaginationMeta(page, limit, total));
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
      storeName,
      ownerName,
      email,
      password = "Password123",
      phone,
      description,
      address,
      city,
      state,
      postalCode,
      latitude,
      longitude,
      commissionType = "COMMISSION",
      commissionRate = 15.0,
      isPricingLocked = true,
      logoUrl,
      bannerUrl,
      isOpen = true,
    } = body;

    if (!storeName || !storeName.trim()) {
      return Response.json(
        { success: false, error: { message: "Store name is required" } },
        { status: 400 }
      );
    }

    if (!email || !email.trim()) {
      return Response.json(
        { success: false, error: { message: "Owner email is required" } },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: { vendor: true },
    });

    if (user?.vendor) {
      return Response.json(
        { success: false, error: { message: "A vendor profile already exists for this email address" } },
        { status: 400 }
      );
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: ownerName?.trim() || storeName.trim(),
          email: cleanEmail,
          phone: phone?.trim() || null,
          role: "VENDOR",
          status: "ACTIVE",
          emailVerified: true,
        },
        include: { vendor: true },
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

    // Create the vendor profile with location and pricing lock configuration
    const vendor = await prisma.vendor.create({
      data: {
        userId: user.id,
        storeName: storeName.trim(),
        description: description?.trim() || null,
        logoUrl: logoUrl?.trim() || null,
        bannerUrl: bannerUrl?.trim() || null,
        phone: phone?.trim() || null,
        email: cleanEmail,
        address: address?.trim() || null,
        city: city?.trim() || null,
        state: state?.trim() || null,
        postalCode: postalCode?.trim() || null,
        latitude: latitude != null && !isNaN(Number(latitude)) ? Number(latitude) : null,
        longitude: longitude != null && !isNaN(Number(longitude)) ? Number(longitude) : null,
        commissionType: commissionType === "MARKUP" ? "MARKUP" : "COMMISSION",
        commissionRate: Number(commissionRate) || 15.0,
        isPricingLocked: Boolean(isPricingLocked),
        status: "APPROVED",
        approvedAt: new Date(),
        isOpen: Boolean(isOpen),
      },
      include: {
        user: { select: { id: true, name: true, email: true, status: true } },
        _count: { select: { products: true, orders: true } },
      },
    });

    return Response.json({ success: true, data: vendor }, { status: 201 });
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
