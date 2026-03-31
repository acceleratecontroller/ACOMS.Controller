import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();

  // Clear all NextAuth session cookies
  for (const cookie of cookieStore.getAll()) {
    if (cookie.name.includes("authjs")) {
      cookieStore.delete(cookie.name);
    }
  }

  // Redirect to ACOMS.Auth logout, which will redirect back to our login
  const authUrl = process.env.ACOMS_AUTH_URL;
  const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return NextResponse.redirect(`${authUrl}/api/auth/logout?returnTo=${appUrl}/login`);
}
