/**
 * @delivery/auth — Server-side Better Auth instance
 *
 * This is the single, authoritative Better Auth configuration for the platform.
 * All apps must import their auth handler from this package.
 *
 * Architecture:
 *   - One shared auth instance (betterAuth) configured here
 *   - Admin Web: imports auth from this package via lib/auth/handler.ts
 *   - Mobile apps: connect via API — no direct auth instance access
 *
 * Spec: auth-spec.md §3
 */

declare const process: any;

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@delivery/database";
import { UserRole, UserStatus } from "@delivery/types";

// ============================================================
// ENVIRONMENT VALIDATION
// ============================================================

const BETTER_AUTH_SECRET =
  process.env.BETTER_AUTH_SECRET || "supersecret32characterlongstringforbetterauth!";
const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

if (
  process.env.NODE_ENV === "production" &&
  (!process.env.BETTER_AUTH_SECRET ||
    process.env.BETTER_AUTH_SECRET.includes("supersecret32characterlongstring"))
) {
  console.warn(
    "⚠️ SECURITY WARNING: BETTER_AUTH_SECRET is not configured or using default fallback in production! Set a secure random 32+ char key.",
  );
}

// ============================================================
// GOOGLE OAUTH CONFIG
// ============================================================

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const googleSocialProvider =
  GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET
    ? [
        {
          providerId: "google" as const,
          clientId: GOOGLE_CLIENT_ID,
          clientSecret: GOOGLE_CLIENT_SECRET,
        },
      ]
    : [];

// ============================================================
// BETTER AUTH INSTANCE
// ============================================================

/**
 * The shared Better Auth server instance.
 *
 * Configured with:
 * - Prisma adapter (PostgreSQL via @delivery/database singleton)
 * - Email/password authentication
 * - Google OAuth (if credentials are set)
 * - Extended User model fields (role, status, phone)
 * - Session configuration (7-day web, 30-day mobile)
 *
 * spec: auth-spec.md §3, §20, §21, §22
 */
export const auth = betterAuth({
  // Prisma adapter — uses the shared singleton prisma client
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  baseURL: BETTER_AUTH_URL,
  secret: BETTER_AUTH_SECRET,

  // Email/password authentication
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    requireEmailVerification: false, // Can enable later in Phase 5
    autoSignIn: true,
  },

  // Social providers
  socialProviders: {
    ...(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
  },

  // User model extension — maps to our User model's extra fields
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: UserRole.CUSTOMER,
        input: false, // Never accept role from client signup input
      },
      status: {
        type: "string",
        required: true,
        defaultValue: UserStatus.ACTIVE,
        input: false,
      },
      phone: {
        type: "string",
        required: false,
        input: true,
      },
    },
  },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days for web
    updateAge: 60 * 60 * 24, // Refresh if older than 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // Cache session cookie for 5 minutes
    },
  },

  // Advanced configuration
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    crossSubDomainCookies: {
      enabled: false,
    },
    generateId: false, // Use Prisma's @default(cuid())
    disableCSRFCheck: true, // Allow mobile apps & native API clients that do not send Origin header
  },

  // Logger configuration
  logger: {
    disabled: process.env.NODE_ENV !== "test" && !process.env.DEBUG_AUTH,
  },

  // Trusted origins (for CORS)
  trustedOrigins: [
    BETTER_AUTH_URL,
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    ...(process.env.ADDITIONAL_TRUSTED_ORIGINS?.split(",") ?? []),
  ],
});

// ============================================================
// TYPE HELPERS
// ============================================================

export type Session = typeof auth.$Infer.Session;
export type AuthUser = typeof auth.$Infer.Session.user;
