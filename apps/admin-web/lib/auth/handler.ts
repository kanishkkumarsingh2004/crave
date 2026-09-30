/**
 * Better Auth request handler for admin-web.
 *
 * Mounts the shared Better Auth instance at /api/auth/[...all].
 * All auth routes (sign-in, sign-out, session, OAuth callbacks) are
 * handled by Better Auth automatically through this single export.
 *
 * spec: auth-spec.md §3, §28
 */

import { auth } from "@delivery/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
