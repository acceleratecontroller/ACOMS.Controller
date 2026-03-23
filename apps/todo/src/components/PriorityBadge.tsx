"use client";

const priorityStyles: Record<string, string> = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
        priorityStyles[priority] ?? priorityStyles.medium
      }`}
    >
      {priority}
    </span>
  );
}
