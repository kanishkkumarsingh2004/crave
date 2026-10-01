import { describe, it, expect } from "vitest";
import {
  normalizePagination,
  buildPaginationMeta,
  normalizeEmail,
  generateSlug,
  truncate,
  capitalize,
  generateOrderNumber,
  paiseToRupees,
  rupeesToPaise,
  unique,
  groupBy,
  stripUndefined,
  pick,
  isValidEmail,
  isValidIndianPhone,
  haversineDistanceKm,
} from "../index";

describe("Utils Package", () => {
  describe("Pagination", () => {
    it("normalizes pagination with safe defaults", () => {
      const p = normalizePagination({});
      expect(p.page).toBe(1);
      expect(p.limit).toBe(20);
      expect(p.skip).toBe(0);
    });

    it("calculates skip offset correctly", () => {
      const p = normalizePagination({ page: 3, limit: 10 });
      expect(p.page).toBe(3);
      expect(p.limit).toBe(10);
      expect(p.skip).toBe(20);
    });

    it("builds pagination metadata correctly", () => {
      const meta = buildPaginationMeta(2, 10, 45);
      expect(meta.totalPages).toBe(5);
      expect(meta.hasNext).toBe(true);
      expect(meta.hasPrev).toBe(true);
    });
  });

  describe("String Manipulation", () => {
    it("normalizes emails", () => {
      expect(normalizeEmail("  USER@Example.COM  ")).toBe("user@example.com");
    });

    it("generates URL slugs", () => {
      expect(generateSlug("Fresh Organic Apples 1kg!")).toBe("fresh-organic-apples-1kg");
    });

    it("truncates long text", () => {
      expect(truncate("Hello World", 8)).toBe("Hello...");
      expect(truncate("Short", 10)).toBe("Short");
    });

    it("capitalizes text", () => {
      expect(capitalize("PENDING")).toBe("Pending");
    });
  });

  describe("Order Number Generator", () => {
    it("formats sequential number into ORD-000001", () => {
      expect(generateOrderNumber(1)).toBe("ORD-000001");
      expect(generateOrderNumber(1234)).toBe("ORD-001234");
    });
  });

  describe("Monetary Calculations", () => {
    it("converts paise to rupees and vice versa", () => {
      expect(paiseToRupees(4900)).toBe("49.00");
      expect(rupeesToPaise("49.00")).toBe(4900);
      expect(rupeesToPaise(49)).toBe(4900);
    });
  });

  describe("Object & Array Helpers", () => {
    it("deduplicates array values", () => {
      expect(unique([1, 2, 2, 3, 1])).toEqual([1, 2, 3]);
    });

    it("groups array elements by key", () => {
      const data = [
        { category: "fruit", name: "apple" },
        { category: "fruit", name: "banana" },
        { category: "veg", name: "carrot" },
      ];
      const grouped = groupBy(data, "category");
      expect(grouped.fruit.length).toBe(2);
      expect(grouped.veg.length).toBe(1);
    });

    it("strips undefined object properties", () => {
      const cleaned = stripUndefined({ a: 1, b: undefined, c: "test" });
      expect(cleaned).toEqual({ a: 1, c: "test" });
    });

    it("picks specific keys from object", () => {
      const picked = pick({ a: 1, b: 2, c: 3 }, ["a", "c"]);
      expect(picked).toEqual({ a: 1, c: 3 });
    });
  });

  describe("Validators & Distance Math", () => {
    it("validates email and Indian phone numbers", () => {
      expect(isValidEmail("test@domain.com")).toBe(true);
      expect(isValidEmail("invalid")).toBe(false);
      expect(isValidIndianPhone("9876543210")).toBe(true);
      expect(isValidIndianPhone("12345")).toBe(false);
    });

    it("calculates Haversine distance in km between coordinates", () => {
      // Distance between Bangalore (12.9716, 77.5946) and Chennai (13.0827, 80.2707) is ~290 km
      const distance = haversineDistanceKm(12.9716, 77.5946, 13.0827, 80.2707);
      expect(Math.round(distance)).toBeGreaterThan(280);
      expect(Math.round(distance)).toBeLessThan(300);
    });
  });
});
