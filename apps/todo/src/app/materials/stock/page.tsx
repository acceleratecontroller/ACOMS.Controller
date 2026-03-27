"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/PageHeader";
import { UOM_LABELS } from "@/modules/materials/constants";

interface StockLevel {
  itemId: string;
  itemCode: string;
  itemDescription: string;
  unitOfMeasure: string;
  locationId: string;
  locationName: string;
  currentStock: number;
  allocated: number;
  unallocated: number;
  minimumStockLevel: number | null;
  isBelowMinimum: boolean;
}

interface Location { id: string; name: string }

export default function StockPage() {
  const [stock, setStock] = useState<StockLevel[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationFilter, setLocationFilter] = useState("");
  const [belowMinOnly, setBelowMinOnly] = useState(false);
  const [hideZero, setHideZero] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/materials/locations").then((r) => r.json()).then(setLocations);
  }, []);

  const fetchStock = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (locationFilter) params.set("locationId", locationFilter);
    if (belowMinOnly) params.set("belowMinimumOnly", "true");
    const res = await fetch(`/api/materials/stock?${params}`);
    if (res.ok) setStock(await res.json());
    setLoading(false);
  }, [locationFilter, belowMinOnly]);

  useEffect(() => { fetchStock(); }, [fetchStock]);

  let filtered = stock;
  if (hideZero) filtered = filtered.filter((s) => s.currentStock > 0);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((s) =>
      s.itemCode.toLowerCase().includes(q) ||
      s.itemDescription.toLowerCase().includes(q)
    );
  }

  return (
    <div>
      <PageHeader title="Stock Levels" description="Current stock derived from movements" />

      <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-4">
        <input
          type="text"
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full sm:w-48"
        />
        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All locations</option>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={hideZero} onChange={(e) => setHideZero(e.target.checked)} />
          Hide zero stock
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={belowMinOnly} onChange={(e) => setBelowMinOnly(e.target.checked)} />
          Below minimum only
        </label>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} rows</span>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500 text-sm">No stock data found.</p>
      ) : (
        <>
          {/* Mobile card layout */}
          <div className="space-y-3 md:hidden">
            {filtered.map((s, idx) => (
              <div key={idx} className={`bg-white rounded-lg border p-4 ${s.isBelowMinimum ? "border-red-200 bg-red-50" : "border-gray-200"}`}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="min-w-0">
                    <div className="font-mono text-sm font-medium text-gray-900">{s.itemCode}</div>
                    <div className="text-sm text-gray-600 truncate">{s.itemDescription}</div>
                  </div>
                  {s.isBelowMinimum ? (
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 shrink-0">Low</span>
                  ) : s.currentStock <= 0 ? (
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500 shrink-0">None</span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 shrink-0">OK</span>
                  )}
                </div>
                <div className="text-xs text-gray-400 mb-2">{s.locationName}</div>
                <div className="grid grid-cols-3 gap-2 text-center bg-gray-50 rounded-lg p-2">
                  <div>
                    <div className="text-xs text-gray-400">Total</div>
                    <div className="text-sm font-medium text-gray-900">{s.currentStock}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Free</div>
                    <div className="text-sm font-medium text-green-600">{s.unallocated}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Allocated</div>
                    <div className="text-sm font-medium text-blue-600">{s.allocated > 0 ? s.allocated : "—"}</div>
                  </div>
                </div>
                {s.minimumStockLevel != null && (
                  <div className="text-xs text-gray-400 mt-2">Min level: {s.minimumStockLevel} {UOM_LABELS[s.unitOfMeasure] || ""}</div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop table layout */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Item Code</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Description</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Location</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-700">Total Stock</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-700">Unallocated</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-700">Allocated to Jobs</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-700">Min Level</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, idx) => (
                  <tr key={idx} className={`border-b border-gray-100 hover:bg-gray-50 ${s.isBelowMinimum ? "bg-red-50" : ""}`}>
                    <td className="px-4 py-3 font-mono font-medium">{s.itemCode}</td>
                    <td className="px-4 py-3">{s.itemDescription}</td>
                    <td className="px-4 py-3 text-gray-500">{s.locationName}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {s.currentStock} {UOM_LABELS[s.unitOfMeasure] || ""}
                    </td>
                    <td className="px-4 py-3 text-right text-green-600 font-medium">
                      {s.unallocated}
                    </td>
                    <td className="px-4 py-3 text-right text-blue-600 font-medium">
                      {s.allocated > 0 ? s.allocated : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {s.minimumStockLevel ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {s.isBelowMinimum ? (
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">Low</span>
                      ) : s.currentStock <= 0 ? (
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">None</span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
