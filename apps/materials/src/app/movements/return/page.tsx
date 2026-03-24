"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { UOM_LABELS } from "@/modules/materials/constants";

interface Item { id: string; code: string; description: string; unitOfMeasure: string }
interface Location { id: string; name: string }

export default function ReturnPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [returnType, setReturnType] = useState<"FROM_JOB" | "TO_SUPPLIER">("FROM_JOB");

  const [form, setForm] = useState({
    itemId: "",
    quantity: "",
    toLocationId: "",
    fromLocationId: "",
    clientName: "",
    projectName: "",
    projectCode: "",
    sourceName: "",
    reference: "",
    notes: "",
  });

  useEffect(() => {
    fetch("/api/items").then((r) => r.json()).then(setItems);
    fetch("/api/locations").then((r) => r.json()).then(setLocations);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const movementType = returnType === "FROM_JOB" ? "RETURNED_FROM_JOB" : "RETURNED_TO_SUPPLIER";

    const res = await fetch("/api/movements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: form.itemId,
        quantity: Number(form.quantity),
        movementType,
        // Return from job = stock comes back TO a location
        // Return to supplier = stock goes FROM a location
        toLocationId: returnType === "FROM_JOB" ? form.toLocationId : null,
        fromLocationId: returnType === "TO_SUPPLIER" ? form.fromLocationId : null,
        clientName: form.clientName || null,
        projectName: form.projectName || null,
        projectCode: form.projectCode || null,
        sourceType: returnType === "TO_SUPPLIER" ? "SUPPLIER" : null,
        sourceName: form.sourceName || null,
        reference: form.reference || null,
        notes: form.notes || null,
      }),
    });

    if (res.ok) {
      setSuccess(true);
      setTimeout(() => router.push("/movements"), 1500);
    } else {
      const data = await res.json();
      setError(data.error || "Failed to record return");
    }
    setSubmitting(false);
  }

  const selectedItem = items.find((i) => i.id === form.itemId);

  return (
    <div>
      <PageHeader title="Return Stock" description="Record materials returned from jobs or to suppliers" />

      {success ? (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          Return recorded successfully. Redirecting...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 max-w-2xl space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Return Type</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={returnType === "FROM_JOB"} onChange={() => setReturnType("FROM_JOB")} />
                Return from Job (stock back in)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={returnType === "TO_SUPPLIER"} onChange={() => setReturnType("TO_SUPPLIER")} />
                Return to Supplier (stock out)
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Item *</label>
              <select required value={form.itemId} onChange={(e) => setForm({ ...form, itemId: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Select item...</option>
                {items.map((i) => <option key={i.id} value={i.id}>{i.code} — {i.description}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity * {selectedItem ? `(${UOM_LABELS[selectedItem.unitOfMeasure] || selectedItem.unitOfMeasure})` : ""}</label>
              <input type="number" required min="0.01" step="any" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          {returnType === "FROM_JOB" ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Return To Location *</label>
              <select required value={form.toLocationId} onChange={(e) => setForm({ ...form, toLocationId: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Select location...</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Location *</label>
              <select required value={form.fromLocationId} onChange={(e) => setForm({ ...form, fromLocationId: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Select location...</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          )}

          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              {returnType === "FROM_JOB" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                    <input type="text" value={form.projectName} onChange={(e) => setForm({ ...form, projectName: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Code</label>
                    <input type="text" value={form.projectCode} onChange={(e) => setForm({ ...form, projectCode: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </>
              )}
              {returnType === "TO_SUPPLIER" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name</label>
                  <input type="text" value={form.sourceName} onChange={(e) => setForm({ ...form, sourceName: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                <input type="text" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => router.back()} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={submitting} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
              {submitting ? "Recording..." : "Record Return"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
