import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getNextDueDate } from "@/lib/recurrence";

// POST /api/tasks/[id]/complete — mark a task as done
// If the task has a recurrence rule, spawn the next instance automatically.
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Mark the task as done
  const task = await prisma.task.update({
    where: { id: params.id },
    data: {
      status: "done",
      completedAt: new Date(),
    },
    include: {
      recurrenceRule: true,
      categories: true,
    },
  });

  let nextTask = null;

  // If this task has a recurrence rule, create the next instance
  if (task.recurrenceRule && task.dueDate) {
    const nextDueDate = getNextDueDate(task.recurrenceRule, task.dueDate);

    if (nextDueDate) {
      nextTask = await prisma.task.create({
        data: {
          title: task.title,
          description: task.description,
          status: "todo",
          priority: task.priority,
          dueDate: nextDueDate,
          recurrenceRuleId: task.recurrenceRuleId,
          parentTaskId: task.parentTaskId ?? task.id, // point to the original
          // Copy categories
          categories: {
            create: task.categories.map((tc) => ({
              categoryId: tc.categoryId,
            })),
          },
        },
        include: {
          categories: { include: { category: true } },
          recurrenceRule: true,
        },
      });
    }
  }

  return NextResponse.json({
    completedTask: task,
    nextTask,
  });
}
