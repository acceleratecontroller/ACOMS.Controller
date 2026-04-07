import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { parseBody, withPrismaError } from "@/lib/api-helpers";

// POST /api/notes/[id]/convert — Mark note as converted to a task
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const { id } = await params;
  const { data: body, error: bodyError } = await parseBody<{ taskId: string }>(request);
  if (bodyError) return bodyError;

  if (!body.taskId) {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  }

  // Verify ownership
  const existing = await prisma.quickNote.findUnique({ where: { id } });
  if (!existing || existing.createdById !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { result: note, error } = await withPrismaError("Failed to convert note", () =>
    prisma.quickNote.update({
      where: { id },
      data: {
        convertedToTaskId: body.taskId,
        isArchived: true,
        archivedAt: new Date(),
        archivedById: session.user.id,
      },
    }),
  );
  if (error) return error;

  audit({
    entityType: "QuickNote",
    entityId: note.id,
    action: "UPDATE",
    entityLabel: "Quick Note → Task",
    performedById: session.user.id,
    changes: { convertedToTaskId: { from: null, to: body.taskId } },
  });

  return NextResponse.json(note);
}
