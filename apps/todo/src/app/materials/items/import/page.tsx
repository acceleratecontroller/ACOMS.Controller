"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";

interface Supplier { id: string; name: string; isFreeIssue: boolean; clientName: string | null }

interface ImportResult {
  success: number;
  skipped: number;
  skippedCodes: string[];
  parseErrors: { row: number; message: string }[];
  createErrors: { code: string; message: string }[];
  total: number;
}

export default function ImportItemsPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/materials/suppliers").then((r) => r.json()).then(setSuppliers).catch(() => {});
  }, []);

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    if (supplierId) formData.append("supplierId", supplierId);

    const res = await fetch("/api/materials/items/import", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (res.ok) {
      setResult(data);
    } else {
      setError(data.error || "Import failed");
      if (data.errors) setResult(data);
    }
    setImporting(false);
  }

  return (
    <div>
      <PageHeader title="Import Items" description="Upload a CSV file to bulk-create items" />

      <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-3xl">
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">How to import</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>1. Prepare a CSV file with the columns listed below.</p>
            <p>2. Select the supplier these items belong to.</p>
            <p>3. Upload the file and click Import.</p>
            <p>Items with a code that already exists will be skipped (not overwritten).</p>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Required CSV Columns</h3>
          <div className="bg-gray-50 rounded-lg p-4 text-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-medium text-gray-500 uppercase">
                  <th className="pb-2 pr-4">Column Header</th>
                  <th className="pb-2 pr-4">Required</th>
                  <th className="pb-2">Description</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                <tr className="border-t border-gray-200">
                  <td className="py-2 pr-4 font-mono text-xs">itemCode</td>
                  <td className="py-2 pr-4 text-green-700 font-medium">Yes</td>
                  <td className="py-2">Unique item code (e.g. FC-001)</td>
                </tr>
                <tr className="border-t border-gray-200">
                  <td className="py-2 pr-4 font-mono text-xs">description</td>
                  <td className="py-2 pr-4 text-green-700 font-medium">Yes</td>
                  <td className="py-2">Item description</td>
                </tr>
                <tr className="border-t border-gray-200">
                  <td className="py-2 pr-4 font-mono text-xs">category</td>
                  <td className="py-2 pr-4 text-gray-400">No</td>
                  <td className="py-2">Civil, Fibre Cable, Copper Cable, Fibre Joint, Copper Joint, or Other</td>
                </tr>
                <tr className="border-t border-gray-200">
                  <td className="py-2 pr-4 font-mono text-xs">unitOfMeasure</td>
                  <td className="py-2 pr-4 text-gray-400">No</td>
                  <td className="py-2">EACH, METRE, ROLL, KILOGRAM, LITRE, BOX, PACK, LENGTH, SET, or OTHER (defaults to EACH)</td>
                </tr>
                <tr className="border-t border-gray-200">
                  <td className="py-2 pr-4 font-mono text-xs">customUnitOfMeasure</td>
                  <td className="py-2 pr-4 text-gray-400">No</td>
                  <td className="py-2">Custom unit name (only when unitOfMeasure is OTHER)</td>
                </tr>
                <tr className="border-t border-gray-200">
                  <td className="py-2 pr-4 font-mono text-xs">aliases</td>
                  <td className="py-2 pr-4 text-gray-400">No</td>
                  <td className="py-2">Alternative names, pipe-separated (e.g. &quot;name1|name2&quot;)</td>
                </tr>
                <tr className="border-t border-gray-200">
                  <td className="py-2 pr-4 font-mono text-xs">minimumStockLevel</td>
                  <td className="py-2 pr-4 text-gray-400">No</td>
                  <td className="py-2">Minimum stock threshold (number)</td>
                </tr>
                <tr className="border-t border-gray-200">
                  <td className="py-2 pr-4 font-mono text-xs">notes</td>
                  <td className="py-2 pr-4 text-gray-400">No</td>
                  <td className="py-2">Any additional notes</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Example CSV</h3>
          <div className="bg-gray-50 rounded p-3 text-xs font-mono text-gray-600 overflow-x-auto">
            itemCode,description,category,unitOfMeasure,customUnitOfMeasure,aliases,minimumStockLevel,notes<br />
            FC-001,12 Core SM Fibre Cable,Fibre Cable,METRE,,,100,Main backbone cable<br />
            CC-001,50 Pair Copper Cable,Copper Cable,METRE,,,50,<br />
            CJ-001,Copper Joint Kit B,Copper Joint,EACH,,,20,Includes gel fill<br />
            CV-001,Concrete Mix 20kg,Civil,OTHER,bag,,30,
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier * — all imported items will be linked to this supplier</label>
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm max-w-sm">
              <option value="">Select supplier...</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {(() => {
              const selected = suppliers.find((s) => s.id === supplierId);
              if (!selected) return null;
              return (
                <div className="mt-2">
                  {selected.isFreeIssue ? (
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                      Free Issue — {selected.clientName} (all imported items will be marked as client free issue)
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                      Company Owned
                    </span>
                  )}
                </div>
              );
            })()}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select CSV File</label>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <button
            onClick={handleImport}
            disabled={!file || !supplierId || importing}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {importing ? "Importing..." : "Import"}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-4 space-y-3">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
              <p className="font-medium text-green-800">
                Created: {result.success} / {result.total} items
              </p>
              {result.skipped > 0 && (
                <p className="text-green-700 mt-1">
                  Skipped (already exist): {result.skipped} — {result.skippedCodes.join(", ")}
                </p>
              )}
            </div>

            {result.parseErrors?.length > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
                <p className="font-medium text-yellow-800 mb-1">Parse Errors:</p>
                <ul className="list-disc list-inside text-yellow-700">
                  {result.parseErrors.map((e, i) => (
                    <li key={i}>Row {e.row}: {e.message}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
