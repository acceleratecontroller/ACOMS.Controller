"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

  useEffect(() => {
    Promise.all([
      fetch("/api/materials/stocktakes").then((r) => r.json()),
      fetch("/api/materials/locations").then((r) => r.json()),
    ]).then(([s, l]) => {
      setStocktakes(s);
      setLocations(l);
      setLoading(false);
    });
  }, []);

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

      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : stocktakes.length === 0 ? (
        <p className="text-gray-500 text-sm">No stocktakes yet.</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Location</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Items</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Created</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Completed</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {stocktakes.map((st) => (
                <tr key={st.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{st.location.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${st.status === "DRAFT" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                      {st.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{st._count.lines}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(st.createdAt)}</td>
                  <td className="px-4 py-3 text-gray-500">{st.completedAt ? formatDate(st.completedAt) : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/stocktakes/${st.id}`} className="text-blue-600 hover:text-blue-800 text-sm">
                      {st.status === "DRAFT" ? "Count" : "View"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Stocktake">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
            <select required value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Select location...</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowCreate(false)} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={creating} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {creating ? "Creating..." : "Create Stocktake"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
