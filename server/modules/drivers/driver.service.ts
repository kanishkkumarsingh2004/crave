/**
 * Driver Module Service
 *
 * Handles driver profile, availability toggle, active delivery tracking,
 * delivery history, and live location updates.
 */

import { prisma, DriverAvailability, DriverStatus, DeliveryStatus } from "@delivery/database";

// Helper to resolve driver record by authenticated userId
export async function getDriverByUserId(userId: string) {
  const driver = await prisma.driver.findUnique({
    where: { userId },
  });
  if (!driver) {
    throw new Error("Driver profile not found for current user");
  }
  return driver;
}

// ============================================================
// PROFILE & AVAILABILITY
// ============================================================

export async function getDriverProfile(userId: string) {
  const driver = await getDriverByUserId(userId);
  const activeDelivery = await prisma.delivery.findFirst({
    where: {
      driverId: driver.id,
      status: {
        in: [
          DeliveryStatus.ASSIGNED,
          DeliveryStatus.DRIVER_ACCEPTED,
          DeliveryStatus.PICKUP_READY,
          DeliveryStatus.PICKED_UP,
          DeliveryStatus.IN_TRANSIT,
          DeliveryStatus.ARRIVING,
        ],
      },
    },
  });

  return {
    ...driver,
    hasActiveDelivery: !!activeDelivery,
    activeDeliveryId: activeDelivery?.id || null,
  };
}

export async function updateDriverAvailability(userId: string, availability: DriverAvailability) {
  const driver = await getDriverByUserId(userId);

  // If driver tries to go OFFLINE, verify no active delivery
  if (availability === DriverAvailability.OFFLINE) {
    const activeDelivery = await prisma.delivery.findFirst({
      where: {
        driverId: driver.id,
        status: {
          in: [
            DeliveryStatus.ASSIGNED,
            DeliveryStatus.DRIVER_ACCEPTED,
            DeliveryStatus.PICKUP_READY,
            DeliveryStatus.PICKED_UP,
            DeliveryStatus.IN_TRANSIT,
            DeliveryStatus.ARRIVING,
          ],
        },
      },
    });

    if (activeDelivery) {
      throw new Error("Cannot go offline while having an active delivery in progress");
    }
  }

  // Allow setting AVAILABLE only if driver status is APPROVED or ACTIVE
  if (availability === DriverAvailability.AVAILABLE) {
    if (driver.status !== DriverStatus.APPROVED && driver.status !== DriverStatus.ACTIVE) {
      throw new Error(`Cannot set available when driver account status is ${driver.status}`);
    }
  }

  return prisma.driver.update({
    where: { id: driver.id },
    data: { availability },
    select: {
      id: true,
      status: true,
      availability: true,
      updatedAt: true,
    },
  });
}

// ============================================================
// ACTIVE DELIVERY & HISTORY
// ============================================================

export async function getDriverActiveDelivery(userId: string) {
  const driver = await getDriverByUserId(userId);

  const delivery = await prisma.delivery.findFirst({
    where: {
      driverId: driver.id,
      status: {
        in: [
          DeliveryStatus.ASSIGNED,
          DeliveryStatus.DRIVER_ACCEPTED,
          DeliveryStatus.PICKUP_READY,
          DeliveryStatus.PICKED_UP,
          DeliveryStatus.IN_TRANSIT,
          DeliveryStatus.ARRIVING,
        ],
      },
    },
    include: {
      order: {
        include: {
          vendor: {
            select: {
              id: true,
              storeName: true,
              phone: true,
              address: true,
              latitude: true,
              longitude: true,
            },
          },
          items: true,
        },
      },
      verifications: true,
    },
  });

  return delivery;
}

export async function getDriverDeliveryHistory(
  userId: string,
  page: number = 1,
  limit: number = 10,
) {
  const driver = await getDriverByUserId(userId);
  const skip = (page - 1) * limit;

  const [deliveries, total] = await Promise.all([
    prisma.delivery.findMany({
      where: {
        driverId: driver.id,
        status: {
          in: [DeliveryStatus.DELIVERED, DeliveryStatus.FAILED, DeliveryStatus.CANCELLED],
        },
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            total: true,
            currency: true,
            deliveryRecipientName: true,
            deliveryAddressLine1: true,
            deliveryCity: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.delivery.count({
      where: {
        driverId: driver.id,
        status: {
          in: [DeliveryStatus.DELIVERED, DeliveryStatus.FAILED, DeliveryStatus.CANCELLED],
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data: deliveries,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

// ============================================================
// LIVE LOCATION UPDATES
// ============================================================

export async function recordDriverLocation(
  userId: string,
  data: {
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
    accuracy?: number;
  },
) {
  const driver = await getDriverByUserId(userId);

  // Find current active delivery (if any)
  const activeDelivery = await prisma.delivery.findFirst({
    where: {
      driverId: driver.id,
      status: {
        in: [
          DeliveryStatus.ASSIGNED,
          DeliveryStatus.DRIVER_ACCEPTED,
          DeliveryStatus.PICKUP_READY,
          DeliveryStatus.PICKED_UP,
          DeliveryStatus.IN_TRANSIT,
          DeliveryStatus.ARRIVING,
        ],
      },
    },
  });

  return prisma.driverLocation.create({
    data: {
      driverId: driver.id,
      deliveryId: activeDelivery?.id || null,
      latitude: data.latitude,
      longitude: data.longitude,
      heading: data.heading,
      speed: data.speed,
      accuracy: data.accuracy,
    },
  });
}
