/**
 * Auth placeholder — standalone task app.
 *
 * In production, replace with NextAuth, Clerk, or your preferred auth.
 * For now, returns a default admin session so the app is functional.
 *
 * ACOMS.OS integration: when ready, this will delegate to ACOMS.OS auth
 * via an adapter or shared auth package.
 */

import { NextResponse } from "next/server";

export interface SessionUser {
  id: string;
  role: "ADMIN" | "STAFF";
  employeeId?: string;
}

export interface Session {
  user: SessionUser;
}

/**
 * Get the current session. Returns a default admin session.
 * Replace this with real auth when integrating with ACOMS.OS.
 */
export async function auth(): Promise<Session | null> {
  // TODO: Replace with real auth (NextAuth, Clerk, etc.)
  // For standalone development, return a default admin user.
  return {
    user: {
      id: "system",
      role: "ADMIN",
    },
  };
}

type AuthSuccess = { session: Session; error?: undefined };
type AuthFailure = { session?: undefined; error: NextResponse };

/**
 * Require an authenticated session. Returns 401 if not authenticated.
 */
export async function requireAuth(): Promise<AuthSuccess | AuthFailure> {
  const session = await auth();
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session };
}

/**
 * Require an authenticated ADMIN session. Returns 403 if not admin, 401 if not authenticated.
 */
export async function requireAdmin(): Promise<AuthSuccess | AuthFailure> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}
