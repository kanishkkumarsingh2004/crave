import { describe, it, expect } from "vitest";
import {
  generateSecureVerificationCode,
  generateOpaqueQrToken,
  hashVerificationSecret,
  timingSafeCompareSecrets,
} from "../verification";

describe("Delivery Verification Cryptography", () => {
  it("generates 6-digit codes formatted with leading zeroes if needed", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateSecureVerificationCode();
      expect(code).toMatch(/^\d{6}$/);
      expect(code.length).toBe(6);
    }
  });

  it("generates unique opaque QR tokens with del_qr_ prefix", () => {
    const token1 = generateOpaqueQrToken();
    const token2 = generateOpaqueQrToken();

    expect(token1.startsWith("del_qr_")).toBe(true);
    expect(token2.startsWith("del_qr_")).toBe(true);
    expect(token1).not.toBe(token2);
  });

  it("hashes secrets deterministically with SHA-256", () => {
    const secret = "849201";
    const hash1 = hashVerificationSecret(secret);
    const hash2 = hashVerificationSecret(secret);

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 hex length
  });

  it("safely verifies matching and non-matching secrets", () => {
    const secret = "849201";
    const hash = hashVerificationSecret(secret);

    expect(timingSafeCompareSecrets("849201", hash)).toBe(true);
    expect(timingSafeCompareSecrets("000000", hash)).toBe(false);
    expect(timingSafeCompareSecrets("84920", hash)).toBe(false);
  });
});
