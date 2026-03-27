"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface Supplier {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  isFreeIssue: boolean;
  clientName: string | null;
  isArchived: boolean;
  _count: { items: number };
}

export default function SuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Supplier | null>(null);

  const [form, setForm] = useState({
    name: "",
    contactName: "",
    phone: "",
    email: "",
    notes: "",
    isFreeIssue: false,
    clientName: "",
  });

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (showArchived) params.set("archived", "true");
    if (search) params.set("search", search);
    const res = await fetch(`/api/materials/suppliers?${params}`);
    if (res.ok) setSuppliers(await res.json());
    setLoading(false);
  }, [showArchived, search]);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  function openCreate() {
    setEditingSupplier(null);
    setForm({ name: "", contactName: "", phone: "", email: "", notes: "", isFreeIssue: false, clientName: "" });
    setShowModal(true);
  }

  function openEdit(supplier: Supplier) {
    setEditingSupplier(supplier);
    setForm({
      name: supplier.name,
      contactName: supplier.contactName || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      notes: supplier.notes || "",
      isFreeIssue: supplier.isFreeIssue,
      clientName: supplier.clientName || "",
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name,
      contactName: form.contactName || null,
      phone: form.phone || null,
      email: form.email || null,
      notes: form.notes || null,
      isFreeIssue: form.isFreeIssue,
      clientName: form.isFreeIssue ? (form.clientName || null) : null,
    };

    const url = editingSupplier ? `/api/materials/suppliers/${editingSupplier.id}` : "/api/materials/suppliers";
    const method = editingSupplier ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setShowModal(false);
      fetchSuppliers();
    }
  }

  async function handleArchive() {
    if (!archiveTarget) return;
    await fetch(`/api/materials/suppliers/${archiveTarget.id}`, { method: "DELETE" });
    setArchiveTarget(null);
    fetchSuppliers();
  }

  return (
    <div>
      <PageHeader title="Suppliers" description="Manage your suppliers and view their item lists" />

      <div className="flex items-center gap-4 mb-4">
        <input
          type="text"
          placeholder="Search suppliers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full sm:w-64"
        />
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Show archived
        </label>
        <div className="flex-1" />
        <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          Add Supplier
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : suppliers.length === 0 ? (
        <p className="text-gray-500 text-sm">No suppliers found.</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Contact</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Type</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Items</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id} onClick={() => router.push(`/materials/suppliers/${s.id}`)} className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer">
                  <td className="px-4 py-3">
                    <span className="text-blue-600 font-medium">
                      {s.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{s.contactName || "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{s.phone || "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{s.email || "—"}</td>
                  <td className="px-4 py-3">
                    {s.isFreeIssue ? (
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                        Free Issue{s.clientName ? ` — ${s.clientName}` : ""}
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">Company</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">{s._count.items}</td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => openEdit(s)} className="text-blue-600 hover:text-blue-800 text-sm mr-3">Edit</button>
                    {!s.isArchived && (
                      <button onClick={() => setArchiveTarget(s)} className="text-red-600 hover:text-red-800 text-sm">Archive</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingSupplier ? "Edit Supplier" : "Add Supplier"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name *</label>
            <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
              <input type="text" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="border-t border-gray-200 pt-4">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <input
                type="checkbox"
                checked={form.isFreeIssue}
                onChange={(e) => setForm({ ...form, isFreeIssue: e.target.checked, clientName: e.target.checked ? form.clientName : "" })}
                className="rounded border-gray-300"
              />
              Free Issue Supplier
            </label>
            <p className="text-xs text-gray-500 mb-2">When enabled, all items from this supplier will be marked as client free issue.</p>
            {form.isFreeIssue && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
                <input type="text" required value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Which client provides these items?" />
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">{editingSupplier ? "Save" : "Create"}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!archiveTarget}
        title="Archive Supplier"
        message={`Are you sure you want to archive "${archiveTarget?.name}"?`}
        confirmLabel="Archive"
        onConfirm={handleArchive}
        onCancel={() => setArchiveTarget(null)}
      />
    </div>
  );
}
