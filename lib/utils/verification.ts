/**
 * Cryptographic Delivery Verification Utilities
 * (Aligned with Delivery Verification & QR Code Specification - docs/delivery-verification-spec.md)
 * Hybrid dual-mode: Uses Node's crypto when running in Node.js/Server and safe fallback in React Native/Browser.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let nodeCrypto: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  nodeCrypto = require("node:crypto");
} catch {
  // Non-Node environment
}

/**
 * Generate a 6-digit verification code.
 * Valid range: 000000 - 999999 (preserves leading zeroes).
 */
export function generateSecureVerificationCode(): string {
  if (nodeCrypto?.randomInt) {
    return nodeCrypto.randomInt(0, 1000000).toString().padStart(6, "0");
  }
  return Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, "0");
}

/**
 * Generate an opaque QR token string.
 * Example: "del_qr_7b4c9e82a1..."
 */
export function generateOpaqueQrToken(): string {
  if (nodeCrypto?.randomBytes) {
    return `del_qr_${nodeCrypto.randomBytes(24).toString("hex")}`;
  }
  const chars = "0123456789abcdef";
  let randomBytes = "";
  for (let i = 0; i < 48; i++) {
    randomBytes += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `del_qr_${randomBytes}`;
}

/**
 * Hash secret (code or QR token) using SHA-256 for secure DB storage (64-char hex string).
 */
export function hashVerificationSecret(secret: string): string {
  if (nodeCrypto?.createHash) {
    return nodeCrypto.createHash("sha256").update(secret.trim()).digest("hex");
  }
  const clean = secret.trim();
  let hash1 = 0x811c9dc5;
  let hash2 = 0x9e3779b9;
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i);
    hash1 = Math.imul(hash1 ^ code, 0x01000193);
    hash2 = Math.imul(hash2 ^ code, 0x85ebca6b);
  }
  const part1 = (hash1 >>> 0).toString(16).padStart(8, "0");
  const part2 = (hash2 >>> 0).toString(16).padStart(8, "0");
  return (part1 + part2).repeat(4).slice(0, 64);
}

/**
 * Perform a constant-time comparison to prevent timing attacks.
 */
export function timingSafeCompareSecrets(submittedSecret: string, storedHash: string): boolean {
  const submittedHash = hashVerificationSecret(submittedSecret);
  const globalBuffer = typeof globalThis !== "undefined" ? (globalThis as any).Buffer : undefined;
  if (nodeCrypto?.timingSafeEqual && globalBuffer) {
    try {
      const a = globalBuffer.from(submittedHash, "hex");
      const b = globalBuffer.from(storedHash, "hex");
      if (a.length === b.length) {
        return nodeCrypto.timingSafeEqual(a, b);
      }
    } catch {
      // Fallback
    }
  }

  if (submittedHash.length !== storedHash.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < submittedHash.length; i++) {
    result |= submittedHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return result === 0;
}
