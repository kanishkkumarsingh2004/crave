/**
 * Customer & Address Service
 *
 * Handles customer profile updates and address CRUD operations.
 */

import { prisma } from "@delivery/database";
import type {
  CreateAddressInput,
  UpdateAddressInput,
  UpdateCustomerProfileInput,
} from "@delivery/validation";

export async function getCustomerProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      image: true,
      createdAt: true,
      customerProfile: {
        select: {
          id: true,
          defaultAddressId: true,
        },
      },
      addresses: {
        orderBy: { isDefault: "desc" },
      },
    },
  });
}

export async function updateCustomerProfile(userId: string, input: UpdateCustomerProfileInput) {
  if (input.name || input.phone) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.phone ? { phone: input.phone } : {}),
      },
    });
  }

  if (input.defaultAddressId !== undefined) {
    await prisma.customerProfile.update({
      where: { userId },
      data: { defaultAddressId: input.defaultAddressId },
    });
  }

  return getCustomerProfile(userId);
}

export async function getCustomerAddresses(userId: string) {
  return prisma.address.findMany({
    where: { userId },
    orderBy: { isDefault: "desc" },
  });
}

export async function createCustomerAddress(userId: string, input: CreateAddressInput) {
  return prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const address = await tx.address.create({
      data: {
        userId,
        label: input.label,
        recipientName: input.recipientName,
        phone: input.phone,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
        country: input.country ?? "IN",
        latitude: input.latitude,
        longitude: input.longitude,
        deliveryInstructions: input.deliveryInstructions,
        isDefault: input.isDefault ?? false,
      },
    });

    if (input.isDefault) {
      await tx.customerProfile.update({
        where: { userId },
        data: { defaultAddressId: address.id },
      });
    }

    return address;
  });
}

export async function updateCustomerAddress(
  userId: string,
  addressId: string,
  input: UpdateAddressInput,
) {
  const existing = await prisma.address.findUnique({
    where: { id: addressId },
    select: { userId: true },
  });

  if (!existing || existing.userId !== userId) {
    throw new Error("Address not found or not owned by user");
  }

  return prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const address = await tx.address.update({
      where: { id: addressId },
      data: input,
    });

    if (input.isDefault) {
      await tx.customerProfile.update({
        where: { userId },
        data: { defaultAddressId: address.id },
      });
    }

    return address;
  });
}

export async function deleteCustomerAddress(userId: string, addressId: string) {
  const existing = await prisma.address.findUnique({
    where: { id: addressId },
    select: { userId: true },
  });

  if (!existing || existing.userId !== userId) {
    throw new Error("Address not found or not owned by user");
  }

  await prisma.address.delete({ where: { id: addressId } });
  return { deleted: true };
}

export async function setDefaultAddress(userId: string, addressId: string) {
  const existing = await prisma.address.findUnique({
    where: { id: addressId },
    select: { userId: true },
  });

  if (!existing || existing.userId !== userId) {
    throw new Error("Address not found or not owned by user");
  }

  return prisma.$transaction(async (tx) => {
    await tx.address.updateMany({
      where: { userId },
      data: { isDefault: false },
    });

    await tx.address.update({
      where: { id: addressId },
      data: { isDefault: true },
    });

    await tx.customerProfile.update({
      where: { userId },
      data: { defaultAddressId: addressId },
    });

    return { success: true };
  });
}
