/**
 * @delivery/validation
 *
 * Zod schemas for all API inputs across the delivery platform.
 * Used server-side for route validation and client-side for form validation.
 */

import { z, ZodError } from "zod";
export { z, ZodError };
import {
  MAX_CART_ITEM_QUANTITY,
  MAX_CART_ITEMS,
  MAX_RATING,
  MAX_SKU_LENGTH,
  MIN_RATING,
} from "@delivery/constants";
import {
  AddressLabel,
  DriverAvailability,
  OrderStatus,
  ProductStatus,
  UserRole,
  UserStatus,
  VendorStatus,
  DriverStatus,
} from "@delivery/types";

// ============================================================
// COMMON PRIMITIVES
// ============================================================

export const zCuid = z.string().cuid();
export const zEmail = z.string().email().trim().toLowerCase();
export const zPhone = z
  .string()
  .regex(/^[6-9]\d{9}$/, "Must be a valid 10-digit Indian mobile number");
export const zPassword = z.string().min(12, "Password must be at least 12 characters");
export const zPositiveDecimal = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, "Must be a valid decimal amount");
export const zNonEmptyString = z.string().trim().min(1, "Required");
export const zOptionalString = z.string().trim().optional();

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

// ============================================================
// AUTH SCHEMAS
// ============================================================

export const zSignUpCustomer = z
  .object({
    name: zNonEmptyString.max(100),
    email: zEmail,
    password: zPassword,
    phone: zPhone.optional(),
  })
  .strict();

export const zSignIn = z
  .object({
    email: zEmail,
    password: z.string().min(1, "Password is required"),
  })
  .strict();

export const zAdminSignIn = z
  .object({
    email: zEmail,
    password: z.string().min(1, "Password is required"),
  })
  .strict();

export const zForgotPassword = z
  .object({
    email: zEmail,
  })
  .strict();

export const zResetPassword = z
  .object({
    token: zNonEmptyString,
    password: zPassword,
    confirmPassword: zPassword,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const zChangePassword = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: zPassword,
    confirmPassword: zPassword,
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// ============================================================
// USER / ADMIN SCHEMAS
// ============================================================

export const zUpdateUserStatus = z
  .object({
    status: z.nativeEnum(UserStatus),
    reason: zOptionalString,
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
// ADDRESS SCHEMAS
// ============================================================

export const zCreateAddress = z
  .object({
    label: z.nativeEnum(AddressLabel).default(AddressLabel.HOME),
    recipientName: zNonEmptyString.max(100),
    phone: zPhone,
    addressLine1: zNonEmptyString.max(255),
    addressLine2: zOptionalString.pipe(z.string().max(255).optional()),
    city: zNonEmptyString.max(100),
    state: zNonEmptyString.max(100),
    postalCode: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "Must be a valid 6-digit Indian postal code"),
    country: z.string().default("IN"),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    deliveryInstructions: zOptionalString,
    isDefault: z.boolean().default(false),
  })
  .strict();

export const zUpdateAddress = zCreateAddress.partial();

// ============================================================
// CUSTOMER PROFILE SCHEMAS
// ============================================================

export const zUpdateCustomerProfile = z
  .object({
    name: zNonEmptyString.max(100).optional(),
    phone: zPhone.optional(),
    defaultAddressId: zCuid.optional().nullable(),
  })
  .strict();

// ============================================================
// VENDOR SCHEMAS
// ============================================================

export const zCreateVendor = z
  .object({
    storeName: zNonEmptyString.max(200),
    description: zOptionalString,
    phone: zPhone.optional(),
    email: zEmail.optional(),
    address: zOptionalString,
    city: zOptionalString,
    state: zOptionalString,
    postalCode: zOptionalString,
    country: z.string().default("IN"),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
  })
  .strict();

export const zUpdateVendor = zCreateVendor.partial().extend({
  isOpen: z.boolean().optional(),
});

export const zUpdateVendorStatus = z
  .object({
    status: z.nativeEnum(VendorStatus),
    reason: zOptionalString,
  })
  .strict();

// ============================================================
// DRIVER SCHEMAS
// ============================================================

export const zCreateDriver = z
  .object({
    phone: zPhone.optional(),
    vehicleType: zNonEmptyString.max(100).optional(),
    vehicleNumber: zNonEmptyString.max(50).optional(),
    licenseNumber: zNonEmptyString.max(50).optional(),
  })
  .strict();

export const zUpdateDriver = zCreateDriver.partial();

export const zUpdateDriverStatus = z
  .object({
    status: z.nativeEnum(DriverStatus),
    reason: zOptionalString,
  })
  .strict();

export const zUpdateDriverAvailability = z
  .object({
    availability: z.nativeEnum(DriverAvailability),
  })
  .strict();

export const zUpdateDriverLocation = z
  .object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracy: z.number().positive().optional(),
    heading: z.number().min(0).max(360).optional(),
    speed: z.number().min(0).optional(),
  })
  .strict();

// ============================================================
// CATEGORY SCHEMAS
// ============================================================

export const zCreateCategory = z
  .object({
    name: zNonEmptyString.max(100),
    slug: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens")
      .optional(),
    description: zOptionalString,
    imageUrl: z.string().url().optional(),
    isActive: z.boolean().default(true),
    sortOrder: z.number().int().min(0).default(0),
  })
  .strict();

export const zUpdateCategory = zCreateCategory.partial();

// ============================================================
// PRODUCT SCHEMAS
// ============================================================

export const zCreateProduct = z
  .object({
    categoryId: zCuid,
    name: zNonEmptyString.max(200),
    description: zOptionalString,
    sku: zNonEmptyString.max(MAX_SKU_LENGTH),
    price: z.number().positive("Price must be positive"),
    comparePrice: z.number().positive().optional(),
    currency: z.string().length(3).default("INR"),
    imageUrl: z.string().url().optional(),
    status: z.nativeEnum(ProductStatus).default(ProductStatus.DRAFT),
  })
  .strict();

export const zUpdateProduct = zCreateProduct.partial().omit({ sku: true });

export const zUpdateProductStatus = z
  .object({
    status: z.nativeEnum(ProductStatus),
  })
  .strict();

// ============================================================
// INVENTORY SCHEMAS
// ============================================================

export const zUpdateInventory = z
  .object({
    quantity: z.number().int().min(0, "Quantity cannot be negative"),
    lowStockThreshold: z.number().int().min(0).optional(),
    trackInventory: z.boolean().optional(),
  })
  .strict();

// ============================================================
// CART SCHEMAS
// ============================================================

export const zAddCartItem = z
  .object({
    productId: zCuid,
    quantity: z.number().int().positive().max(MAX_CART_ITEM_QUANTITY),
  })
  .strict();

export const zUpdateCartItem = z
  .object({
    quantity: z.number().int().min(0).max(MAX_CART_ITEM_QUANTITY),
  })
  .strict();

// ============================================================
// ORDER SCHEMAS
// ============================================================

export const zCreateOrder = z
  .object({
    addressId: zCuid,
    notes: zOptionalString,
  })
  .strict();

export const zUpdateOrderStatus = z
  .object({
    status: z.nativeEnum(OrderStatus),
    reason: zOptionalString,
  })
  .strict();

export const zCancelOrder = z
  .object({
    reason: zNonEmptyString.max(500),
  })
  .strict();

// ============================================================
// PAYMENT SCHEMAS
// ============================================================

export const zInitiatePayment = z
  .object({
    orderId: zCuid,
    provider: z.string().default("razorpay"),
  })
  .strict();

export const zVerifyPayment = z
  .object({
    orderId: zCuid,
    providerPaymentId: zNonEmptyString,
    providerSignature: zNonEmptyString,
    providerOrderId: zNonEmptyString,
  })
  .strict();

export const zRequestRefund = z
  .object({
    orderId: zCuid,
    reason: zNonEmptyString.max(500),
    amount: z.number().positive().optional(), // if not provided, full refund
  })
  .strict();

// ============================================================
// DELIVERY SCHEMAS
// ============================================================

export const zAcceptDelivery = z
  .object({
    assignmentId: zCuid,
  })
  .strict();

export const zRejectDelivery = z
  .object({
    assignmentId: zCuid,
    reason: zOptionalString,
  })
  .strict();

export const zDeliveryVerification = z
  .object({
    deliveryId: zCuid,
    type: z.enum(["OTP", "QR", "PHOTO", "SIGNATURE", "MANUAL"]),
    value: zOptionalString, // OTP code, QR data, etc.
    photoUrl: z.string().url().optional(),
  })
  .strict();

// ============================================================
// REVIEW SCHEMAS
// ============================================================

export const zCreateReview = z
  .object({
    orderId: zCuid,
    rating: z.number().int().min(MIN_RATING).max(MAX_RATING),
    comment: zOptionalString.pipe(z.string().max(1000).optional()),
  })
  .strict();

// ============================================================
// NOTIFICATION SCHEMAS
// ============================================================

export const zMarkNotificationRead = z
  .object({
    notificationIds: z.array(zCuid).min(1).max(50),
  })
  .strict();

// ============================================================
// PLATFORM SETTINGS SCHEMA
// ============================================================

export const zUpdatePlatformSetting = z
  .object({
    value: zNonEmptyString,
    description: zOptionalString,
  })
  .strict();

// ============================================================
// SEARCH / FILTER SCHEMAS
// ============================================================

export const zUserListQuery = zPaginationQuery.extend({
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  search: zOptionalString,
});

export const zVendorListQuery = zPaginationQuery.extend({
  status: z.nativeEnum(VendorStatus).optional(),
  search: zOptionalString,
});

export const zDriverListQuery = zPaginationQuery.extend({
  status: z.nativeEnum(DriverStatus).optional(),
  availability: z.nativeEnum(DriverAvailability).optional(),
  search: zOptionalString,
});

export const zProductListQuery = zPaginationQuery.extend({
  vendorId: zCuid.optional(),
  categoryId: zCuid.optional(),
  status: z.nativeEnum(ProductStatus).optional(),
  search: zOptionalString,
});

export const zOrderListQuery = zPaginationQuery.extend({
  status: z.nativeEnum(OrderStatus).optional(),
  customerId: zCuid.optional(),
  vendorId: zCuid.optional(),
  driverId: zCuid.optional(),
  search: zOptionalString,
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

// ============================================================
// TYPE EXPORTS (inferred from schemas)
// ============================================================

export type SignUpCustomerInput = z.infer<typeof zSignUpCustomer>;
export type SignInInput = z.infer<typeof zSignIn>;
export type ForgotPasswordInput = z.infer<typeof zForgotPassword>;
export type ResetPasswordInput = z.infer<typeof zResetPassword>;
export type ChangePasswordInput = z.infer<typeof zChangePassword>;

export type CreateAddressInput = z.infer<typeof zCreateAddress>;
export type UpdateAddressInput = z.infer<typeof zUpdateAddress>;
export type UpdateCustomerProfileInput = z.infer<typeof zUpdateCustomerProfile>;

export type CreateVendorInput = z.infer<typeof zCreateVendor>;
export type UpdateVendorInput = z.infer<typeof zUpdateVendor>;
export type UpdateVendorStatusInput = z.infer<typeof zUpdateVendorStatus>;

export type CreateDriverInput = z.infer<typeof zCreateDriver>;
export type UpdateDriverInput = z.infer<typeof zUpdateDriver>;
export type UpdateDriverStatusInput = z.infer<typeof zUpdateDriverStatus>;
export type UpdateDriverAvailabilityInput = z.infer<typeof zUpdateDriverAvailability>;
export type UpdateDriverLocationInput = z.infer<typeof zUpdateDriverLocation>;

export type CreateCategoryInput = z.infer<typeof zCreateCategory>;
export type UpdateCategoryInput = z.infer<typeof zUpdateCategory>;

export type CreateProductInput = z.infer<typeof zCreateProduct>;
export type UpdateProductInput = z.infer<typeof zUpdateProduct>;

export type UpdateInventoryInput = z.infer<typeof zUpdateInventory>;

export type AddCartItemInput = z.infer<typeof zAddCartItem>;
export type UpdateCartItemInput = z.infer<typeof zUpdateCartItem>;

export type CreateOrderInput = z.infer<typeof zCreateOrder>;
export type UpdateOrderStatusInput = z.infer<typeof zUpdateOrderStatus>;
export type CancelOrderInput = z.infer<typeof zCancelOrder>;

export type InitiatePaymentInput = z.infer<typeof zInitiatePayment>;
export type VerifyPaymentInput = z.infer<typeof zVerifyPayment>;
export type RequestRefundInput = z.infer<typeof zRequestRefund>;

export type CreateReviewInput = z.infer<typeof zCreateReview>;
export type DeliveryVerificationInput = z.infer<typeof zDeliveryVerification>;

export type UserListQuery = z.infer<typeof zUserListQuery>;
export type VendorListQuery = z.infer<typeof zVendorListQuery>;
export type DriverListQuery = z.infer<typeof zDriverListQuery>;
export type ProductListQuery = z.infer<typeof zProductListQuery>;
export type OrderListQuery = z.infer<typeof zOrderListQuery>;
