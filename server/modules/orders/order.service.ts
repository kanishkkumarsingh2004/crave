/**
 * Order & Checkout Transaction Engine
 *
 * Implements server-side price calculation, atomic checkout transaction,
 * state-aware order cancellation, and customer order history.
 *
 * spec: Phase 5 §5.6, §5.7
 */

import {
  prisma,
  OrderStatus,
  PaymentStatus,
  DeliveryStatus,
  VendorStatus,
} from "@delivery/database";
import type { CreateOrderInput, CancelOrderInput, OrderListQuery } from "@delivery/validation";
import { reserveInventory, releaseReservedInventory } from "../inventory";
import { getOrCreateCart, clearCart } from "../cart";

export async function processCheckout(userId: string, input: CreateOrderInput) {
  // 1. Fetch customer profile
  const customer = await prisma.customerProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!customer) throw new Error("Customer profile not found");

  // 2. Fetch selected address
  const address = await prisma.address.findUnique({
    where: { id: input.addressId },
  });

  if (!address || address.userId !== userId) {
    throw new Error("Invalid or unowned delivery address");
  }

  // 3. Fetch cart & items
  const cart = await getOrCreateCart(userId);
  if (cart.items.length === 0) {
    throw new Error("Your cart is empty");
  }

  const vendorId = cart.vendorId;
  if (!vendorId) throw new Error("Cart vendor ID missing");

  // 4. Validate vendor is ACTIVE and OPEN
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: {
      id: true,
      storeName: true,
      status: true,
      isOpen: true,
      address: true,
      city: true,
      state: true,
    },
  });

  if (!vendor || vendor.status !== VendorStatus.APPROVED) {
    throw new Error("Vendor is currently not active or approved");
  }

  if (!vendor.isOpen) {
    throw new Error(`Store "${vendor.storeName}" is currently closed`);
  }

  // 5. Calculate Server-Side Pricing
  const subtotal = cart.subtotal;

  // Platform setting defaults or dynamic calculation
  const baseFee = 3.5;
  const perKmRate = 1.25;
  const estimatedDistanceKm = 4.5; // default estimate
  const deliveryFee = Math.round((baseFee + estimatedDistanceKm * perKmRate) * 100) / 100;
  const tax = Math.round(subtotal * 0.05 * 100) / 100; // 5% tax
  const total = Math.round((subtotal + deliveryFee + tax) * 100) / 100;

  const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

  // 6. DB Transaction — Atomic Order Creation
  return prisma.$transaction(async (tx) => {
    // A. Reserve Inventory
    await reserveInventory(
      cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      tx,
    );

    // B. Create Order
    const order = await tx.order.create({
      data: {
        orderNumber,
        customerId: customer.id,
        vendorId,
        status: OrderStatus.PENDING,
        subtotal,
        deliveryFee,
        tax,
        discount: 0,
        total,
        deliveryRecipientName: address.recipientName,
        deliveryPhone: address.phone,
        deliveryAddressLine1: address.addressLine1,
        deliveryAddressLine2: address.addressLine2,
        deliveryCity: address.city,
        deliveryState: address.state,
        deliveryPostalCode: address.postalCode,
        deliveryCountry: address.country ?? "IN",
        deliveryLatitude: address.latitude,
        deliveryLongitude: address.longitude,
        deliveryInstructions: address.deliveryInstructions,
        notes: input.notes,
      },
    });

    // C. Create OrderItems (snapshot price)
    await tx.orderItem.createMany({
      data: cart.items.map((i) => ({
        orderId: order.id,
        productId: i.productId,
        productName: i.product.name,
        sku: i.product.sku ?? "N/A",
        unitPrice: i.price,
        quantity: i.quantity,
        lineTotal: i.itemTotal,
        imageUrl: i.product.imageUrl,
      })),
    });

    // D. Create Payment record (PENDING)
    const payment = await tx.payment.create({
      data: {
        orderId: order.id,
        customerId: customer.id,
        amount: total,
        currency: "INR",
        provider: "stripe",
        status: PaymentStatus.PENDING,
      },
    });

    // E. Create Delivery record (PENDING)
    const delivery = await tx.delivery.create({
      data: {
        orderId: order.id,
        status: DeliveryStatus.PENDING,
        pickupAddress: `${vendor.storeName}, ${vendor.address ?? ""}, ${vendor.city ?? ""}`,
        deliveryAddress: `${address.addressLine1}, ${address.city}`,
      },
    });

    // F. Clear Customer Cart
    await tx.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: order.total,
      status: order.status,
      paymentId: payment.id,
      deliveryId: delivery.id,
      createdAt: order.createdAt,
    };
  });
}

export async function getCustomerOrders(userId: string, query: OrderListQuery) {
  const customer = await prisma.customerProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!customer) throw new Error("Customer profile not found");

  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    customerId: customer.id,
  };

  if (query.status) where.status = query.status;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        vendor: { select: { id: true, storeName: true, logoUrl: true } },
        items: true,
        delivery: { select: { id: true, status: true, driverId: true } },
        payment: { select: { id: true, status: true, amount: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    orders,
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

export async function getCustomerOrderById(userId: string, orderId: string) {
  const customer = await prisma.customerProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!customer) throw new Error("Customer profile not found");

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      vendor: { select: { id: true, storeName: true, phone: true } },
      items: true,
      delivery: {
        include: {
          driver: {
            include: {
              user: { select: { name: true, phone: true } },
            },
          },
        },
      },
      payment: true,
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!order || order.customerId !== customer.id) {
    throw new Error("Order not found or not owned by customer");
  }

  return order;
}

export async function cancelCustomerOrder(
  userId: string,
  orderId: string,
  input: CancelOrderInput,
) {
  const customer = await prisma.customerProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!customer) throw new Error("Customer profile not found");

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
    },
  });

  if (!order || order.customerId !== customer.id) {
    throw new Error("Order not found or not owned by customer");
  }

  // State-aware cancellation check (Phase 5 §5.7)
  // Allowed from PENDING or CONFIRMED state ONLY. Restricted once PREPARING / PICKED_UP
  const cancellableStatuses: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.CONFIRMED];
  if (!cancellableStatuses.includes(order.status as OrderStatus)) {
    throw new Error(
      `Order cannot be cancelled in status "${order.status}". Please contact support.`,
    );
  }

  return prisma.$transaction(async (tx) => {
    // 1. Release reserved inventory
    await releaseReservedInventory(
      order.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      tx,
    );

    // 2. Update order status
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CANCELLED,
        cancellationReason: input.reason,
        cancelledAt: new Date(),
      },
    });

    // 3. Update delivery status if exists
    await tx.delivery.updateMany({
      where: { orderId },
      data: { status: DeliveryStatus.CANCELLED },
    });

    // 4. Update payment status if exists
    await tx.payment.updateMany({
      where: { orderId },
      data: { status: PaymentStatus.CANCELLED },
    });

    return updatedOrder;
  });
}
