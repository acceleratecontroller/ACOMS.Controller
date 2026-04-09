"use client";

import { useState } from "react";
import Link from "next/link";
import { TIER_COLORS } from "@/modules/email-digest/constants";

interface DigestItem {
  id: string;
  tier: string;
  sender: string;
  subject: string;
  folder: string;
  summary: string;
  actionNeeded: string | null;
  needsResponse: boolean;
  draftResponse: string | null;
  isActioned: boolean;
  isDeadline: boolean;
  deadlineDate: string | null;
  isCarriedForward: boolean;
}

interface DigestWindow {
  id: string;
  windowType: string;
  windowStart: string;
  windowEnd: string;
  totalEmails: number;
  actionRequired: number;
  items: DigestItem[];
}

interface EmailDigestWidgetProps {
  digest: {
    id: string;
    date: string;
    windows: DigestWindow[];
  };
  stats: {
    totalActionRequired: number;
    totalUnactioned: number;
    totalDraftsReady: number;
    windowsCompleted: number;
  };
  onRefresh: () => void;
}

export function EmailDigestWidget({ digest, stats, onRefresh }: EmailDigestWidgetProps) {
  const [loading, setLoading] = useState<string | null>(null);

  // Get top unactioned TIER 1 items across all windows
  const actionItems = digest.windows
    .flatMap((w) => w.items)
    .filter((i) => i.tier === "TIER_1_ACTION" && !i.isActioned)
    .slice(0, 5);

  async function handleAction(itemId: string, action: "done" | "task") {
    setLoading(itemId);
    try {
      await fetch(`/api/email-digest/items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "done" ? { isActioned: true } : { convertToTask: true },
        ),
      });
      onRefresh();
    } finally {
      setLoading(null);
    }
  }

  const tierColors = TIER_COLORS.TIER_1_ACTION;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Email Digest</h3>
          {stats.totalUnactioned > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-white text-[10px] font-bold bg-red-500">
              {stats.totalUnactioned}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>{stats.windowsCompleted}/4 windows</span>
          {stats.totalDraftsReady > 0 && (
            <span className="text-blue-600 dark:text-blue-400">{stats.totalDraftsReady} drafts</span>
          )}
        </div>
      </div>

      {actionItems.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No action items pending.</p>
      ) : (
        <div className="space-y-2">
          {actionItems.map((item) => (
            <div
              key={item.id}
              className={`${tierColors.bg} ${tierColors.border} rounded-md p-2.5`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                      {item.sender}
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                      {item.folder}
                    </span>
                    {item.isCarriedForward && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400">carried</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-700 dark:text-gray-300 truncate">{item.subject}</p>
                  {item.actionNeeded && (
                    <p className="text-[11px] text-red-700 dark:text-red-400 mt-0.5">{item.actionNeeded}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleAction(item.id, "done")}
                    disabled={loading === item.id}
                    className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 transition-colors disabled:opacity-50"
                    title="Mark done"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleAction(item.id, "task")}
                    disabled={loading === item.id}
                    className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors disabled:opacity-50"
                    title="Create task"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Link
        href="/email-digest"
        className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mt-3 inline-block"
      >
        View full digest
      </Link>
    </div>
  );
}
