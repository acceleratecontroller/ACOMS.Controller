"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function FilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/tasks?${params.toString()}`);
  }

  return (
    <div className="flex gap-3 flex-wrap">
      <select
        value={searchParams.get("status") ?? ""}
        onChange={(e) => setFilter("status", e.target.value)}
        className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
      >
        <option value="">All Statuses</option>
        <option value="todo">To Do</option>
        <option value="in_progress">In Progress</option>
        <option value="done">Done</option>
      </select>

      <select
        value={searchParams.get("priority") ?? ""}
        onChange={(e) => setFilter("priority", e.target.value)}
        className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
      >
        <option value="">All Priorities</option>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
        <option value="urgent">Urgent</option>
      </select>
    </div>
  );
}
