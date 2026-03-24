"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Modal } from "@/components/Modal";
import { UOM_LABELS } from "@/modules/materials/constants";

interface Item {
  id: string;
  code: string;
  description: string;
  category: string | null;
  unitOfMeasure: string;
  customUnitOfMeasure: string | null;
  minimumStockLevel: number | null;
  ownershipType: string;
  clientName: string | null;
}

interface Supplier {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  isFreeIssue: boolean;
  clientName: string | null;
  items: Item[];
}

export default function SupplierDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [form, setForm] = useState({ name: "", contactName: "", phone: "", email: "", notes: "", isFreeIssue: false, clientName: "" });

  useEffect(() => {
    fetch(`/api/materials/suppliers/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Supplier not found");
        return r.json();
      })
      .then((data) => {
        setSupplier(data);
        setForm({
          name: data.name,
          contactName: data.contactName || "",
          phone: data.phone || "",
          email: data.email || "",
          notes: data.notes || "",
          isFreeIssue: data.isFreeIssue,
          clientName: data.clientName || "",
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/materials/suppliers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        contactName: form.contactName || null,
        phone: form.phone || null,
        email: form.email || null,
        notes: form.notes || null,
        isFreeIssue: form.isFreeIssue,
        clientName: form.isFreeIssue ? (form.clientName || null) : null,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSupplier((prev) => prev ? { ...prev, ...updated } : prev);
      setShowEditModal(false);
    }
  }

  function getUomDisplay(item: Item) {
    if (item.unitOfMeasure === "OTHER" && item.customUnitOfMeasure) return item.customUnitOfMeasure;
    return UOM_LABELS[item.unitOfMeasure] || item.unitOfMeasure;
  }

  if (loading) return <p className="text-gray-500 text-sm p-8">Loading...</p>;
  if (error || !supplier) return (
    <div className="p-8">
      <p className="text-red-600 text-sm mb-4">{error || "Supplier not found"}</p>
      <Link href="/materials/suppliers" className="text-blue-600 hover:text-blue-800 text-sm">Back to Suppliers</Link>
    </div>
  );

  return (
    <div>
      <div className="mb-4">
        <Link href="/materials/suppliers" className="text-sm text-blue-600 hover:text-blue-800">Back to Suppliers</Link>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <PageHeader title={supplier.name} description={[supplier.contactName, supplier.phone, supplier.email].filter(Boolean).join(" | ") || "No contact details"} />
          <div className="mt-1">
            {supplier.isFreeIssue ? (
              <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                Free Issue — {supplier.clientName}
              </span>
            ) : (
              <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">Company Supplier</span>
            )}
          </div>
        </div>
        <button onClick={() => setShowEditModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          Edit Supplier
        </button>
      </div>

      {supplier.notes && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800 mb-6">
          {supplier.notes}
        </div>
      )}

      <h3 className="text-sm font-semibold text-gray-900 mb-2">Items from this supplier ({supplier.items.length})</h3>

      {supplier.items.length === 0 ? (
        <p className="text-gray-500 text-sm">No items linked to this supplier yet.</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Item Code</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Description</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Category</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">UoM</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Min Stock</th>
              </tr>
            </thead>
            <tbody>
              {supplier.items.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-medium">{item.code}</td>
                  <td className="px-4 py-3">{item.description}</td>
                  <td className="px-4 py-3 text-gray-500">{item.category || "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{getUomDisplay(item)}</td>
                  <td className="px-4 py-3">
                    {item.ownershipType === "CLIENT_FREE_ISSUE" ? (
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                        Free Issue{item.clientName ? ` (${item.clientName})` : ""}
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">Company</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{item.minimumStockLevel ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Supplier">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name *</label>
            <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
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
            <button type="button" onClick={() => setShowEditModal(false)} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Save</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
