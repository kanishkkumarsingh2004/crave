/**
 * Cart Service
 *
 * Handles cart management for customers.
 * Enforces key business constraint (Phase 5 §5.4):
 *   - ONE VENDOR PER CART. Attempting to add an item from a different vendor throws CART_VENDOR_CONFLICT error.
 */

import { prisma } from "@delivery/database";
import type { AddCartItemInput, UpdateCartItemInput } from "@delivery/validation";

async function getCustomerId(userId: string): Promise<string> {
  const profile = await prisma.customerProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!profile) {
    const newProfile = await prisma.customerProfile.create({
      data: { userId },
      select: { id: true },
    });
    return newProfile.id;
  }
  return profile.id;
}

export async function getOrCreateCart(userId: string) {
  const customerId = await getCustomerId(userId);

  let cart = await prisma.cart.findUnique({
    where: { customerId },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              price: true,
              imageUrl: true,
              vendorId: true,
              vendor: { select: { id: true, storeName: true, isOpen: true, status: true } },
              inventory: { select: { onHand: true, reserved: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { customerId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                imageUrl: true,
                vendorId: true,
                vendor: { select: { id: true, storeName: true, isOpen: true, status: true } },
                inventory: { select: { onHand: true, reserved: true } },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  }

  // Calculate cart subtotal server-side
  const items = cart.items.map((item) => ({
    id: item.id,
    productId: item.productId,
    quantity: item.quantity,
    price: Number(item.product.price),
    itemTotal: Number(item.product.price) * item.quantity,
    product: item.product,
  }));

  const subtotal = items.reduce((sum, item) => sum + item.itemTotal, 0);
  const vendorId = items[0]?.product.vendorId ?? null;

  return {
    id: cart.id,
    customerId: cart.customerId,
    vendorId,
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal,
  };
}

export async function addItemToCart(userId: string, input: AddCartItemInput) {
  const customerId = await getCustomerId(userId);

  // 1. Fetch product & vendor info
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: { id: true, vendorId: true, status: true, price: true },
  });

  if (!product || product.status !== "ACTIVE") {
    throw new Error("Product is unavailable or inactive");
  }

  // 2. Fetch or create cart
  let cart = await prisma.cart.findUnique({
    where: { customerId },
    include: {
      items: {
        select: {
          id: true,
          productId: true,
          quantity: true,
          product: { select: { vendorId: true } },
        },
      },
    },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { customerId },
      include: {
        items: {
          select: {
            id: true,
            productId: true,
            quantity: true,
            product: { select: { vendorId: true } },
          },
        },
      },
    });
  }

  // 3. Enforce Single Vendor per Cart constraint
  const existingVendorId = cart.items[0]?.product.vendorId;
  if (existingVendorId && existingVendorId !== product.vendorId) {
    const err = new Error(
      "Your cart contains items from a different store. Clear cart to add items from this store.",
    );
    (err as Error & { code?: string }).code = "CART_VENDOR_CONFLICT";
    throw err;
  }

  // 4. Upsert item quantity
  const existingItem = cart.items.find((i) => i.productId === input.productId);

  if (existingItem) {
    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: existingItem.quantity + input.quantity },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: input.productId,
        quantity: input.quantity,
      },
    });
  }

  return getOrCreateCart(userId);
}

export async function updateCartItemQuantity(
  userId: string,
  itemId: string,
  input: UpdateCartItemInput,
) {
  const customerId = await getCustomerId(userId);

  const cart = await prisma.cart.findUnique({
    where: { customerId },
    select: { id: true },
  });

  if (!cart) throw new Error("Cart not found");

  const item = await prisma.cartItem.findUnique({
    where: { id: itemId },
    select: { cartId: true },
  });

  if (!item || item.cartId !== cart.id) {
    throw new Error("Cart item not found");
  }

  if (input.quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: itemId } });
  } else {
    await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: input.quantity },
    });
  }

  return getOrCreateCart(userId);
}

export async function removeCartItem(userId: string, itemId: string) {
  const customerId = await getCustomerId(userId);

  const cart = await prisma.cart.findUnique({
    where: { customerId },
    select: { id: true },
  });

  if (!cart) throw new Error("Cart not found");

  const item = await prisma.cartItem.findUnique({
    where: { id: itemId },
    select: { cartId: true },
  });

  if (!item || item.cartId !== cart.id) {
    throw new Error("Cart item not found");
  }

  await prisma.cartItem.delete({ where: { id: itemId } });
  return getOrCreateCart(userId);
}

export async function clearCart(userId: string) {
  const customerId = await getCustomerId(userId);

  const cart = await prisma.cart.findUnique({
    where: { customerId },
    select: { id: true },
  });

  if (cart) {
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });
  }

  return getOrCreateCart(userId);
}
