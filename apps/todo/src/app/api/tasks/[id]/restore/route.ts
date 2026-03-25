import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { withPrismaError } from "@/lib/api-helpers";

// POST /api/tasks/[id]/restore — Restore an archived task
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const { id } = await params;

  const { result: task, error } = await withPrismaError("Failed to restore task", () =>
    prisma.task.update({
      where: { id },
      data: {
        isArchived: false,
        archivedAt: null,
        archivedById: null,
      },
    }),
  );
  if (error) return error;

  audit({
    entityType: "Task",
    entityId: task.id,
    action: "RESTORE",
    entityLabel: task.title,
    performedById: session.user.id,
  });

  return NextResponse.json(task);
}
