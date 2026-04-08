"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Modal } from "@/components/Modal";

interface Stocktake {
  id: string;
  locationId: string;
  status: string;
  notes: string | null;
  completedAt: string | null;
  createdAt: string;
  location: { name: string };
  _count: { lines: number };
}

interface Location { id: string; name: string }

export default function StocktakesPage() {
  const router = useRouter();
  const [stocktakes, setStocktakes] = useState<Stocktake[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ locationId: "", notes: "" });
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Stocktake | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/materials/stocktakes").then((r) => r.json()),
      fetch("/api/materials/locations").then((r) => r.json()),
    ]).then(([s, l]) => {
      setStocktakes(s);
      setLocations(l);
      setLoading(false);
    });
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/materials/stocktakes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId: form.locationId, notes: form.notes || null }),
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/materials/stocktakes/${data.id}`);
    }
    setCreating(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);

    const res = await fetch(`/api/materials/stocktakes/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      setDeleteTarget(null);
      fetchData();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to delete stocktake");
    }
    setDeleting(false);
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "2-digit" });
  }

  return (
    <div>
      <PageHeader title="Stocktakes" description="Physical stock counts and adjustments" />

      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1" />
        <button onClick={() => setShowCreate(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          New Stocktake
        </button>
      </div>

      {error && !deleteTarget && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">Loading...</p>
      ) : stocktakes.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">No stocktakes yet.</p>
      ) : (
        <>
          {/* Mobile card layout */}
          <div className="space-y-3 md:hidden">
            {stocktakes.map((st) => (
              <div key={st.id} onClick={() => router.push(`/materials/stocktakes/${st.id}`)} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 overflow-hidden cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="font-medium text-gray-900 dark:text-gray-100">{st.location.name}</div>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium shrink-0 ${st.status === "DRAFT" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                    {st.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                  <div>
                    <span className="text-gray-400 dark:text-gray-500 text-xs">Items</span>
                    <div className="text-gray-700 dark:text-gray-300">{st._count.lines}</div>
                  </div>
                  <div>
                    <span className="text-gray-400 dark:text-gray-500 text-xs">Created</span>
                    <div className="text-gray-700 dark:text-gray-300">{formatDate(st.createdAt)}</div>
                  </div>
                  <div>
                    <span className="text-gray-400 dark:text-gray-500 text-xs">Completed</span>
                    <div className="text-gray-700 dark:text-gray-300">{st.completedAt ? formatDate(st.completedAt) : "—"}</div>
                  </div>
                </div>
                {st.status === "DRAFT" && (
                  <div className="flex gap-3 pt-3 border-t border-gray-100 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setDeleteTarget(st)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop table layout */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Location</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Items</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Created</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Completed</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {stocktakes.map((st) => (
                  <tr key={st.id} onClick={() => router.push(`/materials/stocktakes/${st.id}`)} className="border-b border-gray-100 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer">
                    <td className="px-4 py-3 font-medium">{st.location.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${st.status === "DRAFT" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                        {st.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{st._count.lines}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{formatDate(st.createdAt)}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{st.completedAt ? formatDate(st.completedAt) : "—"}</td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {st.status === "DRAFT" && (
                        <button
                          onClick={() => setDeleteTarget(st)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Create Stocktake Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Stocktake">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location *</label>
            <select required value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })} className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm">
              <option value="">Select location...</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowCreate(false)} className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            <button type="submit" disabled={creating} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {creating ? "Creating..." : "Create Stocktake"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Stocktake">
        {deleteTarget && (
          <div className="space-y-4">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-700/50">
              <div className="text-sm">
                <span className="font-medium text-gray-900 dark:text-gray-100">{deleteTarget.location.name}</span>
                <span className="text-gray-500 dark:text-gray-400"> — {deleteTarget._count.lines} items</span>
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">Created {formatDate(deleteTarget.createdAt)}</div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400">
              This will permanently delete this draft stocktake and all its line items. No stock adjustments will be made.
            </p>

            {error && (
              <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete Stocktake"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
