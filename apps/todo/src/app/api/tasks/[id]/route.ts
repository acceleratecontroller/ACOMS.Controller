import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { UpdateTaskInput } from "@acoms/shared-types";

// GET /api/tasks/[id] — get a single task
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const task = await prisma.task.findUnique({
    where: { id: params.id },
    include: {
      categories: { include: { category: true } },
      recurrenceRule: true,
      childTasks: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json(task);
}

// PATCH /api/tasks/[id] — update a task
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body: UpdateTaskInput = await request.json();

  // Build the update data
  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.description !== undefined) data.description = body.description;
  if (body.status !== undefined) data.status = body.status;
  if (body.priority !== undefined) data.priority = body.priority;
  if (body.dueDate !== undefined) {
    data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  }

  // Handle category updates: remove old, add new
  if (body.categoryIds) {
    await prisma.taskCategory.deleteMany({ where: { taskId: params.id } });
    data.categories = {
      create: body.categoryIds.map((categoryId: string) => ({ categoryId })),
    };
  }

  const task = await prisma.task.update({
    where: { id: params.id },
    data,
    include: {
      categories: { include: { category: true } },
      recurrenceRule: true,
    },
  });

  return NextResponse.json(task);
}

// DELETE /api/tasks/[id] — delete a task
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.task.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
