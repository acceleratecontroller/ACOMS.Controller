import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateTaskSchema } from "@/modules/tasks/validation";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { audit, diff } from "@/lib/audit";
import { parseBody, validateAssigneeRef, withPrismaError } from "@/lib/api-helpers";

// GET /api/tasks/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error: authErr } = await requireAuth();
  if (authErr) return authErr;

  const { id } = await params;
  const task = await prisma.task.findUnique({ where: { id } });

  if (!task) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(task);
}

// PUT /api/tasks/[id] — Update a task
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const { id } = await params;
  const { data: body, error: bodyError } = await parseBody(request);
  if (bodyError) return bodyError;

  const parsed = updateTaskSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const data = parsed.data;

  if (data.assigneeId !== undefined) {
    const refError = await validateAssigneeRef(data.assigneeId);
    if (refError) return refError;
  }

  const before = await prisma.task.findUnique({ where: { id } });

  const { result: task, error } = await withPrismaError("Failed to update task", () =>
    prisma.task.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.projectId !== undefined && { projectId: data.projectId || null }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
        ...(data.label !== undefined && { label: data.label }),
        ...(data.dueDate !== undefined && {
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
        }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId }),
      },
    }),
  );
  if (error) return error;

  const changes = before
    ? diff(
        before as unknown as Record<string, unknown>,
        task as unknown as Record<string, unknown>,
      )
    : null;

  audit({
    entityType: "Task",
    entityId: task.id,
    action: "UPDATE",
    entityLabel: task.title,
    performedById: session.user.id,
    changes,
  });

  return NextResponse.json(task);
}

// DELETE /api/tasks/[id] — Soft-delete (archive)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const { id } = await params;

  const { result: task, error } = await withPrismaError("Failed to archive task", () =>
    prisma.task.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        archivedById: session.user.id,
      },
    }),
  );
  if (error) return error;

  audit({
    entityType: "Task",
    entityId: task.id,
    action: "ARCHIVE",
    entityLabel: task.title,
    performedById: session.user.id,
  });

  return NextResponse.json(task);
}
