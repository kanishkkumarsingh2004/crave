/**
 * @delivery/auth — Client-side Better Auth helper
 *
 * Import this in React/Next.js client components to use auth.
 * Mobile apps have their own better-auth-client configured in-app.
 *
 * spec: auth-spec.md §20
 */

declare const process: any;

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000",
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
