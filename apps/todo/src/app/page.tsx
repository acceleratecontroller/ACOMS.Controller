"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface DashboardData {
  activeTaskCount: number;
  overdueTaskCount: number;
  overdueRecurringCount: number;
  dueTodayTaskCount: number;
  dueTodayRecurringCount: number;
  overdueTasks: { id: string; title: string; dueDate: string }[];
  overdueRecurringTasks: { id: string; title: string; nextDue: string }[];
  dueTodayTasks: { id: string; title: string }[];
  upcomingTasks: { id: string; title: string; dueDate: string }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  const totalOverdue = (data?.overdueTaskCount ?? 0) + (data?.overdueRecurringCount ?? 0);
  const totalDueToday = (data?.dueTodayTaskCount ?? 0) + (data?.dueTodayRecurringCount ?? 0);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard label="Active Tasks" value={data?.activeTaskCount ?? 0} />
        <StatCard label="Due Today" value={totalDueToday} color="blue" />
        <StatCard label="Overdue" value={totalOverdue} color="red" />
      </div>

      {data && totalOverdue > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-semibold text-red-800 mb-2">Overdue Items</h3>
          <ul className="text-sm text-red-700 space-y-1">
            {data.overdueTasks.map((t) => (
              <li key={t.id}>{t.title}</li>
            ))}
            {data.overdueRecurringTasks.map((t) => (
              <li key={t.id}>{t.title} (recurring)</li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-2">Task Manager</h2>
        <p className="text-gray-600 mb-4">
          Manage quick tasks and recurring schedules for your team.
        </p>
        <Link
          href="/tasks"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Open Task Manager
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color = "gray",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    gray: "text-gray-900",
    blue: "text-blue-600",
    red: "text-red-600",
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`text-3xl font-bold ${colorMap[color]}`}>{value}</div>
    </div>
  );
}
