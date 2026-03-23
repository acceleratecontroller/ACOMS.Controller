"use client";

const statusStyles: Record<string, string> = {
  todo: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  done: "bg-green-100 text-green-800",
};

const statusLabels: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
        statusStyles[status] ?? statusStyles.todo
      }`}
    >
      {statusLabels[status] ?? status}
    </span>
  );
}
