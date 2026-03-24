/**
 * Auth placeholder — standalone materials app.
 *
 * In production, replace with NextAuth, Clerk, or your preferred auth.
 * For now, returns a default admin session so the app is functional.
 *
 * ACOMS.OS integration: when ready, this will delegate to ACOMS.OS auth
 * via an adapter or shared auth package.
 */

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
  return {
    user: {
      id: "system",
      role: "ADMIN",
    },
  };
}
