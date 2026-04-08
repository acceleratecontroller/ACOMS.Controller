// src/middleware.ts — Route protection for ACOMS.Controller
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/logout") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Embed routes authenticate via token (query param or header), not cookies.
  // Token validation happens in the embed layout/API handlers themselves.
  if (pathname.startsWith("/embed")) {
    return NextResponse.next();
  }

  // Allow requests with embed tokens through — these are API calls from
  // the ACOMS.OS iframe. Token validation happens in requireAuth()/requireAdmin().
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer embed:")) {
    return NextResponse.next();
  }

  // Check for NextAuth session cookie
  const hasSession =
    request.cookies.has("authjs.session-token") ||
    request.cookies.has("__Secure-authjs.session-token");

  if (!hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  runtime: "nodejs",
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
