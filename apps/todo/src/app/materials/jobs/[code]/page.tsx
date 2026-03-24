"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { MOVEMENT_TYPE_LABELS, UOM_LABELS } from "@/modules/materials/constants";

interface ItemSummary {
  code: string;
  description: string;
  unitOfMeasure: string;
  issued: number;
  returned: number;
  net: number;
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
  projectCode: string;
  projectName: string | null;
  clientName: string | null;
  summary: { totalIssued: number; totalReturned: number; netIssued: number };
  itemSummary: ItemSummary[];
  movements: Movement[];
}

export default function JobDetailPage() {
  const params = useParams();
  const code = decodeURIComponent(params.code as string);
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/materials/jobs/${encodeURIComponent(code)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Job not found");
        return r.json();
      })
      .then(setJob)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [code]);

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

  return (
    <div>
      <div className="mb-4">
        <Link href="/materials/jobs" className="text-sm text-blue-600 hover:text-blue-800">Back to Jobs</Link>
      </div>

      <PageHeader
        title={`${job.projectCode}${job.projectName ? ` — ${job.projectName}` : ""}`}
        description={job.clientName ? `Client: ${job.clientName}` : ""}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs font-medium text-gray-500 uppercase">Total Issued</div>
          <div className="text-2xl font-bold text-orange-600 mt-1">{job.summary.totalIssued}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs font-medium text-gray-500 uppercase">Total Returned</div>
          <div className="text-2xl font-bold text-green-600 mt-1">{job.summary.totalReturned}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs font-medium text-gray-500 uppercase">Net Out</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{job.summary.netIssued}</div>
        </div>
      </div>

      {/* Item breakdown */}
      <h3 className="text-sm font-semibold text-gray-900 mb-2">Materials Summary</h3>
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Item Code</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Description</th>
              <th className="text-right px-4 py-3 font-medium text-gray-700">Issued</th>
              <th className="text-right px-4 py-3 font-medium text-gray-700">Returned</th>
              <th className="text-right px-4 py-3 font-medium text-gray-700">Net Out</th>
            </tr>
          </thead>
          <tbody>
            {job.itemSummary.map((item) => (
              <tr key={item.code} className="border-b border-gray-100">
                <td className="px-4 py-3 font-mono text-xs">{item.code}</td>
                <td className="px-4 py-3 text-gray-700">{item.description}</td>
                <td className="px-4 py-3 text-right text-orange-600">{item.issued} {UOM_LABELS[item.unitOfMeasure] || ""}</td>
                <td className="px-4 py-3 text-right text-green-600">{item.returned} {UOM_LABELS[item.unitOfMeasure] || ""}</td>
                <td className="px-4 py-3 text-right font-bold">{item.net} {UOM_LABELS[item.unitOfMeasure] || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Movement history */}
      <h3 className="text-sm font-semibold text-gray-900 mb-2">Movement History</h3>
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
                <td className="px-4 py-3 text-gray-500">{m.fromLocation?.name || "—"}</td>
                <td className="px-4 py-3 text-gray-500">{m.toLocation?.name || "—"}</td>
                <td className="px-4 py-3 text-gray-500">{m.reference || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
