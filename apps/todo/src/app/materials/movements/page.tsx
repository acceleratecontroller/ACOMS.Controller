"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/PageHeader";
import { MOVEMENT_TYPE_LABELS, MOVEMENT_TYPE_OPTIONS, UOM_LABELS } from "@/modules/materials/constants";

interface Movement {
  id: string;
  quantity: string;
  movementType: string;
  ownershipType: string;
  clientName: string | null;
  projectName: string | null;
  projectCode: string | null;
  sourceType: string | null;
  sourceName: string | null;
  reference: string | null;
  notes: string | null;
  createdById: string;
  createdAt: string;
  item: { code: string; description: string; unitOfMeasure: string };
  fromLocation: { name: string } | null;
  toLocation: { name: string } | null;
}

export default function MovementHistoryPage() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ movementType: "", locationId: "", clientName: "", projectCode: "" });
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  useEffect(() => {
    fetch("/api/materials/locations").then((r) => r.json()).then(setLocations);
  }, []);

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    params.set("offset", String(offset));
    if (filters.movementType) params.set("movementType", filters.movementType);
    if (filters.locationId) params.set("locationId", filters.locationId);
    if (filters.clientName) params.set("clientName", filters.clientName);
    if (filters.projectCode) params.set("projectCode", filters.projectCode);

    const res = await fetch(`/api/materials/movements?${params}`);
    if (res.ok) {
      const data = await res.json();
      setMovements(data.movements);
      setTotal(data.total);
    }
    setLoading(false);
  }, [filters, offset]);

  useEffect(() => { fetchMovements(); }, [fetchMovements]);

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div>
      <PageHeader title="Movement History" description="Full audit trail of all stock movements" />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={filters.movementType}
          onChange={(e) => { setFilters({ ...filters, movementType: e.target.value }); setOffset(0); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All types</option>
          {MOVEMENT_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={filters.locationId}
          onChange={(e) => { setFilters({ ...filters, locationId: e.target.value }); setOffset(0); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All locations</option>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <input
          type="text"
          placeholder="Client name..."
          value={filters.clientName}
          onChange={(e) => { setFilters({ ...filters, clientName: e.target.value }); setOffset(0); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full sm:w-40"
        />
        <input
          type="text"
          placeholder="Project code..."
          value={filters.projectCode}
          onChange={(e) => { setFilters({ ...filters, projectCode: e.target.value }); setOffset(0); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full sm:w-40"
        />
        <span className="text-xs text-gray-400 ml-auto">{total} movements</span>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : movements.length === 0 ? (
        <p className="text-gray-500 text-sm">No movements found.</p>
      ) : (
        <>
          <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Item</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-700">Qty</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">From</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">To</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Client</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Project</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Reference</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
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
                    <td className="px-4 py-3 text-gray-500">{m.fromLocation?.name || "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{m.toLocation?.name || "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{m.clientName || "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{m.projectCode || m.projectName || "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{m.reference || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
            >
              Previous
            </button>
            <span className="text-xs text-gray-500">
              Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}
            </span>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
              className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
