import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateRecurringTaskSchema } from "@/modules/tasks/validation";
import { calculateNextDue } from "@/modules/tasks/recurrence";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { audit, diff } from "@/lib/audit";
import { parseBody, validateAssigneeRef, withPrismaError } from "@/lib/api-helpers";

// GET /api/recurring-tasks/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error: authErr } = await requireAuth();
  if (authErr) return authErr;

  const { id } = await params;
  const task = await prisma.recurringTask.findUnique({ where: { id } });

  if (!task) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(task);
}

// PUT /api/recurring-tasks/[id] — Update
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const { id } = await params;
  const { data: body, error: bodyError } = await parseBody(request);
  if (bodyError) return bodyError;

  const parsed = updateRecurringTaskSchema.safeParse(body);

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

  const before = await prisma.recurringTask.findUnique({ where: { id } });
  if (!before) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Recalculate nextDue if frequency/schedule/lastCompleted changed
  let nextDue: Date | null | undefined;
  const freqType = data.frequencyType ?? before.frequencyType;
  const freqValue = data.frequencyValue ?? before.frequencyValue;
  const schedType = data.scheduleType ?? before.scheduleType;
  const lastCompleted =
    data.lastCompleted !== undefined
      ? data.lastCompleted
        ? new Date(data.lastCompleted)
        : null
      : before.lastCompleted;

  const freqTypeChanged = data.frequencyType !== undefined && data.frequencyType !== before.frequencyType;
  const freqValueChanged = data.frequencyValue !== undefined && data.frequencyValue !== before.frequencyValue;
  const schedTypeChanged = data.scheduleType !== undefined && data.scheduleType !== before.scheduleType;
  const lastCompletedChanged =
    data.lastCompleted !== undefined &&
    String(data.lastCompleted || "") !== String(before.lastCompleted?.toISOString().slice(0, 10) || "");

  if (freqTypeChanged || freqValueChanged || schedTypeChanged || lastCompletedChanged) {
    nextDue = calculateNextDue(freqType, freqValue, schedType, lastCompleted, null);
  }

  const { result: task, error } = await withPrismaError("Failed to update recurring task", () =>
    prisma.recurringTask.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.frequencyType !== undefined && { frequencyType: data.frequencyType }),
        ...(data.frequencyValue !== undefined && { frequencyValue: data.frequencyValue }),
        ...(data.scheduleType !== undefined && { scheduleType: data.scheduleType }),
        ...(data.lastCompleted !== undefined && {
          lastCompleted: data.lastCompleted ? new Date(data.lastCompleted) : null,
        }),
        ...(nextDue !== undefined && { nextDue }),
        ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId }),
      },
    }),
  );
  if (error) return error;

  const changes = diff(
    before as unknown as Record<string, unknown>,
    task as unknown as Record<string, unknown>,
  );

  audit({
    entityType: "RecurringTask",
    entityId: task.id,
    action: "UPDATE",
    entityLabel: task.title,
    performedById: session.user.id,
    changes,
  });

  return NextResponse.json(task);
}

// DELETE /api/recurring-tasks/[id] — Soft-delete (archive)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const { id } = await params;

  const { result: task, error } = await withPrismaError("Failed to archive recurring task", () =>
    prisma.recurringTask.update({
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
    entityType: "RecurringTask",
    entityId: task.id,
    action: "ARCHIVE",
    entityLabel: task.title,
    performedById: session.user.id,
  });

  return NextResponse.json(task);
}
