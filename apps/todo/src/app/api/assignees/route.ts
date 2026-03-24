import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * GET /api/assignees — List available assignees.
 *
 * Placeholder endpoint. In standalone mode, returns a default set of
 * assignees. When ACOMS.OS integrates, this will delegate to the
 * AssigneeAdapter to query the Employee table.
 *
 * The frontend uses this to populate owner/assignee dropdowns.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO: Replace with real assignee data from adapter
  // For standalone development, return placeholder assignees
  const assignees = [
    { id: "user-1", firstName: "Admin", lastName: "User", employeeNumber: "EMP001" },
  ];

  return NextResponse.json(assignees);
}
