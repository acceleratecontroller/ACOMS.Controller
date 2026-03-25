import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

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
  const { error: authErr } = await requireAuth();
  if (authErr) return authErr;

  // TODO: Replace with real assignee data from adapter
  // For standalone development, return placeholder assignees
  const assignees = [
    { id: "user-1", firstName: "Admin", lastName: "User", employeeNumber: "EMP001" },
  ];

  return NextResponse.json(assignees);
}
