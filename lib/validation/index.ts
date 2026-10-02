/**
 * BlinkBite Admin Validation Schemas
 *
 * Concise, strictly-typed Zod schemas for all Admin API inputs and dashboard mutations.
 */

import { z, ZodError } from "zod";
export { z, ZodError };

import {
  VendorStatus,
  DriverStatus,
  DriverAvailability,
  OrderStatus,
  ProductStatus,
  UserRole,
  UserStatus,
} from "@/types";

// ============================================================
// PRIMITIVES
// ============================================================

export const zEmail = z.string().email().trim().toLowerCase();
export const zPhone = z
  .string()
  .regex(/^[6-9]\d{9}$/, "Must be a valid 10-digit Indian mobile number");
export const zPassword = z.string().min(8, "Password must be at least 8 characters");
export const zNonEmptyString = z.string().trim().min(1, "Required");
export const zOptionalString = z.string().trim().optional();

// ============================================================
// PAGINATION
// ============================================================

export const zPaginationQuery = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .pipe(z.number().int().positive()),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 20))
    .pipe(z.number().int().positive().max(100)),
});

export type PaginationQueryInput = z.infer<typeof zPaginationQuery>;

// ============================================================
// AUTH SCHEMAS
// ============================================================

export const zAdminSignIn = z
  .object({
    email: zEmail,
    password: z.string().min(1, "Password is required"),
  })
  .strict();

export const zSignIn = zAdminSignIn;

// ============================================================
// VENDOR SCHEMAS
// ============================================================

export const zVendorListQuery = zPaginationQuery.extend({
  status: z.nativeEnum(VendorStatus).optional(),
  search: z.string().trim().optional(),
});

export const zUpdateVendorStatus = z
  .object({
    status: z.nativeEnum(VendorStatus),
    rejectionReason: z.string().trim().max(500).optional(),
  })
  .strict();

export const zCreateVendor = z.object({
  name: zNonEmptyString.max(100),
  description: z.string().trim().optional(),
  address: zNonEmptyString,
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  phone: zPhone,
  email: zEmail,
  commissionRate: z.number().min(0).max(100).default(15),
  ownerName: zNonEmptyString.optional(),
  ownerEmail: zEmail.optional(),
  ownerPassword: zPassword.optional(),
});

export type CreateVendorInput = z.infer<typeof zCreateVendor>;

// ============================================================
// CATEGORY SCHEMAS
// ============================================================

export const zCreateCategory = z
  .object({
    name: zNonEmptyString.max(100),
    slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/).optional(),
    description: z.string().trim().max(500).optional(),
    imageUrl: z.string().url().optional(),
    sortOrder: z.number().int().nonnegative().default(0),
    isActive: z.boolean().default(true),
  })
  .strict();

export const zUpdateCategory = z
  .object({
    name: zNonEmptyString.max(100).optional(),
    slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/).optional(),
    description: z.string().trim().max(500).optional(),
    imageUrl: z.string().url().optional(),
    sortOrder: z.number().int().nonnegative().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

// ============================================================
// PRODUCT SCHEMAS
// ============================================================

export const zProductListQuery = zPaginationQuery.extend({
  vendorId: z.string().optional(),
  categoryId: z.string().optional(),
  status: z.nativeEnum(ProductStatus).optional(),
  search: z.string().trim().optional(),
});

export const zCreateProduct = z
  .object({
    vendorId: zNonEmptyString,
    categoryId: zNonEmptyString,
    name: zNonEmptyString.max(150),
    description: z.string().trim().max(1000).optional(),
    price: z.number().positive(),
    imageUrl: z.string().url().optional(),
    status: z.nativeEnum(ProductStatus).default(ProductStatus.ACTIVE),
    isAvailable: z.boolean().default(true),
    preparationTimeMinutes: z.number().int().positive().default(15),
  })
  .strict();

export const zUpdateProduct = z
  .object({
    name: zNonEmptyString.max(150).optional(),
    description: z.string().trim().max(1000).optional(),
    price: z.number().positive().optional(),
    imageUrl: z.string().url().optional(),
    status: z.nativeEnum(ProductStatus).optional(),
    isAvailable: z.boolean().optional(),
    preparationTimeMinutes: z.number().int().positive().optional(),
    categoryId: z.string().optional(),
  })
  .strict();

// ============================================================
// ORDER SCHEMAS
// ============================================================

export const zOrderListQuery = zPaginationQuery.extend({
  status: z.nativeEnum(OrderStatus).optional(),
  vendorId: z.string().optional(),
  customerId: z.string().optional(),
  driverId: z.string().optional(),
  dateFrom: z.string().datetime({ offset: true }).optional(),
  dateTo: z.string().datetime({ offset: true }).optional(),
  search: z.string().trim().optional(),
});

export const zUpdateOrderStatus = z
  .object({
    status: z.nativeEnum(OrderStatus),
    note: z.string().trim().max(500).optional(),
  })
  .strict();

// ============================================================
// DRIVER SCHEMAS
// ============================================================

export const zDriverListQuery = zPaginationQuery.extend({
  status: z.nativeEnum(DriverStatus).optional(),
  availability: z.nativeEnum(DriverAvailability).optional(),
  search: z.string().trim().optional(),
});

export const zUpdateDriverStatus = z
  .object({
    status: z.nativeEnum(DriverStatus),
    rejectionReason: z.string().trim().max(500).optional(),
  })
  .strict();

// ============================================================
// USER SCHEMAS
// ============================================================

export const zUserListQuery = zPaginationQuery.extend({
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  search: z.string().trim().optional(),
});

export const zUpdateUserStatus = z
  .object({
    status: z.nativeEnum(UserStatus),
    reason: z.string().trim().max(500).optional(),
  })
  .strict();

export const zAdminCreateUser = z
  .object({
    name: zNonEmptyString.max(100),
    email: zEmail,
    password: zPassword,
    role: z.nativeEnum(UserRole),
    phone: zPhone.optional(),
  })
  .strict();

// ============================================================
// SETTINGS SCHEMAS
// ============================================================

export const zUpdatePlatformSetting = z
  .object({
    value: zNonEmptyString,
    description: z.string().trim().optional(),
  })
  .strict();
