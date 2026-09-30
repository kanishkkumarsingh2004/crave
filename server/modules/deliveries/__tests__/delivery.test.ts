import { describe, it, expect } from "vitest";

// Delivery OTP Verification Unit Logic
function verifyDeliveryOtp(
  expectedOtp: string,
  providedOtp: string,
  expiryDate: Date,
): { valid: boolean; reason?: string } {
  if (expectedOtp !== providedOtp) {
    return { valid: false, reason: "Invalid OTP code provided" };
  }
  if (new Date() > expiryDate) {
    return { valid: false, reason: "OTP has expired" };
  }
  return { valid: true };
}

describe("Delivery Dispatch & OTP Verification Engine", () => {
  it("validates correct non-expired OTP", () => {
    const futureExpiry = new Date(Date.now() + 60 * 60 * 1000);
    const result = verifyDeliveryOtp("654321", "654321", futureExpiry);
    expect(result.valid).toBe(true);
  });

  it("rejects mismatched OTP", () => {
    const futureExpiry = new Date(Date.now() + 60 * 60 * 1000);
    const result = verifyDeliveryOtp("654321", "123456", futureExpiry);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("Invalid OTP");
  });

  it("rejects expired OTP", () => {
    const pastExpiry = new Date(Date.now() - 1000);
    const result = verifyDeliveryOtp("654321", "654321", pastExpiry);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("expired");
  });
});
