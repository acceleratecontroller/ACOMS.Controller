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
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/locations").then((r) => r.json()).then(setLocations);
  }, []);

  const fetchStock = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (locationFilter) params.set("locationId", locationFilter);
    if (belowMinOnly) params.set("belowMinimumOnly", "true");
    const res = await fetch(`/api/stock?${params}`);
    if (res.ok) setStock(await res.json());
    setLoading(false);
  }, [locationFilter, belowMinOnly]);

  useEffect(() => { fetchStock(); }, [fetchStock]);

  const filtered = search
    ? stock.filter((s) =>
        s.itemCode.toLowerCase().includes(search.toLowerCase()) ||
        s.itemDescription.toLowerCase().includes(search.toLowerCase())
      )
    : stock;

  return (
    <div>
      <PageHeader title="Stock Levels" description="Current stock derived from movements" />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-48"
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
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Item Code</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Description</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Location</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Current Stock</th>
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
      )}
    </div>
  );
}
