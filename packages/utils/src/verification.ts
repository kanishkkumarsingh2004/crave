/**
 * Cryptographic Delivery Verification Utilities
 * (Aligned with Delivery Verification & QR Code Specification - docs/delivery-verification-spec.md)
 */

import crypto from "crypto";

/**
 * Generate a cryptographically secure 6-digit verification code.
 * Valid range: 000000 - 999999 (preserves leading zeroes).
 */
export function generateSecureVerificationCode(): string {
  const randomUint = crypto.randomInt(0, 1000000);
  return randomUint.toString().padStart(6, "0");
}

/**
 * Generate a cryptographically secure opaque QR token string.
 * Example: "del_qr_7b4c9e82a1..."
 */
export function generateOpaqueQrToken(): string {
  const randomBytes = crypto.randomBytes(24).toString("hex");
  return `del_qr_${randomBytes}`;
}

/**
 * Hash secret (code or QR token) using SHA-256 for secure DB storage.
 */
export function hashVerificationSecret(secret: string): string {
  return crypto.createHash("sha256").update(secret.trim()).digest("hex");
}

/**
 * Perform a constant-time comparison to prevent timing attacks.
 */
export function timingSafeCompareSecrets(submittedSecret: string, storedHash: string): boolean {
  const submittedHash = hashVerificationSecret(submittedSecret);
  const a = Buffer.from(submittedHash, "hex");
  const b = Buffer.from(storedHash, "hex");

  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(a, b);
}
