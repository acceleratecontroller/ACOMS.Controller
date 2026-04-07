"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Modal } from "@/components/Modal";

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
  materials: {
    lowStockItems: {
      itemCode: string;
      itemDescription: string;
      unitOfMeasure: string;
      locationName: string;
      currentStock: number;
      minimumStockLevel: number | null;
    }[];
    recentMovements: {
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
    itemCount: number;
    locationCount: number;
  };
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

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Quick Note from dashboard
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [noteSaveStatus, setNoteSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
    fetch("/api/auth/session")
      .then((r) => r.ok ? r.json() : null)
      .then((sess) => { if (sess?.user?.role === "ADMIN") setIsAdmin(true); })
      .catch(() => {});
  }, []);

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
    // Flush save
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
  }

  const totalOverdue = (data?.overdueTaskCount ?? 0) + (data?.overdueRecurringCount ?? 0);
  const totalDueToday = (data?.dueTodayTaskCount ?? 0) + (data?.dueTodayRecurringCount ?? 0);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* ─── Task Summary ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard label="Active Tasks" value={data ? data.activeTaskCount : null} />
        <StatCard label="Due Today" value={data ? totalDueToday : null} color="blue" />
        <StatCard label="Overdue" value={data ? totalOverdue : null} color="red" />
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

      {/* ─── Quick Note from Dashboard ────────────────────── */}
      {isAdmin && (
        <div className="mb-8">
          <button
            onClick={handleNewNote}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Quick Note
          </button>
        </div>
      )}

      {noteModalOpen && (
        <Modal isOpen onClose={handleCloseNote} wide>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">Quick Note</h2>
            <span className="text-xs text-gray-400">
              {noteSaveStatus === "saving" && "Saving..."}
              {noteSaveStatus === "saved" && "Saved"}
            </span>
          </div>
          <textarea
            value={noteContent}
            onChange={(e) => handleNoteChange(e.target.value)}
            rows={12}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            placeholder="Type your note here..."
            autoFocus
          />
          <p className="text-xs text-gray-400 mt-2">Your note is auto-saved. Close this modal when done. View all notes in Task Manager &rarr; Quick Notes.</p>
        </Modal>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-2">Material Tracker</h2>
          <p className="text-gray-600 mb-4">
            {data?.materials ? (
              <>
                {data.materials.itemCount} items across {data.materials.locationCount} locations.
                {data.materials.lowStockItems.length > 0 && (
                  <span className="text-red-600 font-medium ml-1">
                    {data.materials.lowStockItems.length} low stock alerts.
                  </span>
                )}
              </>
            ) : (
              "Track stock, movements, and materials."
            )}
          </p>
          <Link
            href="/materials/items"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Open Materials
          </Link>
        </div>
      </div>

      {/* ─── Materials Widgets ────────────────────────────── */}
      {data?.materials && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Low Stock Alerts */}
          {data.materials.lowStockItems.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Low Stock Alerts</h3>
              <div className="space-y-2">
                {data.materials.lowStockItems.slice(0, 8).map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs border-b border-gray-100 pb-1">
                    <div>
                      <span className="font-mono font-medium">{item.itemCode}</span>{" "}
                      <span className="text-gray-500">{item.itemDescription}</span>
                      <span className="text-gray-400 ml-1">@ {item.locationName}</span>
                    </div>
                    <div className="text-red-600 font-medium">
                      {item.currentStock} / {item.minimumStockLevel}
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/materials/stock" className="text-xs text-blue-600 hover:text-blue-800 mt-2 inline-block">
                View stock levels
              </Link>
            </div>
          )}

          {/* Recent Movements */}
          {data.materials.recentMovements.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Recent Movements</h3>
              <div className="space-y-2">
                {data.materials.recentMovements.map((m) => (
                  <div key={m.id} className="text-xs border-b border-gray-100 pb-1">
                    <div className="flex items-center justify-between">
                      <span>
                        <span className="inline-block px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] font-medium mr-1">
                          {MOVEMENT_TYPE_LABELS[m.movementType] || m.movementType}
                        </span>
                        <span className="font-mono">{m.item.code}</span>
                        <span className="text-gray-400 ml-1">x{Number(m.quantity)}</span>
                      </span>
                      <span className="text-gray-400">
                        {new Date(m.createdAt).toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit" })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/materials/movements" className="text-xs text-blue-600 hover:text-blue-800 mt-2 inline-block">
                View all movements
              </Link>
            </div>
          )}

          {/* Open Stocktakes */}
          {data.materials.openStocktakes.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Open Stocktakes</h3>
              <div className="space-y-2">
                {data.materials.openStocktakes.map((st) => (
                  <div key={st.id} className="flex items-center justify-between text-xs border-b border-gray-100 pb-1">
                    <div>
                      <span className="font-medium">{st.location.name}</span>
                      <span className="text-gray-400 ml-2">{st._count.lines} items</span>
                    </div>
                    <Link href={`/materials/stocktakes/${st.id}`} className="text-blue-600 hover:text-blue-800">
                      Continue
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color = "gray",
}: {
  label: string;
  value: number | null;
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
      {value === null ? (
        <div className="h-9 w-12 bg-gray-200 rounded animate-pulse mt-1" />
      ) : (
        <div className={`text-3xl font-bold ${colorMap[color]}`}>{value}</div>
      )}
    </div>
  );
}
