"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { MOVEMENT_TYPE_LABELS, UOM_LABELS } from "@/modules/materials/constants";

interface DashboardData {
  lowStockItems: {
    itemCode: string;
    itemDescription: string;
    unitOfMeasure: string;
    locationName: string;
    currentStock: number;
    minimumStockLevel: number | null;
  }[];
  recentMovements: {
    id: string;
    quantity: string;
    movementType: string;
    createdAt: string;
    item: { code: string; description: string };
    fromLocation: { name: string } | null;
    toLocation: { name: string } | null;
  }[];
  openStocktakes: {
    id: string;
    createdAt: string;
    location: { name: string };
    _count: { lines: number };
  }[];
  stockByLocation: {
    locationName: string;
    itemCount: number;
  }[];
  counts: {
    items: number;
    locations: number;
    movements: number;
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, []);

  if (loading || !data) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Material Tracker overview" />
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    );
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div>
      <PageHeader title="Dashboard" description="Material Tracker overview" />

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{data.counts.items}</div>
          <div className="text-sm text-gray-500">Active Items</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{data.counts.locations}</div>
          <div className="text-sm text-gray-500">Locations</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{data.counts.movements}</div>
          <div className="text-sm text-gray-500">Total Movements</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Low Stock Alerts</h2>
          {data.lowStockItems.length === 0 ? (
            <p className="text-xs text-gray-400">No items below minimum stock level.</p>
          ) : (
            <div className="space-y-2">
              {data.lowStockItems.slice(0, 10).map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs border-b border-gray-100 pb-1">
                  <div>
                    <span className="font-mono font-medium">{item.itemCode}</span>{" "}
                    <span className="text-gray-500">{item.itemDescription}</span>
                    <span className="text-gray-400 ml-1">@ {item.locationName}</span>
                  </div>
                  <div className="text-red-600 font-medium">
                    {item.currentStock} / {item.minimumStockLevel} {UOM_LABELS[item.unitOfMeasure] || ""}
                  </div>
                </div>
              ))}
            </div>
          )}
          <Link href="/stock?belowMinimumOnly=true" className="text-xs text-blue-600 hover:text-blue-800 mt-2 inline-block">
            View all stock levels
          </Link>
        </div>

        {/* Stock by Location */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Stock by Location</h2>
          {data.stockByLocation.length === 0 ? (
            <p className="text-xs text-gray-400">No stock data yet.</p>
          ) : (
            <div className="space-y-2">
              {data.stockByLocation.map((loc, i) => (
                <div key={i} className="flex items-center justify-between text-xs border-b border-gray-100 pb-1">
                  <span className="font-medium">{loc.locationName}</span>
                  <span className="text-gray-500">{loc.itemCount} items in stock</span>
                </div>
              ))}
            </div>
          )}
          <Link href="/stock" className="text-xs text-blue-600 hover:text-blue-800 mt-2 inline-block">
            View stock levels
          </Link>
        </div>

        {/* Recent Movements */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Recent Movements</h2>
          {data.recentMovements.length === 0 ? (
            <p className="text-xs text-gray-400">No movements recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {data.recentMovements.map((m) => (
                <div key={m.id} className="text-xs border-b border-gray-100 pb-1">
                  <div className="flex items-center justify-between">
                    <span>
                      <span className="inline-block px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] font-medium mr-1">
                        {MOVEMENT_TYPE_LABELS[m.movementType] || m.movementType}
                      </span>
                      <span className="font-mono">{m.item.code}</span>
                      <span className="text-gray-400 ml-1">x{Number(m.quantity)}</span>
                    </span>
                    <span className="text-gray-400">{formatDate(m.createdAt)}</span>
                  </div>
                  <div className="text-gray-400 mt-0.5">
                    {m.fromLocation?.name || "—"} → {m.toLocation?.name || "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
          <Link href="/movements" className="text-xs text-blue-600 hover:text-blue-800 mt-2 inline-block">
            View all movements
          </Link>
        </div>

        {/* Open Stocktakes */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Open Stocktakes</h2>
          {data.openStocktakes.length === 0 ? (
            <p className="text-xs text-gray-400">No open stocktakes.</p>
          ) : (
            <div className="space-y-2">
              {data.openStocktakes.map((st) => (
                <div key={st.id} className="flex items-center justify-between text-xs border-b border-gray-100 pb-1">
                  <div>
                    <span className="font-medium">{st.location.name}</span>
                    <span className="text-gray-400 ml-2">{st._count.lines} items</span>
                  </div>
                  <Link href={`/stocktakes/${st.id}`} className="text-blue-600 hover:text-blue-800">
                    Continue
                  </Link>
                </div>
              ))}
            </div>
          )}
          <Link href="/stocktakes" className="text-xs text-blue-600 hover:text-blue-800 mt-2 inline-block">
            View all stocktakes
          </Link>
        </div>
      </div>
    </div>
  );
}
