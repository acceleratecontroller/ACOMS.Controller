import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [totalTasks, todoTasks, overdueTasks] = await Promise.all([
    prisma.task.count(),
    prisma.task.count({ where: { status: "todo" } }),
    prisma.task.count({
      where: {
        status: { not: "done" },
        dueDate: { lt: new Date() },
      },
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Tasks" value={totalTasks} />
        <StatCard label="To Do" value={todoTasks} color="blue" />
        <StatCard label="Overdue" value={overdueTasks} color="red" />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-2">Getting Started</h2>
        <p className="text-gray-600 mb-4">
          This is the ACOMS Controller — a shared platform for business tools.
          The first module is the To-Do &amp; Recurring Tasks app.
        </p>
        <Link
          href="/tasks"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Go to Tasks
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
