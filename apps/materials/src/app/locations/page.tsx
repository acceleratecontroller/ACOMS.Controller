"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface Location {
  id: string;
  name: string;
  description: string | null;
  isArchived: boolean;
  createdAt: string;
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Location | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/locations");
    if (res.ok) setLocations(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchLocations(); }, [fetchLocations]);

  function openCreate() {
    setEditingLocation(null);
    setForm({ name: "", description: "" });
    setShowModal(true);
  }

  function openEdit(loc: Location) {
    setEditingLocation(loc);
    setForm({ name: loc.name, description: loc.description || "" });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { name: form.name, description: form.description || null };
    const url = editingLocation ? `/api/locations/${editingLocation.id}` : "/api/locations";
    const method = editingLocation ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setShowModal(false);
      fetchLocations();
    }
  }

  async function handleArchive() {
    if (!archiveTarget) return;
    await fetch(`/api/locations/${archiveTarget.id}`, { method: "DELETE" });
    setArchiveTarget(null);
    fetchLocations();
  }

  return (
    <div>
      <PageHeader title="Locations" description="Manage storage and warehouse locations" />

      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1" />
        <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          Add Location
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : locations.length === 0 ? (
        <p className="text-gray-500 text-sm">No locations found. Create one to get started.</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Description</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((loc) => (
                <tr key={loc.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{loc.name}</td>
                  <td className="px-4 py-3 text-gray-500">{loc.description || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(loc)} className="text-blue-600 hover:text-blue-800 text-sm mr-3">Edit</button>
                    <button onClick={() => setArchiveTarget(loc)} className="text-red-600 hover:text-red-800 text-sm">Archive</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingLocation ? "Edit Location" : "Add Location"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">{editingLocation ? "Save" : "Create"}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!archiveTarget}
        title="Archive Location"
        message={`Are you sure you want to archive "${archiveTarget?.name}"?`}
        confirmLabel="Archive"
        onConfirm={handleArchive}
        onCancel={() => setArchiveTarget(null)}
      />
    </div>
  );
}
