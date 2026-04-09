"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Modal } from "@/components/Modal";
import { DashboardWidget } from "@/components/DashboardWidget";
import { EmailDigestWidget } from "@/components/EmailDigestWidget";
import {
  PRIORITY_OPTIONS,
  FREQUENCY_OPTIONS,
  SCHEDULE_OPTIONS,
  RECURRING_CATEGORY_OPTIONS,
} from "@/modules/tasks/constants";
import { DIARY_TYPE_OPTIONS } from "@/modules/diary/constants";
import { Assignee, assigneeName, tomorrowISO } from "./tasks/types";
import { todayISO } from "./diary/types";
import { PeopleTagInput } from "./diary/PeopleTagInput";

interface DashboardTask {
  id: string;
  title: string;
  dueDate: string | null;
  priority: string;
  status: string;
  assigneeId: string;
}

interface DashboardRecurring {
  id: string;
  title: string;
  nextDue: string | null;
  frequencyType: string;
  frequencyValue: number;
  assigneeId: string;
  lastCompleted: string | null;
  description: string | null;
  category: string;
  scheduleType: string;
}

interface DashboardNote {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface DashboardData {
  activeTaskCount: number;
  pendingTaskCount: number;
  overdueTaskCount: number;
  overdueRecurringCount: number;
  dueTodayTaskCount: number;
  dueTodayRecurringCount: number;
  completedRecentCount: number;
  overdueTasks: DashboardTask[];
  overdueRecurringTasks: DashboardRecurring[];
  dueTodayTasks: DashboardTask[];
  dueTodayRecurringTasks: DashboardRecurring[];
  dueSoonTasks: DashboardTask[];
  highPriorityTasks: DashboardTask[];
  upcomingRecurring: DashboardRecurring[];
  recentNotes: DashboardNote[];
  totalNoteCount: number;
  assigneeMap: Record<string, string>;
  materials: {
    lowStockItems: {
      itemCode: string;
      itemDescription: string;
      unitOfMeasure: string;
      locationName: string;
      currentStock: number;
      minimumStockLevel: number | null;
    }[];
    recentJobActivity: {
      jobId: string;
      projectId: string;
      jobName: string;
      client: string;
      movementCount: number;
      movementTypes: string[];
      lastActivity: string;
      totalIssued: number;
    }[];
    recentGeneralMovements: {
      id: string;
      quantity: string;
      movementType: string;
      createdAt: string;
      item: { code: string; description: string };
      fromLocation: { name: string } | null;
      toLocation: { name: string } | null;
    }[];
    openStocktakes: {
      id: string;
      createdAt: string;
      location: { name: string };
      _count: { lines: number };
    }[];
    pendingJobMaterials: {
      id: string;
      projectId: string;
      name: string;
      client: string;
      _count: { materials: number };
    }[];
    pendingClientReturns: {
      id: string;
      quantity: string;
      item: { code: string; description: string };
      job: { projectId: string; name: string; client: string } | null;
    }[];
  };
  emailDigest: {
    enabled: boolean;
    unactionedCount: number;
    totalUnactioned: number;
    totalDraftsReady: number;
    windowsCompleted: number;
  } | null;
}

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  RECEIVED: "Received",
  RECEIVED_FREE_ISSUE: "Free Issue",
  ISSUED: "Issued",
  TRANSFERRED: "Transferred",
  RETURNED_FROM_JOB: "Returned",
  RETURNED_TO_SUPPLIER: "Returned to Supplier",
  ADJUSTED: "Adjustment",
};

const PRIORITY_BADGE: Record<string, string> = {
  LOW: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  MEDIUM: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
  HIGH: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
};

function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return "No date";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit" });
}

function formatNoteDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-AU", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function frequencyLabel(type: string, value: number): string {
  const opt = FREQUENCY_OPTIONS.find((o) => o.value === type);
  const label = opt?.label ?? type;
  if (value === 1) return label;
  return `Every ${value} ${label.toLowerCase()}`;
}

// PLACEHOLDER: handlers and render will be added below
export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [assignees, setAssignees] = useState<Assignee[]>([]);

  // Modal state
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddRecurring, setShowAddRecurring] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Note modal state
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [noteSaveStatus, setNoteSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Edit note modal (for clicking existing notes)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState("");

  // Email digest state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [digestData, setDigestData] = useState<{ digest: any; stats: any } | null>(null);

  // Diary entry modal state
  const [showAddDiary, setShowAddDiary] = useState(false);
  const [diaryType, setDiaryType] = useState<"NOTE" | "EVENT" | "CONVERSATION">("NOTE");
  const [diaryDate, setDiaryDate] = useState(todayISO());
  const [diaryHeading, setDiaryHeading] = useState("");
  const [diaryPeople, setDiaryPeople] = useState<string[]>([]);
  const [diaryContent, setDiaryContent] = useState("");
  const [diaryImportant, setDiaryImportant] = useState(false);
  const [diaryAllPeople, setDiaryAllPeople] = useState<string[]>([]);
  const [diarySaving, setDiarySaving] = useState(false);

  const loadDashboard = useCallback(async () => {
    const res = await fetch("/api/dashboard");
    if (res.ok) {
      const dashData = await res.json();
      setData(dashData);
      // If user has email digest access, fetch the full digest for the widget
      if (dashData.emailDigest) {
        fetch("/api/email-digest")
          .then((r) => r.ok ? r.json() : null)
          .then((d) => { if (d?.digest) setDigestData(d); })
          .catch(() => {});
      }
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((sess) => { if (sess?.user?.role === "ADMIN") setIsAdmin(true); })
      .catch(() => {});
    fetch("/api/assignees")
      .then((r) => (r.ok ? r.json() : []))
      .then(setAssignees)
      .catch(() => {});
  }, [loadDashboard]);

  // --- ACTION HANDLERS ---

  async function handleCompleteTask(id: string) {
    await fetch(`/api/tasks/${id}/complete`, { method: "POST" });
    loadDashboard();
  }

  async function handleCompleteRecurring(id: string) {
    await fetch(`/api/recurring-tasks/${id}/complete`, { method: "POST" });
    loadDashboard();
  }

  async function handleCreateTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const fd = new FormData(e.currentTarget);
      const body = {
        title: fd.get("title"),
        projectId: fd.get("projectId") || null,
        notes: fd.get("notes") || null,
        label: fd.get("label") || "Task",
        dueDate: fd.get("dueDate") || null,
        status: "NOT_STARTED",
        priority: fd.get("priority") || "LOW",
        assigneeId: fd.get("assigneeId"),
      };
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowAddTask(false);
        loadDashboard();
      } else {
        const err = await res.json().catch(() => null);
        setError(err?.error || `Failed to create task (${res.status})`);
      }
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : "Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateRecurring(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const fd = new FormData(e.currentTarget);
      const body = {
        title: fd.get("title"),
        description: fd.get("description") || null,
        category: fd.get("category") || "Task",
        frequencyType: fd.get("frequencyType") || "WEEKLY",
        frequencyValue: parseInt(String(fd.get("frequencyValue") || "1"), 10),
        scheduleType: fd.get("scheduleType") || "FLOATING",
        lastCompleted: fd.get("lastCompleted") || null,
        assigneeId: fd.get("assigneeId"),
      };
      const res = await fetch("/api/recurring-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowAddRecurring(false);
        loadDashboard();
      } else {
        const err = await res.json().catch(() => null);
        setError(err?.error || `Failed to create recurring task (${res.status})`);
      }
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : "Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleNewNote() {
    const res = await fetch("/api/notes", { method: "POST" });
    if (res.ok) {
      const note = await res.json();
      setNoteId(note.id);
      setNoteContent("");
      setNoteSaveStatus("idle");
      setNoteModalOpen(true);
    }
  }

  function handleNoteChange(content: string) {
    setNoteContent(content);
    if (!noteId) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setNoteSaveStatus("saving");
    const id = noteId;
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/notes/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        setNoteSaveStatus("saved");
      } catch {
        setNoteSaveStatus("idle");
      }
    }, 1000);
  }

  function handleCloseNote() {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    if (noteId && noteContent) {
      fetch(`/api/notes/${noteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: noteContent }),
      });
    }
    setNoteModalOpen(false);
    setNoteId(null);
    setNoteContent("");
    setNoteSaveStatus("idle");
    loadDashboard();
  }

  function handleEditNote(note: DashboardNote) {
    setEditingNoteId(note.id);
    setEditingNoteContent(note.content);
    setNoteSaveStatus("idle");
  }

  function handleEditNoteChange(content: string) {
    setEditingNoteContent(content);
    if (!editingNoteId) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setNoteSaveStatus("saving");
    const id = editingNoteId;
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/notes/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        setNoteSaveStatus("saved");
      } catch {
        setNoteSaveStatus("idle");
      }
    }, 1000);
  }

  function handleCloseEditNote() {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    if (editingNoteId && editingNoteContent) {
      fetch(`/api/notes/${editingNoteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editingNoteContent }),
      });
    }
    setEditingNoteId(null);
    setEditingNoteContent("");
    setNoteSaveStatus("idle");
    loadDashboard();
  }

  const totalOverdue = (data?.overdueTaskCount ?? 0) + (data?.overdueRecurringCount ?? 0);
  const totalDueToday = (data?.dueTodayTaskCount ?? 0) + (data?.dueTodayRecurringCount ?? 0);

  // Combine needs-attention items
  const needsAttentionItems: { id: string; title: string; type: "task" | "recurring"; urgency: "overdue" | "due-today" | "due-soon" | "high-priority"; date: string | null; priority?: string; assigneeId: string }[] = [];
  if (data) {
    for (const t of data.overdueTasks) needsAttentionItems.push({ id: t.id, title: t.title, type: "task", urgency: "overdue", date: t.dueDate, priority: t.priority, assigneeId: t.assigneeId });
    for (const t of data.overdueRecurringTasks) needsAttentionItems.push({ id: t.id, title: t.title, type: "recurring", urgency: "overdue", date: t.nextDue, assigneeId: t.assigneeId });
    for (const t of data.dueTodayTasks) needsAttentionItems.push({ id: t.id, title: t.title, type: "task", urgency: "due-today", date: t.dueDate, priority: t.priority, assigneeId: t.assigneeId });
    for (const t of data.dueTodayRecurringTasks) needsAttentionItems.push({ id: t.id, title: t.title, type: "recurring", urgency: "due-today", date: t.nextDue, assigneeId: t.assigneeId });
    for (const t of data.dueSoonTasks) needsAttentionItems.push({ id: t.id, title: t.title, type: "task", urgency: "due-soon", date: t.dueDate, priority: t.priority, assigneeId: t.assigneeId });
    for (const t of data.highPriorityTasks) {
      if (!needsAttentionItems.find((i) => i.id === t.id)) {
        needsAttentionItems.push({ id: t.id, title: t.title, type: "task", urgency: "high-priority", date: t.dueDate, priority: t.priority, assigneeId: t.assigneeId });
      }
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4 dark:text-gray-100">Dashboard</h1>

      {/* ─── Quick Actions Bar ─────────────────────────────── */}
      {isAdmin && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => { setShowAddTask(true); setError(""); }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Quick Task
          </button>
          <button
            onClick={() => { setShowAddRecurring(true); setError(""); }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Recurring Task
          </button>
          <button
            onClick={handleNewNote}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Quick Note
          </button>
          <button
            onClick={() => {
              setDiaryType("NOTE");
              setDiaryDate(todayISO());
              setDiaryHeading("");
              setDiaryPeople([]);
              setDiaryContent("");
              setDiaryImportant(false);
              setShowAddDiary(true);
              fetch("/api/diary/people").then((r) => r.ok ? r.json() : []).then(setDiaryAllPeople).catch(() => {});
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Diary Entry
          </button>
        </div>
      )}

      {/* ─── Email Digest Widget (owner only) ─────────────── */}
      {digestData && (
        <div className="mb-6">
          <EmailDigestWidget
            digest={digestData.digest}
            stats={digestData.stats}
            onRefresh={loadDashboard}
          />
        </div>
      )}

      {/* ─── Summary Stats ─────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <div className="text-xs text-gray-500 dark:text-gray-400">Active Tasks</div>
          {data ? <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.activeTaskCount}</div> : <div className="h-7 w-10 bg-gray-200 dark:bg-gray-600 rounded animate-pulse mt-1" />}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <div className="text-xs text-gray-500 dark:text-gray-400">Due Today</div>
          {data ? <div className={`text-2xl font-bold ${totalDueToday > 0 ? "text-blue-600 dark:text-blue-400" : "text-gray-900 dark:text-gray-100"}`}>{totalDueToday}</div> : <div className="h-7 w-10 bg-gray-200 dark:bg-gray-600 rounded animate-pulse mt-1" />}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <div className="text-xs text-gray-500 dark:text-gray-400">Overdue</div>
          {data ? <div className={`text-2xl font-bold ${totalOverdue > 0 ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-gray-100"}`}>{totalOverdue}</div> : <div className="h-7 w-10 bg-gray-200 dark:bg-gray-600 rounded animate-pulse mt-1" />}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <div className="text-xs text-gray-500 dark:text-gray-400">Completed (7d)</div>
          {data ? <div className="text-2xl font-bold text-green-600 dark:text-green-400">{data.completedRecentCount}</div> : <div className="h-7 w-10 bg-gray-200 dark:bg-gray-600 rounded animate-pulse mt-1" />}
        </div>
      </div>

      {/* ─── Main Grid: Left + Right columns ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* ─── LEFT: Needs Attention ───────────────────────── */}
        <DashboardWidget
          title="Needs Attention"
          badge={needsAttentionItems.length}
          badgeColor={totalOverdue > 0 ? "bg-red-500" : "bg-blue-500"}
          viewAllHref="/tasks"
          viewAllLabel="Open Task Manager"
        >
          {needsAttentionItems.length === 0 ? (
            <div className="text-sm text-gray-400 dark:text-gray-500 py-6 text-center">All clear — nothing needs attention right now.</div>
          ) : (
            <div className="space-y-1 max-h-[400px] overflow-y-auto">
              {needsAttentionItems.map((item) => {
                const urgencyColors: Record<string, string> = {
                  overdue: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
                  "due-today": "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
                  "due-soon": "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
                  "high-priority": "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
                };
                const urgencyLabels: Record<string, string> = {
                  overdue: "Overdue",
                  "due-today": "Due Today",
                  "due-soon": "Due Soon",
                  "high-priority": "High Priority",
                };
                return (
                  <div key={`${item.type}-${item.id}`} className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm ${item.urgency === "overdue" ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" : item.urgency === "due-today" ? "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800" : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"}`}>
                    {isAdmin && (
                      <button
                        onClick={() => item.type === "task" ? handleCompleteTask(item.id) : handleCompleteRecurring(item.id)}
                        className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 transition-colors shrink-0"
                        title={item.type === "task" ? "Complete" : "Mark done"}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      </button>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-gray-900 dark:text-gray-100 truncate block">{item.title}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {data?.assigneeMap[item.assigneeId] || "Unassigned"}
                        {item.date ? ` · ${formatShortDate(item.date)}` : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${urgencyColors[item.urgency]}`}>
                        {urgencyLabels[item.urgency]}
                      </span>
                      {item.type === "recurring" && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">Recurring</span>
                      )}
                      {item.priority && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${PRIORITY_BADGE[item.priority] || ""}`}>{item.priority}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DashboardWidget>

        {/* ─── RIGHT: Upcoming Recurring ───────────────────── */}
        <DashboardWidget
          title="Upcoming Recurring Tasks"
          viewAllHref="/tasks"
          viewAllLabel="Open Task Manager"
        >
          {!data || data.upcomingRecurring.length === 0 ? (
            <div className="text-sm text-gray-400 dark:text-gray-500 py-6 text-center">No upcoming recurring tasks.</div>
          ) : (
            <div className="space-y-1 max-h-[400px] overflow-y-auto">
              {data.upcomingRecurring.map((task) => (
                <div key={task.id} className="flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm">
                  {isAdmin && (
                    <button
                      onClick={() => handleCompleteRecurring(task.id)}
                      className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 transition-colors shrink-0"
                      title="Mark done"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    </button>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-gray-900 dark:text-gray-100 truncate block">{task.title}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {data.assigneeMap[task.assigneeId] || "Unassigned"} · {frequencyLabel(task.frequencyType, task.frequencyValue)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                    {formatShortDate(task.nextDue)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashboardWidget>
      </div>

      {/* ─── Second Row: Notes + Materials ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* ─── Recent Quick Notes ──────────────────────────── */}
        <DashboardWidget
          title="Recent Quick Notes"
          badge={data && data.totalNoteCount > 4 ? data.totalNoteCount - 4 : undefined}
          badgeColor="bg-amber-500"
          action={isAdmin ? { label: "+ New Note", onClick: handleNewNote } : undefined}
          viewAllHref="/tasks"
          viewAllLabel={data && data.totalNoteCount > 4 ? `View all ${data.totalNoteCount} notes` : "View all notes"}
        >
          {!data || data.recentNotes.length === 0 ? (
            <div className="text-sm text-gray-400 dark:text-gray-500 py-6 text-center">No notes yet.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {data.recentNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => handleEditNote(note)}
                  className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 cursor-pointer hover:shadow-md hover:bg-amber-100/70 dark:hover:bg-amber-900/30 transition-all"
                >
                  <div className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap line-clamp-3 mb-2 min-h-[2.5rem]">
                    {note.content || <span className="text-gray-400 dark:text-gray-500 italic">Empty note</span>}
                  </div>
                  <div className="text-[10px] text-gray-400 dark:text-gray-500">{formatNoteDate(note.updatedAt)}</div>
                </div>
              ))}
            </div>
          )}
        </DashboardWidget>

        {/* ─── Materials Snapshot ──────────────────────────── */}
        <DashboardWidget
          title="Materials"
          viewAllHref="/materials"
          viewAllLabel="Open Materials"
        >
          {!data?.materials ? (
            <div className="text-sm text-gray-400 dark:text-gray-500 py-6 text-center">Loading materials...</div>
          ) : (
            <div className="space-y-3">
              {/* Recent job activity */}
              {data.materials.recentJobActivity.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Recent Job Activity</div>
                  <div className="space-y-1">
                    {data.materials.recentJobActivity.map((j) => (
                      <Link key={j.jobId} href={`/materials/jobs/${j.jobId}`} className="flex items-center justify-between text-xs border-b border-gray-100 dark:border-gray-700 pb-1 hover:bg-gray-50 dark:hover:bg-gray-700 -mx-1 px-1 rounded">
                        <div className="min-w-0">
                          <span className="font-mono font-medium">{j.projectId}</span>{" "}
                          <span className="text-gray-600 dark:text-gray-400 truncate">{j.jobName}</span>
                          <span className="text-gray-400 dark:text-gray-500 ml-1">({j.client})</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <div className="flex gap-0.5">
                            {j.movementTypes.slice(0, 2).map((t) => (
                              <span key={t} className="inline-block px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-[10px] font-medium">
                                {MOVEMENT_TYPE_LABELS[t] || t}
                              </span>
                            ))}
                          </div>
                          <span className="text-gray-400 dark:text-gray-500">{j.movementCount} mov</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* General stock movements (non-job) */}
              {data.materials.recentGeneralMovements.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Stock Movements</div>
                  <div className="space-y-1">
                    {data.materials.recentGeneralMovements.slice(0, 5).map((m) => (
                      <div key={m.id} className="text-xs flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-1">
                        <span>
                          <span className="inline-block px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-[10px] font-medium mr-1">
                            {MOVEMENT_TYPE_LABELS[m.movementType] || m.movementType}
                          </span>
                          <span className="font-mono">{m.item.code}</span>
                          <span className="text-gray-400 dark:text-gray-500 ml-1">x{Number(m.quantity)}</span>
                        </span>
                        <span className="text-gray-400 dark:text-gray-500">{new Date(m.createdAt).toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit" })}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Jobs awaiting materials */}
              {data.materials.pendingJobMaterials.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Awaiting Materials</div>
                  <div className="space-y-1">
                    {data.materials.pendingJobMaterials.map((j) => (
                      <Link key={j.id} href={`/materials/jobs/${j.id}`} className="flex items-center justify-between text-xs border-b border-gray-100 dark:border-gray-700 pb-1 hover:bg-gray-50 dark:hover:bg-gray-700 -mx-1 px-1 rounded">
                        <div>
                          <span className="font-mono font-medium">{j.projectId}</span>{" "}
                          <span className="text-gray-600 dark:text-gray-400">{j.name}</span>
                          <span className="text-gray-400 dark:text-gray-500 ml-1">({j.client})</span>
                        </div>
                        <span className="text-amber-600 dark:text-amber-400 font-medium">{j._count.materials} item{j._count.materials !== 1 ? "s" : ""}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Client returns due */}
              {data.materials.pendingClientReturns.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-1">Client Returns Due</div>
                  <div className="space-y-1">
                    {data.materials.pendingClientReturns.map((r) => (
                      <div key={r.id} className="text-xs flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-1">
                        <div>
                          <span className="font-mono font-medium">{r.item.code}</span>{" "}
                          <span className="text-gray-500 dark:text-gray-400">{r.item.description}</span>
                          {r.job && <span className="text-gray-400 dark:text-gray-500 ml-1">({r.job.projectId})</span>}
                        </div>
                        <span className="text-orange-600 dark:text-orange-400 font-medium">x{Number(r.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Low stock alerts */}
              {data.materials.lowStockItems.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">Low Stock ({data.materials.lowStockItems.length})</div>
                  <div className="space-y-1">
                    {data.materials.lowStockItems.slice(0, 3).map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-xs border-b border-gray-100 dark:border-gray-700 pb-1">
                        <div>
                          <span className="font-mono font-medium">{item.itemCode}</span>{" "}
                          <span className="text-gray-500 dark:text-gray-400">{item.itemDescription}</span>
                          <span className="text-gray-400 dark:text-gray-500 ml-1">@ {item.locationName}</span>
                        </div>
                        <div className="text-red-600 dark:text-red-400 font-medium">{item.currentStock} / {item.minimumStockLevel}</div>
                      </div>
                    ))}
                    {data.materials.lowStockItems.length > 3 && (
                      <Link href="/materials/stock?belowMinimum=true" className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                        +{data.materials.lowStockItems.length - 3} more
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {/* Open stocktakes */}
              {data.materials.openStocktakes.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Open Stocktakes</div>
                  {data.materials.openStocktakes.map((st) => (
                    <div key={st.id} className="flex items-center justify-between text-xs pb-1">
                      <div>
                        <span className="font-medium">{st.location.name}</span>
                        <span className="text-gray-400 dark:text-gray-500 ml-2">{st._count.lines} items</span>
                      </div>
                      <Link href={`/materials/stocktakes/${st.id}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">Continue</Link>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {data.materials.recentJobActivity.length === 0 &&
                data.materials.recentGeneralMovements.length === 0 &&
                data.materials.pendingJobMaterials.length === 0 &&
                data.materials.lowStockItems.length === 0 && (
                <div className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">No recent stock activity</div>
              )}
            </div>
          )}
        </DashboardWidget>
      </div>

      {/* ─── New Note Modal ──────────────────────────────── */}
      {noteModalOpen && (
        <Modal isOpen onClose={handleCloseNote} wide>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Quick Note</h2>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {noteSaveStatus === "saving" && "Saving..."}
              {noteSaveStatus === "saved" && "Saved"}
            </span>
          </div>
          <textarea
            value={noteContent}
            onChange={(e) => handleNoteChange(e.target.value)}
            rows={12}
            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            placeholder="Type your note here..."
            autoFocus
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Your note is auto-saved. Close this modal when done.</p>
        </Modal>
      )}

      {/* ─── Edit Note Modal ─────────────────────────────── */}
      {editingNoteId && (
        <Modal isOpen onClose={handleCloseEditNote} wide>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Edit Note</h2>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {noteSaveStatus === "saving" && "Saving..."}
              {noteSaveStatus === "saved" && "Saved"}
            </span>
          </div>
          <textarea
            value={editingNoteContent}
            onChange={(e) => handleEditNoteChange(e.target.value)}
            rows={12}
            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            placeholder="Type your note here..."
            autoFocus
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Your note is auto-saved. Close this modal when done.</p>
        </Modal>
      )}

      {/* ─── Add Task Modal ──────────────────────────────── */}
      {showAddTask && (
        <Modal isOpen onClose={() => setShowAddTask(false)}>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Add Quick Task</h2>
          <form onSubmit={handleCreateTask} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Task Title *</label>
              <input name="title" required className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="What needs to be done?" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assignee *</label>
                <select name="assigneeId" required className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select assignee...</option>
                  {assignees.map((e) => (
                    <option key={e.id} value={e.id}>{assigneeName(e)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project ID</label>
                <input name="projectId" className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., NBN-001" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
                <input name="dueDate" type="date" defaultValue={tomorrowISO()} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                <select name="priority" defaultValue="LOW" className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {PRIORITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Label</label>
                <input name="label" defaultValue="Task" className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Task, Meeting, Report" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
              <textarea name="notes" rows={2} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Additional details..." />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">{saving ? "Adding..." : "Add Task"}</button>
              <button type="button" onClick={() => setShowAddTask(false)} className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─── Add Diary Entry Modal ─────────────────────── */}
      {showAddDiary && (
        <Modal isOpen onClose={() => setShowAddDiary(false)} title="New Diary Entry" wide>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
              <select
                value={diaryType}
                onChange={(e) => setDiaryType(e.target.value as "NOTE" | "EVENT" | "CONVERSATION")}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                {DIARY_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
              <input
                type="date"
                value={diaryDate}
                onChange={(e) => setDiaryDate(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Heading</label>
              <input
                type="text"
                value={diaryHeading}
                onChange={(e) => setDiaryHeading(e.target.value)}
                placeholder="Brief summary..."
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">People involved</label>
              <PeopleTagInput value={diaryPeople} onChange={setDiaryPeople} allPeople={diaryAllPeople} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Details</label>
              <textarea
                value={diaryContent}
                onChange={(e) => setDiaryContent(e.target.value)}
                rows={6}
                placeholder="Enter details..."
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-y"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={diaryImportant}
                onChange={(e) => setDiaryImportant(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <span className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" />
                Mark as important
              </span>
            </label>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddDiary(false)}
                className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!diaryHeading.trim()) return;
                  setDiarySaving(true);
                  setError("");
                  try {
                    const res = await fetch("/api/diary", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        type: diaryType,
                        date: diaryDate,
                        heading: diaryHeading.trim(),
                        people: diaryPeople,
                        content: diaryContent,
                        isImportant: diaryImportant,
                      }),
                    });
                    if (res.ok) {
                      setShowAddDiary(false);
                    } else {
                      const err = await res.json().catch(() => null);
                      setError(err?.error || `Failed to create entry (${res.status})`);
                    }
                  } catch (ex) {
                    setError(ex instanceof Error ? ex.message : "Network error");
                  } finally {
                    setDiarySaving(false);
                  }
                }}
                disabled={diarySaving || !diaryHeading.trim()}
                className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md transition-colors"
              >
                {diarySaving ? "Saving..." : "Create Entry"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── Add Recurring Task Modal ────────────────────── */}
      {showAddRecurring && (
        <Modal isOpen onClose={() => setShowAddRecurring(false)}>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Add Recurring Task</h2>
          <form onSubmit={handleCreateRecurring} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Task Title *</label>
              <input name="title" required className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="What recurring task needs tracking?" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assignee *</label>
                <select name="assigneeId" required className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select assignee...</option>
                  {assignees.map((e) => (
                    <option key={e.id} value={e.id}>{assigneeName(e)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <select name="category" defaultValue="Task" className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {RECURRING_CATEGORY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Frequency</label>
                <select name="frequencyType" defaultValue="WEEKLY" className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {FREQUENCY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Every</label>
                <input name="frequencyValue" type="number" min={1} defaultValue={1} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Schedule Type</label>
                <select name="scheduleType" defaultValue="FLOATING" className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {SCHEDULE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Completed</label>
              <input name="lastCompleted" type="date" className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea name="description" rows={2} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Additional details..." />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">{saving ? "Adding..." : "Add Recurring Task"}</button>
              <button type="button" onClick={() => setShowAddRecurring(false)} className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
