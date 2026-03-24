"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { UOM_LABELS } from "@/modules/materials/constants";

interface Item { id: string; code: string; description: string; unitOfMeasure: string }

interface PickListItem {
  id: string;
  itemId: string;
  defaultQty: string;
  item: { code: string; description: string; unitOfMeasure: string };
}

interface PickList {
  id: string;
  name: string;
  description: string | null;
  items: PickListItem[];
  _count: { items: number };
}

export default function PickListsPage() {
  const [pickLists, setPickLists] = useState<PickList[]>([]);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingList, setEditingList] = useState<PickList | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<PickList | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [form, setForm] = useState({ name: "", description: "" });
  const [formItems, setFormItems] = useState<{ itemId: string; defaultQty: number }[]>([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [pl, items] = await Promise.all([
      fetch("/api/pick-lists").then((r) => r.json()),
      fetch("/api/items").then((r) => r.json()),
    ]);
    setPickLists(pl);
    setAllItems(items);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  function openCreate() {
    setEditingList(null);
    setForm({ name: "", description: "" });
    setFormItems([{ itemId: "", defaultQty: 1 }]);
    setShowModal(true);
  }

  function openEdit(pl: PickList) {
    setEditingList(pl);
    setForm({ name: pl.name, description: pl.description || "" });
    setFormItems(pl.items.map((i) => ({ itemId: i.itemId, defaultQty: Number(i.defaultQty) })));
    setShowModal(true);
  }

  function addFormItem() {
    setFormItems([...formItems, { itemId: "", defaultQty: 1 }]);
  }

  function removeFormItem(idx: number) {
    setFormItems(formItems.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validItems = formItems.filter((i) => i.itemId);
    if (validItems.length === 0) return;

    const payload = {
      name: form.name,
      description: form.description || null,
      items: validItems,
    };

    const url = editingList ? `/api/pick-lists/${editingList.id}` : "/api/pick-lists";
    const method = editingList ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setShowModal(false);
      fetchAll();
    }
  }

  async function handleArchive() {
    if (!archiveTarget) return;
    await fetch(`/api/pick-lists/${archiveTarget.id}`, { method: "DELETE" });
    setArchiveTarget(null);
    fetchAll();
  }

  return (
    <div>
      <PageHeader title="Pick Lists" description="Reusable item templates for quick issuing" />

      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1" />
        <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          New Pick List
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : pickLists.length === 0 ? (
        <p className="text-gray-500 text-sm">No pick lists yet.</p>
      ) : (
        <div className="space-y-3">
          {pickLists.map((pl) => (
            <div key={pl.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <button onClick={() => setExpandedId(expandedId === pl.id ? null : pl.id)} className="font-medium text-gray-900 hover:text-blue-700">
                    {pl.name}
                  </button>
                  {pl.description && <p className="text-xs text-gray-500 mt-0.5">{pl.description}</p>}
                  <span className="text-xs text-gray-400">{pl._count.items} items</span>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => openEdit(pl)} className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
                  <button onClick={() => setArchiveTarget(pl)} className="text-red-600 hover:text-red-800 text-sm">Archive</button>
                </div>
              </div>
              {expandedId === pl.id && (
                <div className="border-t border-gray-200 px-4 py-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-500">
                        <th className="text-left py-1">Code</th>
                        <th className="text-left py-1">Description</th>
                        <th className="text-right py-1">Default Qty</th>
                        <th className="text-left py-1">UoM</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pl.items.map((item) => (
                        <tr key={item.id} className="border-t border-gray-100">
                          <td className="py-1 font-mono">{item.item.code}</td>
                          <td className="py-1">{item.item.description}</td>
                          <td className="py-1 text-right">{Number(item.defaultQty)}</td>
                          <td className="py-1 text-gray-500">{UOM_LABELS[item.item.unitOfMeasure] || ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingList ? "Edit Pick List" : "New Pick List"} wide>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Items *</label>
              <button type="button" onClick={addFormItem} className="text-xs text-blue-600 hover:text-blue-800">+ Add item</button>
            </div>
            <div className="space-y-2">
              {formItems.map((fi, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <select
                    value={fi.itemId}
                    onChange={(e) => {
                      const updated = [...formItems];
                      updated[idx] = { ...updated[idx], itemId: e.target.value };
                      setFormItems(updated);
                    }}
                    className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    <option value="">Select item...</option>
                    {allItems.map((i) => <option key={i.id} value={i.id}>{i.code} — {i.description}</option>)}
                  </select>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    value={fi.defaultQty}
                    onChange={(e) => {
                      const updated = [...formItems];
                      updated[idx] = { ...updated[idx], defaultQty: Number(e.target.value) };
                      setFormItems(updated);
                    }}
                    className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right"
                  />
                  {formItems.length > 1 && (
                    <button type="button" onClick={() => removeFormItem(idx)} className="text-red-500 hover:text-red-700 text-sm">x</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">{editingList ? "Save" : "Create"}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!archiveTarget}
        title="Archive Pick List"
        message={`Are you sure you want to archive "${archiveTarget?.name}"?`}
        confirmLabel="Archive"
        onConfirm={handleArchive}
        onCancel={() => setArchiveTarget(null)}
      />
    </div>
  );
}
