/**
 * Delivery Dispatch & Workflow Service
 *
 * Handles automated driver assignment, delivery status transitions
 * (ACCEPT, REJECT, ARRIVED_PICKUP, PICKUP, START_TRANSIT, ARRIVING, COMPLETE),
 * OTP verification, and status history tracking.
 */

import {
  prisma,
  DeliveryStatus,
  OrderStatus,
  DriverAvailability,
  DriverAssignmentStatus,
  DeliveryVerificationType,
  DeliveryVerificationStatus,
} from "@delivery/database";
import { getDriverByUserId } from "../drivers/driver.service";

// Helper to generate secure 6-digit numeric OTP
function generateDeliveryOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ============================================================
// DISPATCH ENGINE & ASSIGNMENT
// ============================================================

export async function dispatchDelivery(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      vendor: true,
      delivery: true,
    },
  });

  if (!order) {
    throw new Error("Order not found for delivery dispatch");
  }

  // Format vendor address
  const pickupAddress = [
    order.vendor.address,
    order.vendor.city,
    order.vendor.state,
    order.vendor.postalCode,
  ]
    .filter(Boolean)
    .join(", ");

  // Format delivery address
  const deliveryAddress = [
    order.deliveryAddressLine1,
    order.deliveryAddressLine2,
    order.deliveryCity,
    order.deliveryState,
    order.deliveryPostalCode,
  ]
    .filter(Boolean)
    .join(", ");

  const otp = generateDeliveryOtp();
  const otpExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours expiry

  // Upsert delivery record
  let delivery = order.delivery;
  if (!delivery) {
    delivery = await prisma.delivery.create({
      data: {
        orderId: order.id,
        status: DeliveryStatus.ASSIGNING,
        pickupAddress,
        pickupLatitude: order.vendor.latitude,
        pickupLongitude: order.vendor.longitude,
        deliveryAddress,
        deliveryLatitude: order.deliveryLatitude,
        deliveryLongitude: order.deliveryLongitude,
        deliveryOtp: otp,
        deliveryOtpExpiry: otpExpiry,
      },
    });
  }

  // Attempt auto-assign to an AVAILABLE active driver
  const availableDriver = await prisma.driver.findFirst({
    where: {
      status: { in: ["APPROVED", "ACTIVE"] },
      availability: DriverAvailability.AVAILABLE,
    },
    orderBy: { updatedAt: "asc" }, // Simple round-robin selection
  });

  if (availableDriver) {
    // Create DriverAssignment entry
    const assignmentExpiresAt = new Date(Date.now() + 60 * 1000); // 60 seconds offer window

    await prisma.$transaction([
      prisma.driverAssignment.create({
        data: {
          deliveryId: delivery.id,
          driverId: availableDriver.id,
          status: DriverAssignmentStatus.OFFERED,
          expiresAt: assignmentExpiresAt,
        },
      }),
      prisma.driver.update({
        where: { id: availableDriver.id },
        data: { availability: DriverAvailability.BUSY },
      }),
      prisma.delivery.update({
        where: { id: delivery.id },
        data: {
          driverId: availableDriver.id,
          status: DeliveryStatus.ASSIGNING,
          assignedAt: new Date(),
        },
      }),
      prisma.deliveryStatusHistory.create({
        data: {
          deliveryId: delivery.id,
          fromStatus: delivery.status,
          toStatus: DeliveryStatus.ASSIGNING,
          reason: `Delivery offered to driver ${availableDriver.id}`,
        },
      }),
    ]);
  }

  return prisma.delivery.findUnique({
    where: { id: delivery.id },
    include: {
      driver: {
        select: {
          id: true,
          phone: true,
          vehicleType: true,
          vehicleNumber: true,
          rating: true,
        },
      },
      assignments: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
}

// ============================================================
// WORKFLOW ACTIONS
// ============================================================

export async function acceptDelivery(userId: string, deliveryId: string) {
  const driver = await getDriverByUserId(userId);
  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
  });

  if (!delivery) {
    throw new Error("Delivery record not found");
  }

  if (delivery.driverId !== driver.id) {
    throw new Error("You are not assigned to this delivery");
  }

  // Find active assignment offer
  const assignment = await prisma.driverAssignment.findFirst({
    where: {
      deliveryId,
      driverId: driver.id,
      status: DriverAssignmentStatus.OFFERED,
    },
  });

  const now = new Date();

  await prisma.$transaction([
    ...(assignment
      ? [
          prisma.driverAssignment.update({
            where: { id: assignment.id },
            data: {
              status: DriverAssignmentStatus.ACCEPTED,
              acceptedAt: now,
            },
          }),
        ]
      : []),
    prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        status: DeliveryStatus.DRIVER_ACCEPTED,
        acceptedAt: now,
      },
    }),
    prisma.deliveryStatusHistory.create({
      data: {
        deliveryId,
        fromStatus: delivery.status,
        toStatus: DeliveryStatus.DRIVER_ACCEPTED,
        actorId: driver.id,
        actorRole: "DRIVER",
        reason: "Driver accepted delivery request",
      },
    }),
  ]);

  return prisma.delivery.findUnique({
    where: { id: deliveryId },
    include: { order: true },
  });
}

export async function rejectDelivery(userId: string, deliveryId: string, reason?: string) {
  const driver = await getDriverByUserId(userId);
  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
  });

  if (!delivery) {
    throw new Error("Delivery record not found");
  }

  const assignment = await prisma.driverAssignment.findFirst({
    where: {
      deliveryId,
      driverId: driver.id,
      status: DriverAssignmentStatus.OFFERED,
    },
  });

  const now = new Date();

  await prisma.$transaction([
    ...(assignment
      ? [
          prisma.driverAssignment.update({
            where: { id: assignment.id },
            data: {
              status: DriverAssignmentStatus.REJECTED,
              rejectedAt: now,
              endedAt: now,
            },
          }),
        ]
      : []),
    // Free up the driver
    prisma.driver.update({
      where: { id: driver.id },
      data: { availability: DriverAvailability.AVAILABLE },
    }),
    // Reset delivery driver link and set back to ASSIGNING
    prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        driverId: null,
        status: DeliveryStatus.ASSIGNING,
      },
    }),
    prisma.deliveryStatusHistory.create({
      data: {
        deliveryId,
        fromStatus: delivery.status,
        toStatus: DeliveryStatus.ASSIGNING,
        actorId: driver.id,
        actorRole: "DRIVER",
        reason: reason || "Driver rejected delivery assignment offer",
      },
    }),
  ]);

  // Attempt auto-redispatch to next available driver
  return dispatchDelivery(delivery.orderId);
}

export async function arrivedAtPickup(userId: string, deliveryId: string) {
  const driver = await getDriverByUserId(userId);
  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
  });

  if (!delivery) {
    throw new Error("Delivery record not found");
  }

  if (delivery.driverId !== driver.id) {
    throw new Error("You are not assigned to this delivery");
  }

  const updated = await prisma.$transaction([
    prisma.delivery.update({
      where: { id: deliveryId },
      data: { status: DeliveryStatus.PICKUP_READY },
    }),
    prisma.deliveryStatusHistory.create({
      data: {
        deliveryId,
        fromStatus: delivery.status,
        toStatus: DeliveryStatus.PICKUP_READY,
        actorId: driver.id,
        actorRole: "DRIVER",
        reason: "Driver arrived at vendor pickup location",
      },
    }),
  ]);

  return updated[0];
}

export async function pickupOrder(userId: string, deliveryId: string) {
  const driver = await getDriverByUserId(userId);
  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
  });

  if (!delivery) {
    throw new Error("Delivery record not found");
  }

  if (delivery.driverId !== driver.id) {
    throw new Error("You are not assigned to this delivery");
  }

  const now = new Date();

  await prisma.$transaction([
    prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        status: DeliveryStatus.PICKED_UP,
        pickedUpAt: now,
      },
    }),
    prisma.order.update({
      where: { id: delivery.orderId },
      data: {
        status: OrderStatus.PICKED_UP,
        pickedUpAt: now,
      },
    }),
    prisma.orderStatusHistory.create({
      data: {
        orderId: delivery.orderId,
        fromStatus: OrderStatus.READY_FOR_PICKUP,
        toStatus: OrderStatus.PICKED_UP,
        actorId: driver.id,
        actorRole: "DRIVER",
        reason: "Driver picked up package from vendor",
      },
    }),
    prisma.deliveryStatusHistory.create({
      data: {
        deliveryId,
        fromStatus: delivery.status,
        toStatus: DeliveryStatus.PICKED_UP,
        actorId: driver.id,
        actorRole: "DRIVER",
        reason: "Driver verified and collected package",
      },
    }),
  ]);

  return prisma.delivery.findUnique({
    where: { id: deliveryId },
    include: { order: true },
  });
}

export async function startTransit(userId: string, deliveryId: string) {
  const driver = await getDriverByUserId(userId);
  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
  });

  if (!delivery) {
    throw new Error("Delivery record not found");
  }

  if (delivery.driverId !== driver.id) {
    throw new Error("You are not assigned to this delivery");
  }

  const now = new Date();

  await prisma.$transaction([
    prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        status: DeliveryStatus.IN_TRANSIT,
        startedAt: now,
      },
    }),
    prisma.order.update({
      where: { id: delivery.orderId },
      data: { status: OrderStatus.OUT_FOR_DELIVERY },
    }),
    prisma.orderStatusHistory.create({
      data: {
        orderId: delivery.orderId,
        fromStatus: OrderStatus.PICKED_UP,
        toStatus: OrderStatus.OUT_FOR_DELIVERY,
        actorId: driver.id,
        actorRole: "DRIVER",
        reason: "Driver started transit towards customer destination",
      },
    }),
    prisma.deliveryStatusHistory.create({
      data: {
        deliveryId,
        fromStatus: delivery.status,
        toStatus: DeliveryStatus.IN_TRANSIT,
        actorId: driver.id,
        actorRole: "DRIVER",
        reason: "En route to delivery address",
      },
    }),
  ]);

  return prisma.delivery.findUnique({
    where: { id: deliveryId },
    include: { order: true },
  });
}

export async function arrivingAtCustomer(userId: string, deliveryId: string) {
  const driver = await getDriverByUserId(userId);
  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
  });

  if (!delivery) {
    throw new Error("Delivery record not found");
  }

  if (delivery.driverId !== driver.id) {
    throw new Error("You are not assigned to this delivery");
  }

  const now = new Date();

  const updated = await prisma.$transaction([
    prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        status: DeliveryStatus.ARRIVING,
        arrivingAt: now,
      },
    }),
    prisma.deliveryStatusHistory.create({
      data: {
        deliveryId,
        fromStatus: delivery.status,
        toStatus: DeliveryStatus.ARRIVING,
        actorId: driver.id,
        actorRole: "DRIVER",
        reason: "Driver is arriving at delivery location",
      },
    }),
  ]);

  return updated[0];
}

export async function completeDelivery(userId: string, deliveryId: string, otp: string) {
  const driver = await getDriverByUserId(userId);
  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
  });

  if (!delivery) {
    throw new Error("Delivery record not found");
  }

  if (delivery.driverId !== driver.id) {
    throw new Error("You are not assigned to this delivery");
  }

  // Validate OTP
  if (!delivery.deliveryOtp || delivery.deliveryOtp !== otp) {
    throw new Error("Invalid delivery OTP. Please verify OTP with customer.");
  }

  if (delivery.deliveryOtpExpiry && new Date() > delivery.deliveryOtpExpiry) {
    throw new Error("Delivery OTP has expired. Please request a new OTP.");
  }

  const now = new Date();

  // Complete delivery atomic transaction
  await prisma.$transaction([
    // Update delivery status
    prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        status: DeliveryStatus.DELIVERED,
        deliveredAt: now,
      },
    }),
    // Update order status
    prisma.order.update({
      where: { id: delivery.orderId },
      data: {
        status: OrderStatus.DELIVERED,
        deliveredAt: now,
      },
    }),
    // Release driver availability and increment total deliveries count
    prisma.driver.update({
      where: { id: driver.id },
      data: {
        availability: DriverAvailability.AVAILABLE,
        totalDeliveries: { increment: 1 },
      },
    }),
    // Mark driver assignment completed
    prisma.driverAssignment.updateMany({
      where: {
        deliveryId,
        driverId: driver.id,
        status: DriverAssignmentStatus.ACCEPTED,
      },
      data: {
        status: DriverAssignmentStatus.COMPLETED,
        endedAt: now,
      },
    }),
    // Record OTP verification
    prisma.deliveryVerification.create({
      data: {
        deliveryId,
        type: DeliveryVerificationType.OTP,
        status: DeliveryVerificationStatus.VERIFIED,
        verifiedBy: driver.id,
        metadata: { verifiedAt: now.toISOString() },
      },
    }),
    // Log history
    prisma.orderStatusHistory.create({
      data: {
        orderId: delivery.orderId,
        fromStatus: OrderStatus.OUT_FOR_DELIVERY,
        toStatus: OrderStatus.DELIVERED,
        actorId: driver.id,
        actorRole: "DRIVER",
        reason: "Delivery successfully completed with valid customer OTP",
      },
    }),
    prisma.deliveryStatusHistory.create({
      data: {
        deliveryId,
        fromStatus: delivery.status,
        toStatus: DeliveryStatus.DELIVERED,
        actorId: driver.id,
        actorRole: "DRIVER",
        reason: "Handed over package to customer after OTP verification",
      },
    }),
  ]);

  return prisma.delivery.findUnique({
    where: { id: deliveryId },
    include: {
      order: true,
      verifications: true,
    },
  });
}

export async function getDeliveryById(deliveryId: string) {
  return prisma.delivery.findUnique({
    where: { id: deliveryId },
    include: {
      order: {
        include: {
          vendor: true,
          items: true,
        },
      },
      driver: true,
      verifications: true,
      statusHistory: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}
