"use client";

import { useRouter } from "next/navigation";
import { PriorityBadge } from "./PriorityBadge";
import { StatusBadge } from "./StatusBadge";
import { CategoryBadge } from "./CategoryBadge";

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    dueDate: string | null;
    recurrenceRule: { frequency: string } | null;
    categories: Array<{
      category: { id: string; name: string; color: string | null };
    }>;
  };
}

export function TaskCard({ task }: TaskCardProps) {
  const router = useRouter();

  const isOverdue =
    task.status !== "done" &&
    task.dueDate &&
    new Date(task.dueDate) < new Date();

  async function handleComplete() {
    await fetch(`/api/tasks/${task.id}/complete`, { method: "POST" });
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("Delete this task?")) return;
    await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-start gap-4">
      {/* Complete button */}
      <button
        onClick={handleComplete}
        disabled={task.status === "done"}
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors ${
          task.status === "done"
            ? "bg-green-500 border-green-500"
            : "border-gray-300 hover:border-green-400"
        }`}
        title={task.status === "done" ? "Completed" : "Mark as complete"}
      />

      {/* Task info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`font-medium ${
              task.status === "done" ? "line-through text-gray-400" : ""
            }`}
          >
            {task.title}
          </span>
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
          {task.recurrenceRule && (
            <span className="text-xs text-purple-600 font-medium">
              Repeats {task.recurrenceRule.frequency}
            </span>
          )}
        </div>

        {task.description && (
          <p className="text-sm text-gray-500 mt-1 truncate">
            {task.description}
          </p>
        )}

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {task.dueDate && (
            <span
              className={`text-xs ${
                isOverdue ? "text-red-600 font-medium" : "text-gray-500"
              }`}
            >
              Due: {new Date(task.dueDate).toLocaleDateString()}
              {isOverdue && " (overdue)"}
            </span>
          )}
          {task.categories.map((tc) => (
            <CategoryBadge
              key={tc.category.id}
              name={tc.category.name}
              color={tc.category.color}
            />
          ))}
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={handleDelete}
        className="text-gray-400 hover:text-red-500 text-sm flex-shrink-0"
        title="Delete task"
      >
        Delete
      </button>
    </div>
  );
}
