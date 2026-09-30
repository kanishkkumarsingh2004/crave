import { describe, it, expect } from "vitest";
import {
  zSignUpCustomer,
  zCreateOrder,
  zUpdateDriverAvailability,
  zUpdateDriverLocation,
  zCancelOrder,
} from "../index";
import { DriverAvailability } from "@delivery/types";

describe("Validation Schemas", () => {
  describe("zSignUpCustomer", () => {
    it("validates correct customer sign up data", () => {
      const result = zSignUpCustomer.safeParse({
        name: "John Doe",
        email: "john@example.com",
        password: "securepassword123",
        phone: "9876543210",
      });
      expect(result.success).toBe(true);
    });

    it("fails on invalid email format", () => {
      const result = zSignUpCustomer.safeParse({
        name: "John Doe",
        email: "not-an-email",
        password: "securepassword123",
      });
      expect(result.success).toBe(false);
    });

    it("fails on short password", () => {
      const result = zSignUpCustomer.safeParse({
        name: "John Doe",
        email: "john@example.com",
        password: "short",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("zCreateOrder", () => {
    it("validates valid order creation payload", () => {
      const result = zCreateOrder.safeParse({
        addressId: "clx1234567890abcdef12345",
        notes: "Ring the doorbell",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("zUpdateDriverAvailability", () => {
    it("accepts valid availability status", () => {
      const result = zUpdateDriverAvailability.safeParse({
        availability: DriverAvailability.AVAILABLE,
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid availability status string", () => {
      const result = zUpdateDriverAvailability.safeParse({
        availability: "UNKNOWN_STATUS",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("zUpdateDriverLocation", () => {
    it("validates valid latitude and longitude coordinates", () => {
      const result = zUpdateDriverLocation.safeParse({
        latitude: 12.9716,
        longitude: 77.5946,
        heading: 90,
        speed: 25.5,
      });
      expect(result.success).toBe(true);
    });

    it("rejects out-of-bound coordinates", () => {
      const result = zUpdateDriverLocation.safeParse({
        latitude: 190.0,
        longitude: 77.5946,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("zCancelOrder", () => {
    it("validates valid cancellation reason", () => {
      const result = zCancelOrder.safeParse({
        reason: "Ordered by mistake",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty cancellation reason", () => {
      const result = zCancelOrder.safeParse({
        reason: "",
      });
      expect(result.success).toBe(false);
    });
  });
});
