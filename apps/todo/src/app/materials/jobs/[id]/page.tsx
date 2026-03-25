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
  itemSummary: ItemSummary[];
  movements: Movement[];
}

export default function JobDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/materials/jobs/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Job not found");
        return r.json();
      })
      .then(setJob)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

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
        title={`${job.projectId} — ${job.name}`}
        description={`Client: ${job.client} | Contact: ${job.contact}`}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs font-medium text-gray-500 uppercase">Total Received</div>
          <div className="text-2xl font-bold text-green-600 mt-1">{job.summary.totalReceived}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs font-medium text-gray-500 uppercase">Movements</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{job.summary.movementCount}</div>
        </div>
      </div>

      {/* Item breakdown */}
      {job.itemSummary.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Materials Summary</h3>
          <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto mb-6">
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
        </>
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
    </div>
  );
}
