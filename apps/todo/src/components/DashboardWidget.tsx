"use client";

import Link from "next/link";

interface DashboardWidgetProps {
  title: string;
  children: React.ReactNode;
  action?: { label: string; onClick: () => void };
  viewAllHref?: string;
  viewAllLabel?: string;
  badge?: number;
  badgeColor?: string;
}

export function DashboardWidget({
  title,
  children,
  action,
  viewAllHref,
  viewAllLabel,
  badge,
  badgeColor = "bg-gray-500",
}: DashboardWidgetProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          {badge !== undefined && badge > 0 && (
            <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-white text-[10px] font-bold ${badgeColor}`}>
              {badge}
            </span>
          )}
        </div>
        {action && (
          <button
            onClick={action.onClick}
            className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            {action.label}
          </button>
        )}
      </div>
      <div className="flex-1">{children}</div>
      {viewAllHref && (
        <Link
          href={viewAllHref}
          className="text-xs text-blue-600 hover:text-blue-800 mt-3 inline-block"
        >
          {viewAllLabel || "View all"}
        </Link>
      )}
    </div>
  );
}
