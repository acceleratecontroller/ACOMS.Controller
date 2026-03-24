"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { OWNERSHIP_TYPE_OPTIONS, SOURCE_TYPE_OPTIONS, UOM_LABELS } from "@/modules/materials/constants";

interface Item { id: string; code: string; description: string; unitOfMeasure: string }
interface Location { id: string; name: string }

interface ReceiveLine {
  key: string;
  itemId: string;
  quantity: string;
  toLocationId: string;
}

function makeLine(): ReceiveLine {
  return { key: crypto.randomUUID(), itemId: "", quantity: "", toLocationId: "" };
}

export default function ReceivePage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{ success: number; failed: number } | null>(null);

  const [header, setHeader] = useState({
    ownershipType: "COMPANY",
    sourceType: "SUPPLIER",
    sourceName: "",
    clientName: "",
    externalClientId: "",
    externalSource: "",
    reference: "",
    notes: "",
  });

  const [lines, setLines] = useState<ReceiveLine[]>([makeLine()]);

  useEffect(() => {
    fetch("/api/materials/items").then((r) => r.json()).then(setItems);
    fetch("/api/materials/locations").then((r) => r.json()).then(setLocations);
  }, []);

  const isFreeIssue = header.ownershipType === "CLIENT_FREE_ISSUE";
  const movementType = isFreeIssue ? "RECEIVED_FREE_ISSUE" : "RECEIVED";

  function updateLine(key: string, field: keyof ReceiveLine, value: string) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, [field]: value } : l)));
  }

  function removeLine(key: string) {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResults(null);

    const validLines = lines.filter((l) => l.itemId && l.quantity && l.toLocationId);
    if (validLines.length === 0) {
      setError("Add at least one complete line item (item, quantity, and location).");
      setSubmitting(false);
      return;
    }

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const line of validLines) {
      const res = await fetch("/api/materials/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: line.itemId,
          quantity: Number(line.quantity),
          movementType,
          ownershipType: header.ownershipType,
          toLocationId: line.toLocationId,
          sourceType: header.sourceType || null,
          sourceName: header.sourceName || null,
          clientName: header.clientName || null,
          externalClientId: header.externalClientId || null,
          externalSource: header.externalSource || null,
          reference: header.reference || null,
          notes: header.notes || null,
        }),
      });

      if (res.ok) {
        success++;
      } else {
        failed++;
        const item = items.find((i) => i.id === line.itemId);
        const data = await res.json().catch(() => ({ error: "Unknown error" }));
        errors.push(`${item?.code || "Unknown"}: ${data.error || "Failed"}`);
      }
    }

    if (failed === 0) {
      setResults({ success, failed });
      setTimeout(() => router.push("/materials/movements"), 1500);
    } else {
      setResults({ success, failed });
      setError(`${failed} item(s) failed: ${errors.join("; ")}`);
    }
    setSubmitting(false);
  }

  return (
    <div>
      <PageHeader title="Receive Stock" description="Record incoming materials — add multiple items to a single receipt" />

      {results && results.failed === 0 ? (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          {results.success} item(s) received successfully. Redirecting...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-4xl">
          {/* Receipt header */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Receipt Details</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ownership</label>
                <select value={header.ownershipType} onChange={(e) => setHeader({ ...header, ownershipType: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  {OWNERSHIP_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source Type</label>
                <select value={header.sourceType} onChange={(e) => setHeader({ ...header, sourceType: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  {SOURCE_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source Name</label>
                <input type="text" value={header.sourceName} onChange={(e) => setHeader({ ...header, sourceName: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Supplier or client name" />
              </div>
            </div>

            {isFreeIssue && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                  <input type="text" value={header.clientName} onChange={(e) => setHeader({ ...header, clientName: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">External Client ID</label>
                  <input type="text" value={header.externalClientId} onChange={(e) => setHeader({ ...header, externalClientId: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference (PO, Docket, etc.)</label>
                <input type="text" value={header.reference} onChange={(e) => setHeader({ ...header, reference: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <input type="text" value={header.notes} onChange={(e) => setHeader({ ...header, notes: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Items to Receive</h3>
              <button type="button" onClick={() => setLines([...lines, makeLine()])} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                + Add Line
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-[1fr_120px_1fr_40px] gap-3 text-xs font-medium text-gray-500 px-1">
                <span>Item</span>
                <span>Quantity</span>
                <span>To Location</span>
                <span></span>
              </div>
              {lines.map((line) => {
                const selectedItem = items.find((i) => i.id === line.itemId);
                return (
                  <div key={line.key} className="grid grid-cols-[1fr_120px_1fr_40px] gap-3 items-center">
                    <select value={line.itemId} onChange={(e) => updateLine(line.key, "itemId", e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      <option value="">Select item...</option>
                      {items.map((i) => <option key={i.id} value={i.id}>{i.code} — {i.description}</option>)}
                    </select>
                    <div className="relative">
                      <input type="number" min="0.01" step="any" value={line.quantity} onChange={(e) => updateLine(line.key, "quantity", e.target.value)} placeholder="Qty" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                      {selectedItem && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                          {UOM_LABELS[selectedItem.unitOfMeasure] || ""}
                        </span>
                      )}
                    </div>
                    <select value={line.toLocationId} onChange={(e) => updateLine(line.key, "toLocationId", e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      <option value="">Select location...</option>
                      {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                    <button type="button" onClick={() => removeLine(line.key)} disabled={lines.length <= 1} className="text-gray-400 hover:text-red-500 disabled:opacity-30 text-lg">
                      &times;
                    </button>
                  </div>
                );
              })}
            </div>

            <button type="button" onClick={() => setLines([...lines, makeLine()])} className="mt-3 w-full border-2 border-dashed border-gray-300 rounded-lg py-2 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600">
              + Add another item
            </button>
          </div>

          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
          {results && results.failed > 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              {results.success} item(s) received successfully, {results.failed} failed.
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => router.back()} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={submitting} className="bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
              {submitting ? "Recording..." : `Receive ${lines.filter((l) => l.itemId && l.quantity && l.toLocationId).length} Item(s)`}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
