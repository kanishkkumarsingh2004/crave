import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Public paths that bypass authentication checks completely
const PUBLIC_EXACT_PATHS = ["/", "/downloads", "/download"];
const PUBLIC_PREFIXES = ["/api/auth", "/api/v1/downloads", "/_next", "/favicon", "/robots.txt"];

/**
 * Admin Web Middleware:
 * - Public landing page (/), download portal (/downloads), and auth/download APIs bypass auth checks.
 * - Authenticated users (with session cookie) attempting to access /login or /admin redirect to /dashboard.
 * - Unauthenticated users attempting to access /admin or protected dashboard routes redirect to /login.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. FAST PATH: Immediately allow static assets & public landing/download pages
  if (
    PUBLIC_EXACT_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    return NextResponse.next();
  }

  // 2. Check for Better Auth session token cookie
  const sessionToken =
    request.cookies.get("better-auth.session_token")?.value ||
    request.cookies.get("__Secure-better-auth.session_token")?.value ||
    request.cookies.get("session_token")?.value;

  const isAuthenticated = Boolean(sessionToken && sessionToken.length > 0);

  // 3. Handle /admin shortcut route:
  if (pathname === "/admin") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    } else {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // 4. Handle /login route:
  // If user is ALREADY logged in, redirect away from /login to /dashboard
  if (pathname === "/login") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // 5. Protected Admin Routes (/dashboard, /vendors, /customers, /orders, /products, etc.)
  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
