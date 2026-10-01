"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * /admin route:
 * Client-side redirect component.
 * Middleware handles the server-side edge redirect to /dashboard (if authenticated) or /login.
 */
export default function AdminRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return null;
}
