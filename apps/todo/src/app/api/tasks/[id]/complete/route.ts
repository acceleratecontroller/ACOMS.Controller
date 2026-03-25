import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { withPrismaError } from "@/lib/api-helpers";

// POST /api/tasks/[id]/complete — Toggle task completion
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const { id } = await params;
  const task = await prisma.task.findUnique({ where: { id } });

  if (!task) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const newStatus = task.status === "COMPLETED" ? "NOT_STARTED" : "COMPLETED";

  const { result: updated, error } = await withPrismaError("Failed to toggle task completion", () =>
    prisma.task.update({
      where: { id },
      data: { status: newStatus },
    }),
  );
  if (error) return error;

  audit({
    entityType: "Task",
    entityId: task.id,
    action: "UPDATE",
    entityLabel: task.title,
    performedById: session.user.id,
    changes: { status: { from: task.status, to: newStatus } },
  });

  return NextResponse.json(updated);
}
