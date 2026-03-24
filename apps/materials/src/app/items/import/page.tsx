"use client";

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";

interface ImportResult {
  success: number;
  skipped: number;
  skippedCodes: string[];
  parseErrors: { row: number; message: string }[];
  createErrors: { code: string; message: string }[];
  total: number;
}

export default function ImportItemsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/items/import", {
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

      <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-2xl">
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">CSV Format</h3>
          <p className="text-xs text-gray-500 mb-2">
            Required columns: <span className="font-mono">code</span>, <span className="font-mono">description</span>
          </p>
          <p className="text-xs text-gray-500 mb-2">
            Optional columns: <span className="font-mono">category</span>, <span className="font-mono">unitOfMeasure</span> (EACH, METRE, ROLL, etc.), <span className="font-mono">aliases</span> (pipe-separated: &quot;alias1|alias2&quot;), <span className="font-mono">minimumStockLevel</span>, <span className="font-mono">notes</span>
          </p>
          <div className="bg-gray-50 rounded p-3 text-xs font-mono text-gray-600">
            code,description,category,unitOfMeasure,aliases,minimumStockLevel<br />
            EL-001,Cable 2.5mm Twin,Electrical,METRE,,100<br />
            PL-001,PVC Pipe 50mm,Plumbing,LENGTH,50mm pipe|PVC 50,20
          </div>
        </div>

        <div className="mb-4">
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
          disabled={!file || importing}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {importing ? "Importing..." : "Import"}
        </button>

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

            {result.parseErrors.length > 0 && (
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
