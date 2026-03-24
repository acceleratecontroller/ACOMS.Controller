"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { UOM_LABELS } from "@/modules/materials/constants";

interface StocktakeLine {
  id: string;
  itemId: string;
  expectedQty: string;
  countedQty: string;
  notes: string | null;
  movementId: string | null;
  item: { code: string; description: string; unitOfMeasure: string };
  movement?: { id: string; quantity: string } | null;
}

interface Stocktake {
  id: string;
  status: string;
  notes: string | null;
  completedAt: string | null;
  createdAt: string;
  location: { name: string };
  lines: StocktakeLine[];
}

export default function StocktakeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [stocktake, setStocktake] = useState<Stocktake | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [counts, setCounts] = useState<Record<string, { countedQty: string; notes: string }>>({});

  useEffect(() => {
    fetch(`/api/materials/stocktakes/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setStocktake(data);
        const initial: Record<string, { countedQty: string; notes: string }> = {};
        for (const line of data.lines) {
          initial[line.id] = {
            countedQty: String(Number(line.countedQty)),
            notes: line.notes || "",
          };
        }
        setCounts(initial);
        setLoading(false);
      });
  }, [params.id]);

  async function handleSave() {
    if (!stocktake) return;
    setSaving(true);
    const updates = Object.entries(counts).map(([lineId, vals]) => ({
      lineId,
      countedQty: Number(vals.countedQty) || 0,
      notes: vals.notes || null,
    }));

    const res = await fetch(`/api/materials/stocktakes/${stocktake.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    if (res.ok) {
      const updated = await res.json();
      setStocktake(updated);
    }
    setSaving(false);
  }

  async function handleComplete() {
    if (!stocktake) return;
    setCompleting(true);

    // Save first
    await handleSave();

    const res = await fetch(`/api/materials/stocktakes/${stocktake.id}/complete`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setStocktake(data.stocktake);
      setShowComplete(false);
    }
    setCompleting(false);
  }

  if (loading || !stocktake) {
    return <p className="text-gray-500 text-sm">Loading...</p>;
  }

  const isDraft = stocktake.status === "DRAFT";
  const discrepancies = stocktake.lines.filter((l) => {
    const expected = Number(l.expectedQty);
    const counted = counts[l.id] ? Number(counts[l.id].countedQty) : Number(l.countedQty);
    return counted !== expected;
  });

  return (
    <div>
      <PageHeader
        title={`Stocktake — ${stocktake.location.name}`}
        description={`Status: ${stocktake.status} | Created: ${new Date(stocktake.createdAt).toLocaleDateString("en-AU")}${stocktake.completedAt ? ` | Completed: ${new Date(stocktake.completedAt).toLocaleDateString("en-AU")}` : ""}`}
      />

      {isDraft && (
        <div className="flex items-center gap-3 mb-4">
          <button onClick={handleSave} disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Saving..." : "Save Counts"}
          </button>
          <button onClick={() => setShowComplete(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
            Complete Stocktake
          </button>
          {discrepancies.length > 0 && (
            <span className="text-sm text-orange-600">{discrepancies.length} discrepancies</span>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Item Code</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Description</th>
              <th className="text-right px-4 py-3 font-medium text-gray-700">Expected</th>
              <th className="text-right px-4 py-3 font-medium text-gray-700">Counted</th>
              <th className="text-right px-4 py-3 font-medium text-gray-700">Variance</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Notes</th>
            </tr>
          </thead>
          <tbody>
            {stocktake.lines.map((line) => {
              const expected = Number(line.expectedQty);
              const counted = counts[line.id] ? Number(counts[line.id].countedQty) : Number(line.countedQty);
              const variance = counted - expected;
              const uom = UOM_LABELS[line.item.unitOfMeasure] || "";

              return (
                <tr key={line.id} className={`border-b border-gray-100 ${variance !== 0 ? "bg-yellow-50" : ""}`}>
                  <td className="px-4 py-3 font-mono font-medium">{line.item.code}</td>
                  <td className="px-4 py-3">{line.item.description}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{expected} {uom}</td>
                  <td className="px-4 py-3 text-right">
                    {isDraft ? (
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={counts[line.id]?.countedQty || "0"}
                        onChange={(e) =>
                          setCounts({
                            ...counts,
                            [line.id]: { ...counts[line.id], countedQty: e.target.value },
                          })
                        }
                        className="w-24 border border-gray-300 rounded px-2 py-1 text-sm text-right"
                      />
                    ) : (
                      <span className="font-medium">{counted} {uom}</span>
                    )}
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${variance > 0 ? "text-green-600" : variance < 0 ? "text-red-600" : "text-gray-400"}`}>
                    {variance === 0 ? "—" : `${variance > 0 ? "+" : ""}${variance}`}
                  </td>
                  <td className="px-4 py-3">
                    {isDraft ? (
                      <input
                        type="text"
                        value={counts[line.id]?.notes || ""}
                        onChange={(e) =>
                          setCounts({
                            ...counts,
                            [line.id]: { ...counts[line.id], notes: e.target.value },
                          })
                        }
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        placeholder="Optional note..."
                      />
                    ) : (
                      <span className="text-gray-500">{line.notes || "—"}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        isOpen={showComplete}
        title="Complete Stocktake"
        message={`This will create ${discrepancies.length} adjustment movements and lock this stocktake. This cannot be undone.`}
        confirmLabel="Complete"
        confirmVariant="success"
        onConfirm={handleComplete}
        onCancel={() => setShowComplete(false)}
      />
    </div>
  );
}
