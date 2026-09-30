import { describe, it, expect } from "vitest";
import { checkRateLimit } from "../rate-limit";

describe("Rate Limiting Middleware", () => {
  it("allows requests under the limit", () => {
    const mockRequest = new Request("http://localhost:3000/api/v1/auth/login", {
      headers: { "x-forwarded-for": "192.168.1.100" },
    });

    const result = checkRateLimit(mockRequest, 10, 60000);
    expect(result.success).toBe(true);
    expect(result.response).toBeUndefined();
  });

  it("blocks requests that exceed limit threshold", () => {
    const ip = "192.168.1.200";
    const limit = 3;

    for (let i = 0; i < limit; i++) {
      const req = new Request("http://localhost:3000/api/v1/checkout", {
        headers: { "x-forwarded-for": ip },
      });
      const res = checkRateLimit(req, limit, 60000);
      expect(res.success).toBe(true);
    }

    // Attempt request exceeding limit
    const blockedReq = new Request("http://localhost:3000/api/v1/checkout", {
      headers: { "x-forwarded-for": ip },
    });
    const blockedRes = checkRateLimit(blockedReq, limit, 60000);
    expect(blockedRes.success).toBe(false);
    expect(blockedRes.response?.status).toBe(429);
  });
});
