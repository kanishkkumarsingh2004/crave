import { describe, it, expect } from "vitest";

function calculateOrderPricing(
  items: { unitPrice: number; quantity: number }[],
  estimatedDistanceKm: number = 4.5,
  discount: number = 0,
) {
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  const baseFee = 3.5;
  const perKmRate = 1.25;
  const deliveryFee = Math.round((baseFee + estimatedDistanceKm * perKmRate) * 100) / 100;
  const tax = Math.round(subtotal * 0.05 * 100) / 100;
  const total = Math.round((subtotal + deliveryFee + tax - discount) * 100) / 100;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    deliveryFee,
    tax,
    discount,
    total,
  };
}

describe("Server-Side Order Pricing Engine", () => {
  it("calculates accurate subtotal, delivery fee, 5% tax, and total", () => {
    const items = [
      { unitPrice: 15.0, quantity: 2 }, // 30.00
      { unitPrice: 8.5, quantity: 1 }, // 8.50
    ]; // Subtotal = 38.50

    const pricing = calculateOrderPricing(items, 4.0, 0);
    // Base fee (3.50) + 4.0 * 1.25 = 3.50 + 5.00 = 8.50
    expect(pricing.subtotal).toBe(38.5);
    expect(pricing.deliveryFee).toBe(8.5);
    expect(pricing.tax).toBe(1.93); // 38.50 * 0.05 = 1.925 -> 1.93
    expect(pricing.total).toBe(48.93); // 38.50 + 8.50 + 1.93 = 48.93
  });

  it("applies discounts correctly", () => {
    const items = [{ unitPrice: 100.0, quantity: 1 }];
    const pricing = calculateOrderPricing(items, 2.0, 10.0);

    expect(pricing.subtotal).toBe(100.0);
    expect(pricing.tax).toBe(5.0); // 100 * 0.05
    expect(pricing.deliveryFee).toBe(6.0); // 3.50 + 2.50 = 6.00
    expect(pricing.total).toBe(101.0); // 100 + 6 + 5 - 10 = 101.00
  });
});
