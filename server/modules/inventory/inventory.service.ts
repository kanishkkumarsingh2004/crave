/**
 * Inventory Service
 *
 * Handles inventory queries, updates, transactional reservations, and release rules.
 * Business rules (Phase 4):
 *   - available = onHand - reserved
 *   - onHand >= 0, reserved >= 0, reserved <= onHand
 */

import { prisma } from "@delivery/database";

export async function getVendorInventory(vendorId: string) {
  return prisma.inventory.findMany({
    where: {
      product: { vendorId },
    },
    include: {
      product: { select: { id: true, name: true, sku: true, status: true, price: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function updateProductStock(
  productId: string,
  vendorId: string,
  input: { quantity: number; lowStockThreshold?: number },
) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { vendorId: true },
  });

  if (!product || product.vendorId !== vendorId) {
    throw new Error("Product not found or not owned by vendor");
  }

  return prisma.inventory.update({
    where: { productId },
    data: {
      onHand: input.quantity,
      ...(input.lowStockThreshold !== undefined
        ? { lowStockThreshold: input.lowStockThreshold }
        : {}),
    },
  });
}

/**
 * Reserve inventory for order checkout atomically.
 * Returns true if all requested items are reserved, throws Error if insufficient stock.
 */
type TransactionDb = Parameters<Parameters<(typeof prisma)["$transaction"]>[0]>[0] | typeof prisma;

export async function reserveInventory(
  items: Array<{ productId: string; quantity: number }>,
  txPrisma?: TransactionDb,
) {
  const db = txPrisma ?? prisma;

  for (const item of items) {
    const inv = await db.inventory.findUnique({
      where: { productId: item.productId },
      select: { onHand: true, reserved: true },
    });

    if (!inv) throw new Error(`Inventory record not found for product ${item.productId}`);

    const available = inv.onHand - inv.reserved;
    if (available < item.quantity) {
      throw new Error(
        `Insufficient stock for product. Requested: ${item.quantity}, Available: ${available}`,
      );
    }

    await db.inventory.update({
      where: { productId: item.productId },
      data: {
        reserved: { increment: item.quantity },
      },
    });
  }

  return true;
}

/**
 * Release reserved inventory (e.g. on order cancellation or failed payment).
 */
export async function releaseReservedInventory(
  items: Array<{ productId: string; quantity: number }>,
  txPrisma?: TransactionDb,
) {
  const db = txPrisma ?? prisma;

  for (const item of items) {
    await db.inventory.update({
      where: { productId: item.productId },
      data: {
        reserved: { decrement: item.quantity },
      },
    });
  }

  return true;
}

/**
 * Commit inventory reservation (deduct from onHand and reserved when order paid/confirmed).
 */
export async function commitInventoryReservation(
  items: Array<{ productId: string; quantity: number }>,
  txPrisma?: TransactionDb,
) {
  const db = txPrisma ?? prisma;

  for (const item of items) {
    await db.inventory.update({
      where: { productId: item.productId },
      data: {
        onHand: { decrement: item.quantity },
        reserved: { decrement: item.quantity },
      },
    });
  }

  return true;
}
