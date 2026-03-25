import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createTaskSchema } from "@/modules/tasks/validation";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { parseBody, validateAssigneeRef, withPrismaError } from "@/lib/api-helpers";

// GET /api/tasks — List tasks
export async function GET(request: NextRequest) {
  const { error: authErr } = await requireAuth();
  if (authErr) return authErr;

  const showArchived = request.nextUrl.searchParams.get("archived") === "true";

  const tasks = await prisma.task.findMany({
    where: { isArchived: showArchived },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tasks);
}

// POST /api/tasks — Create a new task
export async function POST(request: NextRequest) {
  const { session, error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const { data: body, error: bodyError } = await parseBody(request);
  if (bodyError) return bodyError;

  const parsed = createTaskSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const data = parsed.data;

  const refError = await validateAssigneeRef(data.assigneeId);
  if (refError) return refError;

  const { result: task, error } = await withPrismaError("Failed to create task", () =>
    prisma.task.create({
      data: {
        title: data.title,
        projectId: data.projectId || null,
        notes: data.notes || null,
        label: data.label || "Task",
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        status: data.status,
        priority: data.priority,
        assigneeId: data.assigneeId,
        createdById: session.user.id,
      },
    }),
  );
  if (error) return error;

  audit({
    entityType: "Task",
    entityId: task.id,
    action: "CREATE",
    entityLabel: task.title,
    performedById: session.user.id,
  });

  return NextResponse.json(task, { status: 201 });
}
