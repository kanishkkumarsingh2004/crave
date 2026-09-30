/**
 * @delivery/types
 *
 * Shared TypeScript types for the entire delivery platform.
 * All apps and packages should import domain types from here.
 * Do NOT import @prisma/client directly in application code — use @delivery/database instead.
 */

// ============================================================
// ENUMS (mirrored from Prisma for use in non-server contexts)
// ============================================================

export enum UserRole {
  ADMIN = "ADMIN",
  CUSTOMER = "CUSTOMER",
  VENDOR = "VENDOR",
  DRIVER = "DRIVER",
}

export enum UserStatus {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  DEACTIVATED = "DEACTIVATED",
}

export enum VendorStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  CLOSED = "CLOSED",
  REJECTED = "REJECTED",
}

export enum DriverStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  DEACTIVATED = "DEACTIVATED",
}

export enum DriverAvailability {
  OFFLINE = "OFFLINE",
  AVAILABLE = "AVAILABLE",
  BUSY = "BUSY",
}

export enum ProductStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  ARCHIVED = "ARCHIVED",
}

export enum OrderStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  PREPARING = "PREPARING",
  READY_FOR_PICKUP = "READY_FOR_PICKUP",
  PICKED_UP = "PICKED_UP",
  OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
  FAILED = "FAILED",
}

export enum PaymentStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  AUTHORIZED = "AUTHORIZED",
  PAID = "PAID",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
  REFUND_PENDING = "REFUND_PENDING",
  PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED",
  REFUNDED = "REFUNDED",
}

export enum DeliveryStatus {
  PENDING = "PENDING",
  ASSIGNING = "ASSIGNING",
  ASSIGNED = "ASSIGNED",
  DRIVER_ACCEPTED = "DRIVER_ACCEPTED",
  PICKUP_READY = "PICKUP_READY",
  PICKED_UP = "PICKED_UP",
  IN_TRANSIT = "IN_TRANSIT",
  ARRIVING = "ARRIVING",
  DELIVERED = "DELIVERED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

export enum DriverAssignmentStatus {
  OFFERED = "OFFERED",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
  EXPIRED = "EXPIRED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum RefundStatus {
  NOT_REQUESTED = "NOT_REQUESTED",
  REQUESTED = "REQUESTED",
  UNDER_REVIEW = "UNDER_REVIEW",
  APPROVED = "APPROVED",
  PROCESSING = "PROCESSING",
  PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED",
  REFUNDED = "REFUNDED",
  REJECTED = "REJECTED",
  FAILED = "FAILED",
}

export enum InventoryReservationStatus {
  PENDING = "PENDING",
  RESERVED = "RESERVED",
  RELEASED = "RELEASED",
  COMMITTED = "COMMITTED",
  EXPIRED = "EXPIRED",
}

export enum NotificationStatus {
  CREATED = "CREATED",
  QUEUED = "QUEUED",
  SENDING = "SENDING",
  SENT = "SENT",
  DELIVERED = "DELIVERED",
  READ = "READ",
  FAILED = "FAILED",
}

export enum AddressLabel {
  HOME = "HOME",
  WORK = "WORK",
  OTHER = "OTHER",
}

export enum ReviewStatus {
  PUBLISHED = "PUBLISHED",
  HIDDEN = "HIDDEN",
  REMOVED = "REMOVED",
}

export enum DeliveryVerificationType {
  OTP = "OTP",
  QR = "QR",
  PHOTO = "PHOTO",
  SIGNATURE = "SIGNATURE",
  MANUAL = "MANUAL",
}

export enum DeliveryVerificationStatus {
  PENDING = "PENDING",
  VERIFIED = "VERIFIED",
  FAILED = "FAILED",
}

// ============================================================
// AUTH CONTEXT TYPE
// ============================================================

export interface AuthContext {
  userId: string;
  role: UserRole;
  userStatus: UserStatus;
  sessionId: string;
}

// ============================================================
// API RESPONSE ENVELOPE
// ============================================================

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

// ============================================================
// USER DOMAIN TYPES
// ============================================================

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  image: string | null;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// CUSTOMER DOMAIN TYPES
// ============================================================

export interface CustomerProfileSummary {
  id: string;
  userId: string;
  defaultAddressId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AddressSummary {
  id: string;
  userId: string;
  label: AddressLabel;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude: string | null;
  longitude: string | null;
  deliveryInstructions: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// VENDOR DOMAIN TYPES
// ============================================================

export interface VendorSummary {
  id: string;
  userId: string;
  storeName: string;
  description: string | null;
  logoUrl: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  latitude: string | null;
  longitude: string | null;
  status: VendorStatus;
  isOpen: boolean;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// DRIVER DOMAIN TYPES
// ============================================================

export interface DriverSummary {
  id: string;
  userId: string;
  status: DriverStatus;
  availability: DriverAvailability;
  phone: string | null;
  vehicleType: string | null;
  vehicleNumber: string | null;
  licenseNumber: string | null;
  profileImageUrl: string | null;
  rating: string | null;
  totalDeliveries: number;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// CATALOG DOMAIN TYPES
// ============================================================

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductSummary {
  id: string;
  vendorId: string;
  categoryId: string;
  name: string;
  slug: string | null;
  description: string | null;
  sku: string;
  price: string; // Decimal as string for serialization
  comparePrice: string | null;
  currency: string;
  imageUrl: string | null;
  status: ProductStatus;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// CART DOMAIN TYPES
// ============================================================

export interface CartSummary {
  id: string;
  customerProfileId: string;
  vendorId: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: CartItemSummary[];
}

export interface CartItemSummary {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// ORDER DOMAIN TYPES
// ============================================================

export interface OrderSummary {
  id: string;
  orderNumber: string;
  customerId: string;
  vendorId: string;
  status: OrderStatus;
  subtotal: string;
  deliveryFee: string;
  tax: string;
  total: string;
  currency: string;
  notes: string | null;
  // Snapshotted delivery address
  deliveryAddressLine1: string;
  deliveryAddressLine2: string | null;
  deliveryCity: string;
  deliveryState: string;
  deliveryPostalCode: string;
  deliveryCountry: string;
  deliveryLatitude: string | null;
  deliveryLongitude: string | null;
  paymentId: string | null;
  deliveryId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItemSummary {
  id: string;
  orderId: string;
  productId: string;
  vendorId: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  productName: string;
  productSku: string;
  productImageUrl: string | null;
}

// ============================================================
// PAYMENT DOMAIN TYPES
// ============================================================

export interface PaymentSummary {
  id: string;
  orderId: string;
  customerId: string;
  amount: string;
  currency: string;
  status: PaymentStatus;
  provider: string;
  providerPaymentId: string | null;
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// DELIVERY DOMAIN TYPES
// ============================================================

export interface DeliverySummary {
  id: string;
  orderId: string;
  driverId: string | null;
  status: DeliveryStatus;
  pickupAddress: string;
  deliveryAddress: string;
  estimatedPickupAt: Date | null;
  estimatedDeliveryAt: Date | null;
  pickedUpAt: Date | null;
  deliveredAt: Date | null;
  failedAt: Date | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// NOTIFICATION DOMAIN TYPES
// ============================================================

export interface NotificationSummary {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  status: NotificationStatus;
  data: Record<string, unknown> | null;
  readAt: Date | null;
  createdAt: Date;
}

// ============================================================
// REVIEW DOMAIN TYPES
// ============================================================

export interface ReviewSummary {
  id: string;
  customerId: string;
  vendorId: string;
  orderId: string;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// DASHBOARD / ANALYTICS TYPES
// ============================================================

export interface DashboardMetrics {
  totalOrders: number;
  totalRevenue: string;
  totalCustomers: number;
  totalVendors: number;
  totalDrivers: number;
  pendingOrders: number;
  activeDeliveries: number;
  pendingVendorApplications: number;
  pendingDriverApplications: number;
}

// ============================================================
// PLATFORM SETTING TYPE
// ============================================================

export interface PlatformSettingSummary {
  id: string;
  key: string;
  value: string;
  description: string | null;
  updatedAt: Date;
}
