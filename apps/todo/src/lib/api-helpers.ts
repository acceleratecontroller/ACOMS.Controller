import { NextRequest, NextResponse } from "next/server";

export async function parseBody<T = unknown>(
  request: NextRequest,
): Promise<{ data: T; error?: never } | { data?: never; error: NextResponse }> {
  try {
    const data = await request.json();
    return { data: data as T };
  } catch {
    return {
      error: NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 },
      ),
    };
  }
}

/**
 * Validate assignee reference. In standalone mode, accepts any non-empty string.
 * When ACOMS.OS integrates, this will validate against the assignee adapter.
 */
export async function validateAssigneeRef(
  id: string | null | undefined,
): Promise<NextResponse | null> {
  if (!id) return null;
  // TODO: Replace with real assignee validation via adapter
  return null;
}

export async function withPrismaError<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<{ result: T; error?: never } | { result?: never; error: NextResponse }> {
  try {
    const result = await fn();
    return { result };
  } catch (err) {
    console.error(`${label}:`, err);
    const message = err instanceof Error ? err.message : "Unknown error";
    if (typeof err === "object" && err !== null && "code" in err) {
      const prismaErr = err as { code: string };
      if (prismaErr.code === "P2025") {
        return { error: NextResponse.json({ error: "Record not found" }, { status: 404 }) };
      }
      if (prismaErr.code === "P2003") {
        return { error: NextResponse.json({ error: "Referenced record does not exist" }, { status: 400 }) };
      }
      if (prismaErr.code === "P2002") {
        return { error: NextResponse.json({ error: "A record with that unique value already exists" }, { status: 409 }) };
      }
    }
    return { error: NextResponse.json({ error: `${label}: ${message}` }, { status: 500 }) };
  }
}
