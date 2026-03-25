"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Modal } from "@/components/Modal";
import { MOVEMENT_TYPE_LABELS, UOM_LABELS } from "@/modules/materials/constants";

interface ItemOption { id: string; code: string; description: string; unitOfMeasure: string }

interface JobMaterial {
  id: string;
  itemId: string;
  requiredQty: number;
  receivedQty: number;
  outstanding: number;
  status: string;
  notes: string | null;
  item: { id: string; code: string; description: string; unitOfMeasure: string };
}

interface ItemSummary {
  code: string;
  description: string;
  unitOfMeasure: string;
  received: number;
  movementCount: number;
}

interface Movement {
  id: string;
  quantity: string;
  movementType: string;
  reference: string | null;
  notes: string | null;
  createdAt: string;
  item: { code: string; description: string; unitOfMeasure: string };
  fromLocation: { name: string } | null;
  toLocation: { name: string } | null;
}

interface JobDetail {
  id: string;
  projectId: string;
  name: string;
  client: string;
  contact: string;
  summary: { totalReceived: number; movementCount: number };
  materials: JobMaterial[];
  itemSummary: ItemSummary[];
  movements: Movement[];
}

// ─── Item autocomplete for adding requirements ───────────
function RequirementItemPicker({
  items,
  value,
  onChange,
}: {
  items: ItemOption[];
  value: string;
  onChange: (itemId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedItem = items.find((i) => i.id === value);

  const filtered = query.length > 0
    ? items.filter((i) =>
        i.code.toLowerCase().includes(query.toLowerCase()) ||
        i.description.toLowerCase().includes(query.toLowerCase()),
      ).slice(0, 30)
    : [];

  useEffect(() => { setHighlightIdx(0); }, [query]);
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.children[highlightIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [highlightIdx]);

  function selectItem(item: ItemOption) {
    onChange(item.id);
    setQuery("");
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open && e.key !== "Escape") setOpen(true);
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlightIdx((p) => Math.min(p + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlightIdx((p) => Math.max(p - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (filtered.length > 0 && open) selectItem(filtered[highlightIdx]); }
    else if (e.key === "Escape") setOpen(false);
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={open ? query : (selectedItem ? `${selectedItem.code} — ${selectedItem.description}` : query)}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); if (value) onChange(""); }}
        onFocus={() => { setQuery(""); setOpen(true); }}
        onBlur={() => { setTimeout(() => setOpen(false), 150); }}
        onKeyDown={handleKeyDown}
        placeholder="Type item code..."
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
      />
      {open && filtered.length > 0 && (
        <div ref={listRef} className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filtered.map((item, idx) => (
            <div
              key={item.id}
              onMouseDown={(e) => { e.preventDefault(); selectItem(item); }}
              className={`px-3 py-2 text-sm cursor-pointer ${idx === highlightIdx ? "bg-blue-50 text-blue-800" : "hover:bg-gray-50"}`}
            >
              <span className="font-mono font-medium">{item.code}</span>
              <span className="text-gray-500 ml-2">— {item.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Status badge ────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-700",
    REQUESTED: "bg-blue-100 text-blue-700",
    FULFILLED: "bg-green-100 text-green-700",
  };
  const labels: Record<string, string> = {
    PENDING: "Pending",
    REQUESTED: "Requested",
    FULFILLED: "Fulfilled",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-600"}`}>
      {labels[status] || status}
    </span>
  );
}

// ─── Main page ───────────────────────────────────────────
export default function JobDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [job, setJob] = useState<JobDetail | null>(null);
  const [allItems, setAllItems] = useState<ItemOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ itemId: "", requiredQty: "", notes: "" });
  const [addError, setAddError] = useState<string | null>(null);

  const fetchJob = useCallback(() => {
    fetch(`/api/materials/jobs/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Job not found");
        return r.json();
      })
      .then(setJob)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchJob();
    fetch("/api/materials/items").then((r) => r.json()).then(setAllItems).catch(() => {});
  }, [fetchJob]);

  async function handleAddMaterial(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);

    const res = await fetch(`/api/materials/jobs/${id}/materials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: addForm.itemId,
        requiredQty: Number(addForm.requiredQty),
        notes: addForm.notes || null,
      }),
    });

    if (res.ok) {
      setShowAddModal(false);
      setAddForm({ itemId: "", requiredQty: "", notes: "" });
      fetchJob();
    } else {
      const data = await res.json();
      setAddError(data.error || "Failed to add requirement");
    }
  }

  async function updateMaterialStatus(materialId: string, status: string) {
    await fetch(`/api/materials/jobs/${id}/materials/${materialId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchJob();
  }

  async function deleteMaterial(materialId: string) {
    await fetch(`/api/materials/jobs/${id}/materials/${materialId}`, { method: "DELETE" });
    fetchJob();
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  if (loading) return <p className="text-gray-500 text-sm p-8">Loading...</p>;
  if (error || !job) return (
    <div className="p-8">
      <p className="text-red-600 text-sm mb-4">{error || "Job not found"}</p>
      <Link href="/materials/jobs" className="text-blue-600 hover:text-blue-800 text-sm">Back to Jobs</Link>
    </div>
  );

  const pendingCount = job.materials.filter((m) => m.status === "PENDING").length;
  const requestedCount = job.materials.filter((m) => m.status === "REQUESTED").length;
  const fulfilledCount = job.materials.filter((m) => m.status === "FULFILLED").length;

  return (
    <div>
      <div className="mb-4">
        <Link href="/materials/jobs" className="text-sm text-blue-600 hover:text-blue-800">Back to Jobs</Link>
      </div>

      <PageHeader
        title={`${job.projectId} — ${job.name}`}
        description={`Client: ${job.client} | Contact: ${job.contact}`}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs font-medium text-gray-500 uppercase">Total Received</div>
          <div className="text-2xl font-bold text-green-600 mt-1">{job.summary.totalReceived}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs font-medium text-gray-500 uppercase">Movements</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{job.summary.movementCount}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs font-medium text-gray-500 uppercase">Requirements</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{job.materials.length}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs font-medium text-gray-500 uppercase">Outstanding</div>
          <div className="text-2xl font-bold text-orange-600 mt-1">
            {job.materials.filter((m) => m.status !== "FULFILLED").length}
          </div>
        </div>
      </div>

      {/* Material Requirements */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900">
            Material Requirements
            {job.materials.length > 0 && (
              <span className="font-normal text-gray-500 ml-2">
                ({fulfilledCount} fulfilled, {requestedCount} requested, {pendingCount} pending)
              </span>
            )}
          </h3>
          <button
            onClick={() => { setAddForm({ itemId: "", requiredQty: "", notes: "" }); setAddError(null); setShowAddModal(true); }}
            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Add Requirement
          </button>
        </div>

        {job.materials.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
            <p className="text-gray-500 text-sm">No material requirements added yet. Add requirements to track what this job needs.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Item</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-700">Required</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-700">Received</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-700">Outstanding</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Notes</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {job.materials.map((mat) => {
                  const uom = UOM_LABELS[mat.item.unitOfMeasure] || "";
                  return (
                    <tr key={mat.id} className={`border-b border-gray-100 ${mat.outstanding > 0 ? "bg-orange-50/50" : ""}`}>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs">{mat.item.code}</span>{" "}
                        <span className="text-gray-500">{mat.item.description}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{mat.requiredQty} {uom}</td>
                      <td className="px-4 py-3 text-right text-green-600 font-medium">{mat.receivedQty} {uom}</td>
                      <td className="px-4 py-3 text-right">
                        {mat.outstanding > 0 ? (
                          <span className="font-bold text-orange-600">{mat.outstanding} {uom}</span>
                        ) : (
                          <span className="text-green-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={mat.status} /></td>
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-[150px] truncate">{mat.notes || "—"}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {mat.status === "PENDING" && (
                          <button onClick={() => updateMaterialStatus(mat.id, "REQUESTED")} className="text-blue-600 hover:text-blue-800 text-xs mr-2">
                            Mark Requested
                          </button>
                        )}
                        {mat.status === "REQUESTED" && (
                          <button onClick={() => updateMaterialStatus(mat.id, "PENDING")} className="text-gray-500 hover:text-gray-700 text-xs mr-2">
                            Back to Pending
                          </button>
                        )}
                        {mat.status === "FULFILLED" && mat.outstanding > 0 && (
                          <button onClick={() => updateMaterialStatus(mat.id, "REQUESTED")} className="text-orange-600 hover:text-orange-800 text-xs mr-2">
                            Reopen
                          </button>
                        )}
                        <button onClick={() => deleteMaterial(mat.id)} className="text-red-500 hover:text-red-700 text-xs">
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Item breakdown from movements */}
      {job.itemSummary.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Received Materials Summary</h3>
          <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Item Code</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Description</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-700">Qty Received</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-700">Movements</th>
                </tr>
              </thead>
              <tbody>
                {job.itemSummary.map((item) => (
                  <tr key={item.code} className="border-b border-gray-100">
                    <td className="px-4 py-3 font-mono text-xs">{item.code}</td>
                    <td className="px-4 py-3 text-gray-700">{item.description}</td>
                    <td className="px-4 py-3 text-right text-green-600 font-medium">{item.received} {UOM_LABELS[item.unitOfMeasure] || ""}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{item.movementCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Movement history */}
      <h3 className="text-sm font-semibold text-gray-900 mb-2">Movement History</h3>
      {job.movements.length === 0 ? (
        <p className="text-gray-500 text-sm">No movements recorded against this job yet.</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Item</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Qty</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Location</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Reference</th>
              </tr>
            </thead>
            <tbody>
              {job.movements.map((m) => (
                <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(m.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                      {MOVEMENT_TYPE_LABELS[m.movementType] || m.movementType}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs">{m.item.code}</span>{" "}
                    <span className="text-gray-500">{m.item.description}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {Number(m.quantity)} {UOM_LABELS[m.item.unitOfMeasure] || ""}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{m.toLocation?.name || m.fromLocation?.name || "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{m.reference || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Requirement Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Material Requirement">
        <form onSubmit={handleAddMaterial} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item *</label>
            <RequirementItemPicker
              items={allItems}
              value={addForm.itemId}
              onChange={(itemId) => setAddForm({ ...addForm, itemId })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Required Quantity *</label>
            <input
              type="number"
              required
              min="0.01"
              step="any"
              value={addForm.requiredQty}
              onChange={(e) => setAddForm({ ...addForm, requiredQty: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input
              type="text"
              value={addForm.notes}
              onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="e.g. Client to provide, ordered from supplier..."
            />
          </div>
          {addError && <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">{addError}</div>}
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowAddModal(false)} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={!addForm.itemId} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">Add</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
