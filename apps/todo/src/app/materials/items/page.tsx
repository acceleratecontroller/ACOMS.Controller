"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { UNIT_OF_MEASURE_OPTIONS, UOM_LABELS } from "@/modules/materials/constants";

interface Item {
  id: string;
  code: string;
  description: string;
  category: string | null;
  unitOfMeasure: string;
  aliases: string[];
  minimumStockLevel: number | null;
  notes: string | null;
  isArchived: boolean;
  createdAt: string;
}

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Item | null>(null);

  const [form, setForm] = useState({
    code: "",
    description: "",
    category: "",
    unitOfMeasure: "EACH",
    aliases: "",
    minimumStockLevel: "",
    notes: "",
  });

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (showArchived) params.set("archived", "true");
    if (search) params.set("search", search);
    const res = await fetch(`/api/materials/items?${params}`);
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }, [showArchived, search]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  function openCreate() {
    setEditingItem(null);
    setForm({ code: "", description: "", category: "", unitOfMeasure: "EACH", aliases: "", minimumStockLevel: "", notes: "" });
    setShowModal(true);
  }

  function openEdit(item: Item) {
    setEditingItem(item);
    setForm({
      code: item.code,
      description: item.description,
      category: item.category || "",
      unitOfMeasure: item.unitOfMeasure,
      aliases: item.aliases.join(", "),
      minimumStockLevel: item.minimumStockLevel?.toString() || "",
      notes: item.notes || "",
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      code: form.code,
      description: form.description,
      category: form.category || null,
      unitOfMeasure: form.unitOfMeasure,
      aliases: form.aliases ? form.aliases.split(",").map((a) => a.trim()).filter(Boolean) : [],
      minimumStockLevel: form.minimumStockLevel ? Number(form.minimumStockLevel) : null,
      notes: form.notes || null,
    };

    const url = editingItem ? `/api/materials/items/${editingItem.id}` : "/api/materials/items";
    const method = editingItem ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setShowModal(false);
      fetchItems();
    }
  }

  async function handleArchive() {
    if (!archiveTarget) return;
    await fetch(`/api/materials/items/${archiveTarget.id}`, { method: "DELETE" });
    setArchiveTarget(null);
    fetchItems();
  }

  return (
    <div>
      <PageHeader title="Item Register" description="Manage your master item list" />

      <div className="flex items-center gap-4 mb-4">
        <input
          type="text"
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64"
        />
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Show archived
        </label>
        <div className="flex-1" />
        <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          Add Item
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500 text-sm">No items found.</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Code</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Description</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Category</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">UoM</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Min Stock</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-medium">{item.code}</td>
                  <td className="px-4 py-3">{item.description}</td>
                  <td className="px-4 py-3 text-gray-500">{item.category || "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{UOM_LABELS[item.unitOfMeasure] || item.unitOfMeasure}</td>
                  <td className="px-4 py-3 text-gray-500">{item.minimumStockLevel ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(item)} className="text-blue-600 hover:text-blue-800 text-sm mr-3">
                      Edit
                    </button>
                    {!item.isArchived && (
                      <button onClick={() => setArchiveTarget(item)} className="text-red-600 hover:text-red-800 text-sm">
                        Archive
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingItem ? "Edit Item" : "Add Item"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
              <input type="text" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit of Measure</label>
              <select value={form.unitOfMeasure} onChange={(e) => setForm({ ...form, unitOfMeasure: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {UNIT_OF_MEASURE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <input type="text" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input type="text" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Stock Level</label>
              <input type="number" min="0" step="any" value={form.minimumStockLevel} onChange={(e) => setForm({ ...form, minimumStockLevel: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Aliases (comma separated)</label>
            <input type="text" value={form.aliases} onChange={(e) => setForm({ ...form, aliases: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g. Alt Name 1, Alt Name 2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">{editingItem ? "Save" : "Create"}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!archiveTarget}
        title="Archive Item"
        message={`Are you sure you want to archive "${archiveTarget?.code}"?`}
        confirmLabel="Archive"
        onConfirm={handleArchive}
        onCancel={() => setArchiveTarget(null)}
      />
    </div>
  );
}
