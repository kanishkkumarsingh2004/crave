/**
 * Better Auth catch-all handler.
 * The actual auth configuration lives in server/modules/auth.
 * This file proxies all /api/auth/* requests to the shared auth handler.
 */
export { GET, POST } from "@/lib/auth/handler";
