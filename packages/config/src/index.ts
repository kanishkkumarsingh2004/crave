/**
 * @delivery/config
 *
 * Validated environment configuration using Zod.
 * Import env from this package instead of process.env directly.
 *
 * Usage:
 *   import { env } from "@delivery/config"
 *   const dbUrl = env.DATABASE_URL;
 */

declare const process: any;
declare const console: any;

import { z } from "zod";

// ============================================================
// SERVER ENV SCHEMA
// ============================================================

const serverEnvSchema = z.object({
  // ---- Database ----
  DATABASE_URL: z
    .string()
    .url("DATABASE_URL must be a valid URL")
    .default(
      "postgresql://postgres:postgrespassword@localhost:5432/delivery_platform?schema=public",
    ),
  DIRECT_DATABASE_URL: z.string().url("DIRECT_DATABASE_URL must be a valid URL").optional(),

  // ---- Better Auth ----
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters")
    .default("supersecret32characterlongstringforbetterauth!"),
  BETTER_AUTH_URL: z.string().url().optional().default("http://localhost:3000"),

  // ---- Google OAuth ----
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // ---- Payment (Razorpay) ----
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  // ---- Push Notifications (FCM) ----
  FCM_PROJECT_ID: z.string().optional(),
  FCM_PRIVATE_KEY: z.string().optional(),
  FCM_CLIENT_EMAIL: z.union([z.string().email(), z.literal("")]).optional(),

  // ---- Storage ----
  S3_BUCKET_NAME: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),

  // ---- App ----
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // ---- Trusted Origins ----
  ADDITIONAL_TRUSTED_ORIGINS: z.string().optional(),
});

// ============================================================
// CLIENT (browser-exposed) ENV SCHEMA
// ============================================================

const clientEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().optional().default("http://localhost:3000"),
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().optional(),
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().optional(),
});

// ============================================================
// PARSE & EXPORT
// ============================================================

/**
 * Validated server-side environment.
 * Never use this in client components.
 */
function parseServerEnv() {
  try {
    return serverEnvSchema.parse(process.env);
  } catch (e) {
    const formatted = (e as z.ZodError).format();
    console.error("❌ Invalid server environment variables:", JSON.stringify(formatted, null, 2));
    throw new Error("Invalid server environment variables. Check the logs above.");
  }
}

/**
 * Validated client-side environment.
 * Safe to use in client components and mobile apps.
 */
function parseClientEnv() {
  try {
    return clientEnvSchema.parse({
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (e) {
    const formatted = (e as z.ZodError).format();
    console.error("❌ Invalid client environment variables:", JSON.stringify(formatted, null, 2));
    throw new Error("Invalid client environment variables. Check the logs above.");
  }
}

// Export validated env objects
// Server env is lazily validated to avoid edge-runtime issues
export const env = parseServerEnv();
export const clientEnv = parseClientEnv();

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;
