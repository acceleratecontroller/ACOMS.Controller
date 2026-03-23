import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { TaskCard } from "@/components/TaskCard";
import { TaskForm } from "@/components/TaskForm";
import { FilterBar } from "@/components/FilterBar";

export const dynamic = "force-dynamic";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: { status?: string; priority?: string; categoryId?: string };
}) {
  const where: Record<string, unknown> = {};
  if (searchParams.status) where.status = searchParams.status;
  if (searchParams.priority) where.priority = searchParams.priority;
  if (searchParams.categoryId) {
    where.categories = { some: { categoryId: searchParams.categoryId } };
  }

  const [tasks, categories] = await Promise.all([
    prisma.task.findMany({
      where,
      include: {
        categories: { include: { category: true } },
        recurrenceRule: true,
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  // Serialize dates for client components
  const serializedTasks = tasks.map((t) => ({
    ...t,
    dueDate: t.dueDate?.toISOString() ?? null,
    completedAt: t.completedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <TaskForm categories={categories} />
      </div>

      <Suspense>
        <FilterBar />
      </Suspense>

      <div className="mt-4 space-y-2">
        {serializedTasks.length === 0 ? (
          <p className="text-gray-500 py-8 text-center">
            No tasks yet. Create one to get started.
          </p>
        ) : (
          serializedTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))
        )}
      </div>
    </div>
  );
}
