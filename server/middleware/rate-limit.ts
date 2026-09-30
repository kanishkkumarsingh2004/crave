/**
 * Rate Limiting Middleware
 *
 * Sliding-window in-memory rate limiter to prevent API abuse, DDoS,
 * and brute-force attacks on sensitive endpoints (auth, checkout, payment).
 */

type RequestInput = Request;
import { apiError } from "../infrastructure/response";
import { ERROR_CODES } from "@delivery/constants";

interface RateLimitStore {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitStore>();

// Clean up expired IP keys periodically every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [key, value] of rateLimitMap.entries()) {
      if (now > value.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  },
  5 * 60 * 1000,
);

export function checkRateLimit(
  request: RequestInput,
  limit: number = 60,
  windowMs: number = 60 * 1000,
): { success: boolean; response?: Response } {
  const ip =
    request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1";

  const path = new URL(request.url).pathname;
  const key = `${ip}:${path}`;
  const now = Date.now();

  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { success: true };
  }

  if (record.count >= limit) {
    return {
      success: false,
      response: apiError(
        ERROR_CODES.RATE_LIMIT_EXCEEDED,
        "Too many requests. Please try again later.",
        429,
        { retryAfterSeconds: Math.ceil((record.resetTime - now) / 1000) },
      ),
    };
  }

  record.count += 1;
  return { success: true };
}
