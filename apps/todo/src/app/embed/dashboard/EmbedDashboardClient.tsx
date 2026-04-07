"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { EmbedAuthProvider } from "@/components/EmbedAuthProvider";
import type { EmbedUser } from "@/components/EmbedAuthProvider";
import { Modal } from "@/components/Modal";
import { DashboardWidget } from "@/components/DashboardWidget";
import {
  PRIORITY_OPTIONS,
  FREQUENCY_OPTIONS,
  SCHEDULE_OPTIONS,
  RECURRING_CATEGORY_OPTIONS,
} from "@/modules/tasks/constants";
import { Assignee, assigneeName, tomorrowISO } from "@/app/tasks/types";

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
}

interface DashboardNote {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface DashboardData {
  activeTaskCount: number;
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
}

const PRIORITY_BADGE: Record<string, string> = {
  LOW: "bg-green-100 text-green-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-red-100 text-red-700",
};

function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return "No date";
  return new Date(dateStr).toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit" });
}

function formatNoteDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-AU", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function frequencyLabel(type: string, value: number): string {
  const opt = FREQUENCY_OPTIONS.find((o) => o.value === type);
  const label = opt?.label ?? type;
  return value === 1 ? label : `Every ${value} ${label.toLowerCase()}`;
}

function EmbedDashboardInner() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddRecurring, setShowAddRecurring] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [noteSaveStatus, setNoteSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState("");

  const loadDashboard = useCallback(async () => {
    const res = await fetch("/api/dashboard");
    if (res.ok) setData(await res.json());
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
      if (res.ok) { setShowAddTask(false); loadDashboard(); }
      else {
        const err = await res.json().catch(() => null);
        setError(err?.error || `Failed (${res.status})`);
      }
    } catch (ex) { setError(ex instanceof Error ? ex.message : "Network error"); }
    finally { setSaving(false); }
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
      if (res.ok) { setShowAddRecurring(false); loadDashboard(); }
      else {
        const err = await res.json().catch(() => null);
        setError(err?.error || `Failed (${res.status})`);
      }
    } catch (ex) { setError(ex instanceof Error ? ex.message : "Network error"); }
    finally { setSaving(false); }
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
        await fetch(`/api/notes/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) });
        setNoteSaveStatus("saved");
      } catch { setNoteSaveStatus("idle"); }
    }, 1000);
  }

  function handleCloseNote() {
    if (autoSaveTimerRef.current) { clearTimeout(autoSaveTimerRef.current); autoSaveTimerRef.current = null; }
    if (noteId && noteContent) {
      fetch(`/api/notes/${noteId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: noteContent }) });
    }
    setNoteModalOpen(false); setNoteId(null); setNoteContent(""); setNoteSaveStatus("idle"); loadDashboard();
  }

  function handleEditNote(note: DashboardNote) {
    setEditingNoteId(note.id); setEditingNoteContent(note.content); setNoteSaveStatus("idle");
  }

  function handleEditNoteChange(content: string) {
    setEditingNoteContent(content);
    if (!editingNoteId) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setNoteSaveStatus("saving");
    const id = editingNoteId;
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/notes/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) });
        setNoteSaveStatus("saved");
      } catch { setNoteSaveStatus("idle"); }
    }, 1000);
  }

  function handleCloseEditNote() {
    if (autoSaveTimerRef.current) { clearTimeout(autoSaveTimerRef.current); autoSaveTimerRef.current = null; }
    if (editingNoteId && editingNoteContent) {
      fetch(`/api/notes/${editingNoteId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: editingNoteContent }) });
    }
    setEditingNoteId(null); setEditingNoteContent(""); setNoteSaveStatus("idle"); loadDashboard();
  }

  const totalOverdue = (data?.overdueTaskCount ?? 0) + (data?.overdueRecurringCount ?? 0);
  const totalDueToday = (data?.dueTodayTaskCount ?? 0) + (data?.dueTodayRecurringCount ?? 0);

  const needsAttentionItems: { id: string; title: string; type: "task" | "recurring"; urgency: string; date: string | null; priority?: string; assigneeId: string }[] = [];
  if (data) {
    for (const t of data.overdueTasks) needsAttentionItems.push({ id: t.id, title: t.title, type: "task", urgency: "overdue", date: t.dueDate, priority: t.priority, assigneeId: t.assigneeId });
    for (const t of data.overdueRecurringTasks) needsAttentionItems.push({ id: t.id, title: t.title, type: "recurring", urgency: "overdue", date: t.nextDue, assigneeId: t.assigneeId });
    for (const t of data.dueTodayTasks) needsAttentionItems.push({ id: t.id, title: t.title, type: "task", urgency: "due-today", date: t.dueDate, priority: t.priority, assigneeId: t.assigneeId });
    for (const t of data.dueTodayRecurringTasks) needsAttentionItems.push({ id: t.id, title: t.title, type: "recurring", urgency: "due-today", date: t.nextDue, assigneeId: t.assigneeId });
    for (const t of data.dueSoonTasks) needsAttentionItems.push({ id: t.id, title: t.title, type: "task", urgency: "due-soon", date: t.dueDate, priority: t.priority, assigneeId: t.assigneeId });
    for (const t of data.highPriorityTasks) {
      if (!needsAttentionItems.find((i) => i.id === t.id)) needsAttentionItems.push({ id: t.id, title: t.title, type: "task", urgency: "high-priority", date: t.dueDate, priority: t.priority, assigneeId: t.assigneeId });
    }
  }

  const urgencyColors: Record<string, string> = { overdue: "bg-red-100 text-red-700", "due-today": "bg-orange-100 text-orange-700", "due-soon": "bg-yellow-100 text-yellow-700", "high-priority": "bg-red-100 text-red-700" };
  const urgencyLabels: Record<string, string> = { overdue: "Overdue", "due-today": "Due Today", "due-soon": "Due Soon", "high-priority": "High Priority" };

  return (
    <div className="p-3">
      {/* Quick Actions */}
      {isAdmin && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={() => { setShowAddTask(true); setError(""); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors shadow-sm">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Quick Task
          </button>
          <button onClick={() => { setShowAddRecurring(true); setError(""); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors shadow-sm">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Recurring Task
          </button>
          <button onClick={handleNewNote} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-medium hover:bg-amber-600 transition-colors shadow-sm">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Quick Note
          </button>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="bg-white rounded-lg border border-gray-200 p-2">
          <div className="text-[10px] text-gray-500">Active</div>
          {data ? <div className="text-lg font-bold text-gray-900">{data.activeTaskCount}</div> : <div className="h-5 w-8 bg-gray-200 rounded animate-pulse mt-1" />}
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-2">
          <div className="text-[10px] text-gray-500">Due Today</div>
          {data ? <div className={`text-lg font-bold ${totalDueToday > 0 ? "text-blue-600" : "text-gray-900"}`}>{totalDueToday}</div> : <div className="h-5 w-8 bg-gray-200 rounded animate-pulse mt-1" />}
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-2">
          <div className="text-[10px] text-gray-500">Overdue</div>
          {data ? <div className={`text-lg font-bold ${totalOverdue > 0 ? "text-red-600" : "text-gray-900"}`}>{totalOverdue}</div> : <div className="h-5 w-8 bg-gray-200 rounded animate-pulse mt-1" />}
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-2">
          <div className="text-[10px] text-gray-500">Done (7d)</div>
          {data ? <div className="text-lg font-bold text-green-600">{data.completedRecentCount}</div> : <div className="h-5 w-8 bg-gray-200 rounded animate-pulse mt-1" />}
        </div>
      </div>

      {/* Needs Attention + Upcoming Recurring */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <DashboardWidget title="Needs Attention" badge={needsAttentionItems.length} badgeColor={totalOverdue > 0 ? "bg-red-500" : "bg-blue-500"}>
          {needsAttentionItems.length === 0 ? (
            <div className="text-sm text-gray-400 py-4 text-center">All clear.</div>
          ) : (
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {needsAttentionItems.map((item) => (
                <div key={`${item.type}-${item.id}`} className={`flex items-center gap-2 px-2 py-1.5 rounded-md border text-xs ${item.urgency === "overdue" ? "bg-red-50 border-red-200" : item.urgency === "due-today" ? "bg-orange-50 border-orange-200" : "bg-white border-gray-200"}`}>
                  {isAdmin && (
                    <button onClick={() => item.type === "task" ? handleCompleteTask(item.id) : handleCompleteRecurring(item.id)} className="p-0.5 rounded hover:bg-green-100 text-green-600 transition-colors shrink-0" title="Complete">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    </button>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-gray-900 truncate block">{item.title}</span>
                    <span className="text-[10px] text-gray-500">{data?.assigneeMap[item.assigneeId] || "Unassigned"}{item.date ? ` · ${formatShortDate(item.date)}` : ""}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`text-[9px] font-semibold px-1 py-0.5 rounded-full ${urgencyColors[item.urgency]}`}>{urgencyLabels[item.urgency]}</span>
                    {item.type === "recurring" && <span className="text-[9px] font-medium px-1 py-0.5 rounded-full bg-purple-100 text-purple-700">Recurring</span>}
                    {item.priority && <span className={`text-[9px] font-semibold px-1 py-0.5 rounded-full ${PRIORITY_BADGE[item.priority] || ""}`}>{item.priority}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashboardWidget>

        <DashboardWidget title="Upcoming Recurring">
          {!data || data.upcomingRecurring.length === 0 ? (
            <div className="text-sm text-gray-400 py-4 text-center">No upcoming recurring tasks.</div>
          ) : (
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {data.upcomingRecurring.map((task) => (
                <div key={task.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-gray-200 bg-white text-xs">
                  {isAdmin && (
                    <button onClick={() => handleCompleteRecurring(task.id)} className="p-0.5 rounded hover:bg-green-100 text-green-600 transition-colors shrink-0" title="Mark done">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    </button>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-gray-900 truncate block">{task.title}</span>
                    <span className="text-[10px] text-gray-500">{data.assigneeMap[task.assigneeId] || "Unassigned"} · {frequencyLabel(task.frequencyType, task.frequencyValue)}</span>
                  </div>
                  <div className="text-[10px] text-gray-500 shrink-0">{formatShortDate(task.nextDue)}</div>
                </div>
              ))}
            </div>
          )}
        </DashboardWidget>
      </div>

      {/* Quick Notes */}
      <DashboardWidget
        title="Quick Notes"
        badge={data && data.totalNoteCount > 4 ? data.totalNoteCount - 4 : undefined}
        badgeColor="bg-amber-500"
        action={isAdmin ? { label: "+ Note", onClick: handleNewNote } : undefined}
      >
        {!data || data.recentNotes.length === 0 ? (
          <div className="text-sm text-gray-400 py-4 text-center">No notes yet.</div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {data.recentNotes.map((note) => (
              <div key={note.id} onClick={() => handleEditNote(note)} className="bg-amber-50 border border-amber-200 rounded-lg p-2 cursor-pointer hover:shadow-md hover:bg-amber-100/70 transition-all">
                <div className="text-[11px] text-gray-800 whitespace-pre-wrap line-clamp-3 mb-1.5 min-h-[2rem]">{note.content || <span className="text-gray-400 italic">Empty</span>}</div>
                <div className="text-[9px] text-gray-400">{formatNoteDate(note.updatedAt)}</div>
              </div>
            ))}
          </div>
        )}
      </DashboardWidget>

      {/* Modals */}
      {noteModalOpen && (
        <Modal isOpen onClose={handleCloseNote} wide>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">Quick Note</h2>
            <span className="text-xs text-gray-400">{noteSaveStatus === "saving" ? "Saving..." : noteSaveStatus === "saved" ? "Saved" : ""}</span>
          </div>
          <textarea value={noteContent} onChange={(e) => handleNoteChange(e.target.value)} rows={10} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y" placeholder="Type your note here..." autoFocus />
          <p className="text-xs text-gray-400 mt-2">Auto-saved. Close when done.</p>
        </Modal>
      )}

      {editingNoteId && (
        <Modal isOpen onClose={handleCloseEditNote} wide>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">Edit Note</h2>
            <span className="text-xs text-gray-400">{noteSaveStatus === "saving" ? "Saving..." : noteSaveStatus === "saved" ? "Saved" : ""}</span>
          </div>
          <textarea value={editingNoteContent} onChange={(e) => handleEditNoteChange(e.target.value)} rows={10} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y" placeholder="Type your note here..." autoFocus />
          <p className="text-xs text-gray-400 mt-2">Auto-saved. Close when done.</p>
        </Modal>
      )}

      {showAddTask && (
        <Modal isOpen onClose={() => setShowAddTask(false)}>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Add Quick Task</h2>
          <form onSubmit={handleCreateTask} className="space-y-3">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Title *</label><input name="title" required className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Assignee *</label><select name="assigneeId" required className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="">Select...</option>{assignees.map((e) => <option key={e.id} value={e.id}>{assigneeName(e)}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Project ID</label><input name="projectId" className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label><input name="dueDate" type="date" defaultValue={tomorrowISO()} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Priority</label><select name="priority" defaultValue="LOW" className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">{PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Label</label><input name="label" defaultValue="Task" className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label><textarea name="notes" rows={2} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">{saving ? "Adding..." : "Add Task"}</button>
              <button type="button" onClick={() => setShowAddTask(false)} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {showAddRecurring && (
        <Modal isOpen onClose={() => setShowAddRecurring(false)}>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Add Recurring Task</h2>
          <form onSubmit={handleCreateRecurring} className="space-y-3">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Title *</label><input name="title" required className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Assignee *</label><select name="assigneeId" required className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="">Select...</option>{assignees.map((e) => <option key={e.id} value={e.id}>{assigneeName(e)}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Category</label><select name="category" defaultValue="Task" className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">{RECURRING_CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label><select name="frequencyType" defaultValue="WEEKLY" className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">{FREQUENCY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Every</label><input name="frequencyValue" type="number" min={1} defaultValue={1} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Schedule</label><select name="scheduleType" defaultValue="FLOATING" className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">{SCHEDULE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Last Completed</label><input name="lastCompleted" type="date" className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea name="description" rows={2} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">{saving ? "Adding..." : "Add Recurring Task"}</button>
              <button type="button" onClick={() => setShowAddRecurring(false)} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export function EmbedDashboardClient({ token, user }: { token: string; user: EmbedUser }) {
  return (
    <EmbedAuthProvider token={token} user={user}>
      <EmbedDashboardInner />
    </EmbedAuthProvider>
  );
}
