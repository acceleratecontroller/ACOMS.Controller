import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { CreateTaskInput } from "@acoms/shared-types";

// GET /api/tasks — list tasks with optional filters
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const categoryId = searchParams.get("categoryId");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (categoryId) {
    where.categories = { some: { categoryId } };
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      categories: { include: { category: true } },
      recurrenceRule: true,
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(tasks);
}

// POST /api/tasks — create a new task
export async function POST(request: NextRequest) {
  const body: CreateTaskInput = await request.json();

  const task = await prisma.task.create({
    data: {
      title: body.title,
      description: body.description,
      status: body.status ?? "todo",
      priority: body.priority ?? "medium",
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      // Create recurrence rule if provided
      ...(body.recurrence
        ? {
            recurrenceRule: {
              create: {
                frequency: body.recurrence.frequency,
                interval: body.recurrence.interval ?? 1,
                daysOfWeek: body.recurrence.daysOfWeek?.join(",") ?? null,
                dayOfMonth: body.recurrence.dayOfMonth ?? null,
                endDate: body.recurrence.endDate
                  ? new Date(body.recurrence.endDate)
                  : null,
              },
            },
          }
        : {}),
      // Connect categories if provided
      ...(body.categoryIds?.length
        ? {
            categories: {
              create: body.categoryIds.map((categoryId) => ({
                categoryId,
              })),
            },
          }
        : {}),
    },
    include: {
      categories: { include: { category: true } },
      recurrenceRule: true,
    },
  });

  return NextResponse.json(task, { status: 201 });
}
