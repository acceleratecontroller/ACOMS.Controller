import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAssignableEmployees } from "@/lib/acoms-os";

/**
 * GET /api/assignees — List available assignees from ACOMS.OS.
 */
export async function GET() {
  const { error: authErr } = await requireAuth();
  if (authErr) return authErr;

  const employees = await getAssignableEmployees();

  const assignees = employees.map((emp) => ({
    id: emp.id,
    firstName: emp.firstName,
    lastName: emp.lastName,
    employeeNumber: emp.employeeNumber,
    identityId: emp.identityId,
  }));

  return NextResponse.json(assignees);
}
