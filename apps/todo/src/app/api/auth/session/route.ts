import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * GET /api/auth/session — Return current session.
 *
 * Placeholder for standalone mode. The frontend checks this to
 * determine if the user is an admin (for showing edit controls).
 */
export async function GET() {
  const session = await auth();
  return NextResponse.json(session);
}
