"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TIER_COLORS, WINDOW_OPTIONS } from "@/modules/email-digest/constants";

interface DigestItem {
  id: string;
  tier: string;
  position: number;
  sender: string;
  senderEmail: string | null;
  subject: string;
  folder: string;
  receivedAt: string | null;
  threadSize: number;
  hasAttachment: boolean;
  summary: string;
  actionNeeded: string | null;
  needsResponse: boolean;
  draftResponse: string | null;
  draftContext: string | null;
  isActioned: boolean;
  actionedAt: string | null;
  isCarriedForward: boolean;
  carriedFromWindow: string | null;
  isDeadline: boolean;
  deadlineDate: string | null;
  convertedToTaskId: string | null;
}

interface DigestWindow {
  id: string;
  windowType: string;
  windowStart: string;
  windowEnd: string;
  totalEmails: number;
  threadCount: number;
  continuingThreads: number;
  actionRequired: number;
  rawSummary: string | null;
  lastIngestedAt: string;
  items: DigestItem[];
}

interface Digest {
  id: string;
  date: string;
  windows: DigestWindow[];
}

function todayDateString(): string {
  const d = new Date();
  // Use AEST
  const formatter = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(d);
  const year = parts.find((p) => p.type === "year")!.value;
  const month = parts.find((p) => p.type === "month")!.value;
  const day = parts.find((p) => p.type === "day")!.value;
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function shiftDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  const ny = dt.getFullYear();
  const nm = String(dt.getMonth() + 1).padStart(2, "0");
  const nd = String(dt.getDate()).padStart(2, "0");
  return `${ny}-${nm}-${nd}`;
}

function windowLabel(windowType: string): string {
  return WINDOW_OPTIONS.find((w) => w.value === windowType)?.label ?? windowType;
}

function tierLabel(tier: string): string {
  if (tier === "TIER_1_ACTION") return "Action Required";
  if (tier === "TIER_2_UPDATE") return "Important Update";
  return "FYI";
}

export default function EmailDigestPage() {
  const router = useRouter();
  const [date, setDate] = useState(todayDateString());
  const [digest, setDigest] = useState<Digest | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedDrafts, setExpandedDrafts] = useState<Set<string>>(new Set());
  const [collapsedWindows, setCollapsedWindows] = useState<Set<string>>(new Set());
  const [showTier3, setShowTier3] = useState(false);

  const loadDigest = useCallback(async (d: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/email-digest/${d}`);
      if (res.status === 403 || res.status === 401) {
        router.push("/");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setDigest(data.digest);
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadDigest(date);
  }, [date, loadDigest]);

  async function handleAction(itemId: string, action: "done" | "undone" | "task") {
    setActionLoading(itemId);
    try {
      const body = action === "task"
        ? { convertToTask: true }
        : { isActioned: action === "done" };

      await fetch(`/api/email-digest/items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      loadDigest(date);
    } finally {
      setActionLoading(null);
    }
  }

  function toggleDraft(id: string) {
    setExpandedDrafts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleWindow(windowType: string) {
    setCollapsedWindows((prev) => {
      const next = new Set(prev);
      if (next.has(windowType)) next.delete(windowType);
      else next.add(windowType);
      return next;
    });
  }

  // Stats
  const allItems = digest?.windows.flatMap((w) => w.items) ?? [];
  const actionCount = allItems.filter((i) => i.tier === "TIER_1_ACTION").length;
  const unactionedCount = allItems.filter((i) => !i.isActioned).length;
  const draftsReady = allItems.filter((i) => i.needsResponse && i.draftResponse).length;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Email Digest</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {date === todayDateString() ? "Today" : formatDisplayDate(date)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDate(shiftDate(date, -1))}
            className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            &larr; Prev
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {date !== todayDateString() && (
            <button
              onClick={() => setDate(todayDateString())}
              className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Today
            </button>
          )}
          {date !== todayDateString() && (
            <button
              onClick={() => setDate(shiftDate(date, 1))}
              className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Next &rarr;
            </button>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      {digest && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
            <div className="text-xs text-gray-500 dark:text-gray-400">Action Items</div>
            <div className={`text-2xl font-bold ${actionCount > 0 ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-gray-100"}`}>
              {actionCount}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
            <div className="text-xs text-gray-500 dark:text-gray-400">Unactioned</div>
            <div className={`text-2xl font-bold ${unactionedCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-gray-900 dark:text-gray-100"}`}>
              {unactionedCount}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
            <div className="text-xs text-gray-500 dark:text-gray-400">Drafts Ready</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{draftsReady}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
            <div className="text-xs text-gray-500 dark:text-gray-400">Windows</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {digest.windows.length}<span className="text-sm text-gray-400">/4</span>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">Loading digest...</div>
      )}

      {/* Empty State */}
      {!loading && !digest && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">No digest data for {formatDisplayDate(date)}.</p>
        </div>
      )}

      {/* Windows */}
      {digest && digest.windows.map((window) => {
        const isCollapsed = collapsedWindows.has(window.windowType);
        const tier1Items = window.items.filter((i) => i.tier === "TIER_1_ACTION");
        const tier2Items = window.items.filter((i) => i.tier === "TIER_2_UPDATE");
        const tier3Items = window.items.filter((i) => i.tier === "TIER_3_FYI");

        return (
          <div key={window.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-4 overflow-hidden">
            {/* Window Header */}
            <button
              onClick={() => toggleWindow(window.windowType)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${isCollapsed ? "" : "rotate-90"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                <div className="text-left">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {windowLabel(window.windowType)} Briefing
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                    ({window.windowStart} &rarr; {window.windowEnd})
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span>{window.totalEmails} emails</span>
                {window.actionRequired > 0 && (
                  <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 rounded font-medium">
                    {window.actionRequired} action
                  </span>
                )}
              </div>
            </button>

            {/* Window Content */}
            {!isCollapsed && (
              <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 space-y-3">
                {/* TIER 1 */}
                {tier1Items.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider mb-2">
                      Action Required ({tier1Items.length})
                    </h4>
                    <div className="space-y-2">
                      {tier1Items.map((item) => renderItem(item, "TIER_1_ACTION"))}
                    </div>
                  </div>
                )}

                {/* TIER 2 */}
                {tier2Items.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-2">
                      Important Updates ({tier2Items.length})
                    </h4>
                    <div className="space-y-2">
                      {tier2Items.map((item) => renderItem(item, "TIER_2_UPDATE"))}
                    </div>
                  </div>
                )}

                {/* TIER 3 */}
                {tier3Items.length > 0 && (
                  <div>
                    <button
                      onClick={() => setShowTier3(!showTier3)}
                      className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      FYI ({tier3Items.length})
                      <svg className={`w-3 h-3 transition-transform ${showTier3 ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    {showTier3 && (
                      <div className="space-y-2">
                        {tier3Items.map((item) => renderItem(item, "TIER_3_FYI"))}
                      </div>
                    )}
                  </div>
                )}

                {window.items.length === 0 && (
                  <p className="text-sm text-gray-400 dark:text-gray-500 py-2">No items in this window.</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  function renderItem(item: DigestItem, tier: string) {
    const colors = TIER_COLORS[tier as keyof typeof TIER_COLORS];
    const isDraftExpanded = expandedDrafts.has(item.id);

    return (
      <div
        key={item.id}
        className={`${colors.bg} ${colors.border} rounded-md p-3 ${item.isActioned ? "opacity-60" : ""}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {/* Header row */}
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {item.sender}
              </span>
              {item.senderEmail && (
                <span className="text-[10px] text-gray-400 dark:text-gray-500">{item.senderEmail}</span>
              )}
              <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded">
                {item.folder}
              </span>
              {item.hasAttachment && (
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              )}
              {item.threadSize > 1 && (
                <span className="text-[10px] text-gray-400">{item.threadSize} msgs</span>
              )}
              {item.isCarriedForward && (
                <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded">
                  carried forward
                </span>
              )}
              {item.isDeadline && item.deadlineDate && (
                <span className="text-[10px] px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded font-medium">
                  deadline: {new Date(item.deadlineDate).toLocaleDateString("en-AU")}
                </span>
              )}
              {item.convertedToTaskId && (
                <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                  task created
                </span>
              )}
            </div>

            {/* Subject */}
            <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">{item.subject}</p>

            {/* Summary */}
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{item.summary}</p>

            {/* Action needed */}
            {item.actionNeeded && (
              <p className="text-xs text-red-700 dark:text-red-400 mt-1 font-medium">
                Action: {item.actionNeeded}
              </p>
            )}

            {/* Draft response toggle */}
            {item.needsResponse && item.draftResponse && (
              <div className="mt-2">
                <button
                  onClick={() => toggleDraft(item.id)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                >
                  {isDraftExpanded ? "Hide draft" : "View draft response"}
                </button>
                {isDraftExpanded && (
                  <div className="mt-1.5 p-2.5 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                    {item.draftContext && (
                      <p className="text-[10px] text-gray-400 mb-1.5 italic">{item.draftContext}</p>
                    )}
                    <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans">
                      {item.draftResponse}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => handleAction(item.id, item.isActioned ? "undone" : "done")}
              disabled={actionLoading === item.id}
              className={`p-1.5 rounded transition-colors disabled:opacity-50 ${
                item.isActioned
                  ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                  : "hover:bg-green-100 dark:hover:bg-green-900/30 text-gray-400 hover:text-green-600 dark:hover:text-green-400"
              }`}
              title={item.isActioned ? "Mark undone" : "Mark done"}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </button>
            {!item.convertedToTaskId && (
              <button
                onClick={() => handleAction(item.id, "task")}
                disabled={actionLoading === item.id}
                className="p-1.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50"
                title="Create task"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
