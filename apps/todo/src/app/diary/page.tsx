"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DIARY_TYPE_OPTIONS } from "@/modules/diary/constants";
import { DiaryEntry, getMonthYearKey, getMonthYearLabel, todayISO } from "./types";
import { DiaryEntryCard } from "./DiaryEntryCard";
import { PeopleTagInput } from "./PeopleTagInput";

export default function DiaryPage() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [allPeople, setAllPeople] = useState<string[]>([]);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [personFilter, setPersonFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  // Modal state
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formType, setFormType] = useState<"NOTE" | "EVENT" | "CONVERSATION">("NOTE");
  const [formDate, setFormDate] = useState(todayISO());
  const [formTime, setFormTime] = useState("");
  const [formHeading, setFormHeading] = useState("");
  const [formPeople, setFormPeople] = useState<string[]>([]);
  const [formContent, setFormContent] = useState("");
  const [formImportant, setFormImportant] = useState(false);

  // Confirm dialog
  const [confirmAction, setConfirmAction] = useState<{
    id: string;
    heading: string;
  } | null>(null);

  // ─── Data Loading ──────────────────────────────────────

  const loadEntries = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (showArchived) params.set("archived", "true");
    if (typeFilter) params.set("type", typeFilter);
    if (personFilter) params.set("person", personFilter);
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    if (search) params.set("search", search);

    const res = await fetch(`/api/diary?${params}`);
    if (res.ok) {
      const data = await res.json();
      setEntries(data);
    }
    setLoading(false);
  }, [showArchived, typeFilter, personFilter, dateFrom, dateTo, search]);

  const loadPeople = useCallback(async () => {
    const res = await fetch("/api/diary/people");
    if (res.ok) {
      setAllPeople(await res.json());
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    loadPeople();
  }, [loadPeople]);

  // ─── Grouped entries by month/year ─────────────────────

  const grouped = useMemo(() => {
    const groups: { key: string; label: string; entries: DiaryEntry[] }[] = [];
    const map = new Map<string, DiaryEntry[]>();

    for (const entry of entries) {
      const key = getMonthYearKey(entry.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(entry);
    }

    // Sort groups by key descending (latest first)
    const sortedKeys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));
    for (const key of sortedKeys) {
      // Sort entries within group: by date desc, then time desc (latest at top)
      // Entries without a time sort after entries with a time on the same date
      const sorted = map.get(key)!.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateB !== dateA) return dateB - dateA;
        // Same date — sort by time descending; no time goes to bottom
        const timeA = a.time || "";
        const timeB = b.time || "";
        if (timeB && !timeA) return 1;
        if (timeA && !timeB) return -1;
        return timeB.localeCompare(timeA);
      });
      groups.push({
        key,
        label: getMonthYearLabel(key),
        entries: sorted,
      });
    }

    return groups;
  }, [entries]);

  // ─── Form Helpers ──────────────────────────────────────

  function resetForm() {
    setFormType("NOTE");
    setFormDate(todayISO());
    setFormTime("");
    setFormHeading("");
    setFormPeople([]);
    setFormContent("");
    setFormImportant(false);
  }

  function openAdd() {
    resetForm();
    setEditingEntry(null);
    setShowAddEntry(true);
  }

  function openEdit(entry: DiaryEntry) {
    setFormType(entry.type);
    setFormDate(entry.date.split("T")[0]);
    setFormTime(entry.time || "");
    setFormHeading(entry.heading);
    setFormPeople([...entry.people]);
    setFormContent(entry.content);
    setFormImportant(entry.isImportant);
    setEditingEntry(entry);
    setShowAddEntry(true);
  }

  function closeModal() {
    setShowAddEntry(false);
    setEditingEntry(null);
  }

  // ─── CRUD Operations ──────────────────────────────────

  async function handleSave() {
    if (!formHeading.trim()) return;
    setSaving(true);

    const body = {
      type: formType,
      date: formDate,
      time: formTime || null,
      heading: formHeading.trim(),
      people: formPeople,
      content: formContent,
      isImportant: formImportant,
    };

    if (editingEntry) {
      await fetch(`/api/diary/${editingEntry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/diary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    setSaving(false);
    closeModal();
    loadEntries();
    loadPeople();
  }

  async function handleToggleImportant(entry: DiaryEntry) {
    await fetch(`/api/diary/${entry.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isImportant: !entry.isImportant }),
    });
    loadEntries();
  }

  async function handleArchive(id: string) {
    await fetch(`/api/diary/${id}`, { method: "DELETE" });
    setConfirmAction(null);
    loadEntries();
  }

  // ─── Filter bar ────────────────────────────────────────

  const hasActiveFilters = typeFilter || personFilter || dateFrom || dateTo || search;

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader title="Diary" description="Private to you — only you can see your entries." />

      {/* Toolbar */}
      <div className="mb-4 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <input
            type="text"
            placeholder="Search entries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[160px] px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400"
          />

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All types</option>
            {DIARY_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {/* Person filter */}
          <select
            value={personFilter}
            onChange={(e) => setPersonFilter(e.target.value)}
            className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All people</option>
            {allPeople.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* New entry button */}
          <button
            onClick={openAdd}
            className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shrink-0"
          >
            + New Entry
          </button>
        </div>

        {/* Date range row */}
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-gray-500 dark:text-gray-400">From:</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
          <label className="text-xs text-gray-500 dark:text-gray-400">To:</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />

          {hasActiveFilters && (
            <button
              onClick={() => {
                setSearch("");
                setTypeFilter("");
                setPersonFilter("");
                setDateFrom("");
                setDateTo("");
              }}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Clear filters
            </button>
          )}

          <div className="ml-auto">
            <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              Show archived
            </label>
          </div>
        </div>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="text-center py-12 text-sm text-gray-400">Loading...</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {hasActiveFilters ? "No entries match your filters." : "No diary entries yet."}
          </p>
          {!hasActiveFilters && (
            <button
              onClick={openAdd}
              className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Create your first entry
            </button>
          )}
        </div>
      ) : (
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-[5px] md:left-[5px] top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

          {grouped.map((group) => (
            <div key={group.key}>
              {/* Month/year heading */}
              <div className="relative flex items-center gap-3 mb-3 mt-2">
                <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600 ring-2 ring-white dark:ring-gray-900 z-10" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {group.label}
                </h2>
              </div>

              {/* Entries */}
              {group.entries.map((entry) => (
                <DiaryEntryCard
                  key={entry.id}
                  entry={entry}
                  onEdit={openEdit}
                  onToggleImportant={handleToggleImportant}
                  onArchive={(e) => setConfirmAction({ id: e.id, heading: e.heading })}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showAddEntry}
        onClose={closeModal}
        title={editingEntry ? "Edit Entry" : "New Diary Entry"}
        wide
      >
        <div className="space-y-3">
          {/* Type */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Type
            </label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value as "NOTE" | "EVENT" | "CONVERSATION")}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              {DIARY_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date & Time */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date
              </label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="w-32">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Time <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="time"
                value={formTime}
                onChange={(e) => setFormTime(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Heading */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Heading
            </label>
            <input
              type="text"
              value={formHeading}
              onChange={(e) => setFormHeading(e.target.value)}
              placeholder="Brief summary..."
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400"
            />
          </div>

          {/* People */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              People involved
            </label>
            <PeopleTagInput
              value={formPeople}
              onChange={setFormPeople}
              allPeople={allPeople}
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Details
            </label>
            <textarea
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              rows={6}
              placeholder="Enter details..."
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-y"
            />
          </div>

          {/* Important toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formImportant}
              onChange={(e) => setFormImportant(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <span className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" />
              Mark as important
            </span>
          </label>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={closeModal}
              className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !formHeading.trim()}
              className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md transition-colors"
            >
              {saving ? "Saving..." : editingEntry ? "Save Changes" : "Create Entry"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm archive dialog */}
      <ConfirmDialog
        isOpen={!!confirmAction}
        title="Archive Entry"
        message={`Archive "${confirmAction?.heading}"? You can restore it later from the archived view.`}
        confirmLabel="Archive"
        onConfirm={() => confirmAction && handleArchive(confirmAction.id)}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
