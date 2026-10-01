/**
 * @delivery/database
 *
 * Exports the singleton Prisma client and transaction helpers.
 * Never import @prisma/client directly in application code —
 * always use this package so the singleton is guaranteed.
 */

export { prisma } from "./client";
export { withTransaction } from "./transaction";
export type { TransactionClient } from "./transaction";

// Re-export Prisma types so consumers don't need to depend on @prisma/client directly
export type {
  User,
  Account,
  Session,
  Verification,
  CustomerProfile,
  Vendor,
  VendorDocument,
  Driver,
  DriverDocument,
  Category,
  Product,
  ProductImage,
  Inventory,
  InventoryReservation,
  Cart,
  CartItem,
  Order,
  OrderItem,
  OrderStatusHistory,
  Payment,
  PaymentEvent,
  PaymentStatusHistory,
  Refund,
  Delivery,
  DriverAssignment,
  DeliveryVerification,
  DeliveryStatusHistory,
  DriverLocation,
  Review,
  Notification,
  PlatformSetting,
  AuditLog,
  IdempotencyKey,
  Prisma,
} from "@prisma/client";

export {
  UserRole,
  UserStatus,
  VendorStatus,
  DriverStatus,
  DriverAvailability,
  ProductStatus,
  OrderStatus,
  PaymentStatus,
  DeliveryStatus,
  DriverAssignmentStatus,
  RefundStatus,
  InventoryReservationStatus,
  NotificationStatus,
  AddressLabel,
  ReviewStatus,
  DeliveryVerificationType,
  DeliveryVerificationMethod,
  DeliveryVerificationStatus,
  DeliveryVerificationAttemptResult,
  AuditAction,
} from "@prisma/client";
