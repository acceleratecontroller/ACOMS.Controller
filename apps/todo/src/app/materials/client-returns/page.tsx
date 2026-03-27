"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Modal } from "@/components/Modal";
import { CLIENT_RETURN_STATUS_LABELS, UOM_LABELS } from "@/modules/materials/constants";

interface ClientReturn {
  id: string;
  quantity: string;
  status: "TO_BE_RETURNED" | "RETURNED";
  notes: string | null;
  returnedAt: string | null;
  createdAt: string;
  item: { id: string; code: string; description: string; unitOfMeasure: string };
  job: { id: string; projectId: string; name: string; client: string } | null;
  location: { id: string; name: string };
}

type ConfirmAction = { id: string; action: "MARK_RETURNED" | "RETURN_TO_STOCK"; item: ClientReturn };

export default function ClientReturnsPage() {
  const [returns, setReturns] = useState<ClientReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("TO_BE_RETURNED");
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const fetchReturns = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/materials/client-returns?${params}`);
    if (res.ok) setReturns(await res.json());
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchReturns(); }, [fetchReturns]);

  async function executeAction() {
    if (!confirmAction) return;
    const { id, action } = confirmAction;

    setConfirmAction(null);
    setProcessing(id);
    setError(null);

    const res = await fetch(`/api/materials/client-returns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    if (res.ok) {
      fetchReturns();
    } else {
      const data = await res.json();
      const label = action === "MARK_RETURNED" ? "mark as returned" : "return to stock";
      setError(data.error || `Failed to ${label}`);
    }
    setProcessing(null);
  }

  const pendingCount = returns.filter((r) => r.status === "TO_BE_RETURNED").length;

  return (
    <div>
      <PageHeader
        title="Client Returns"
        description="Track materials to be returned to clients or added back to stock"
      />

      <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="TO_BE_RETURNED">To Be Returned</option>
          <option value="RETURNED">Returned</option>
          <option value="">All</option>
        </select>

        {statusFilter === "TO_BE_RETURNED" && pendingCount > 0 && (
          <span className="text-sm text-amber-600 font-medium">
            {pendingCount} item{pendingCount !== 1 ? "s" : ""} pending return
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : returns.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-500 text-sm">
            {statusFilter === "TO_BE_RETURNED"
              ? "No materials pending return."
              : statusFilter === "RETURNED"
                ? "No returned materials."
                : "No client returns found."}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile card layout */}
          <div className="space-y-3 md:hidden">
            {returns.map((ret) => (
              <div key={ret.id} className="bg-white rounded-lg border border-gray-200 p-3 overflow-hidden">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-xs text-gray-500 break-all">{ret.item.code}</div>
                    <div className="text-sm font-medium text-gray-900 truncate">{ret.item.description}</div>
                  </div>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                    ret.status === "TO_BE_RETURNED"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-green-100 text-green-800"
                  }`}>
                    {CLIENT_RETURN_STATUS_LABELS[ret.status]}
                  </span>
                </div>
                <div className="text-sm font-medium text-gray-700 mb-2">
                  {Number(ret.quantity)} {UOM_LABELS[ret.item.unitOfMeasure] || ret.item.unitOfMeasure}
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                  {ret.job && (
                    <div className="min-w-0">
                      <span className="text-gray-400 text-xs">Job</span>
                      <div className="font-mono text-xs text-gray-700 truncate">{ret.job.projectId}</div>
                    </div>
                  )}
                  {ret.job?.client && (
                    <div className="min-w-0">
                      <span className="text-gray-400 text-xs">Client</span>
                      <div className="text-gray-700 truncate">{ret.job.client}</div>
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="text-gray-400 text-xs">Location</span>
                    <div className="text-gray-700 truncate">{ret.location.name}</div>
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs">Date</span>
                    <div className="text-gray-700 text-xs">
                      {ret.status === "RETURNED" && ret.returnedAt
                        ? new Date(ret.returnedAt).toLocaleDateString()
                        : new Date(ret.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                {statusFilter !== "RETURNED" && ret.status === "TO_BE_RETURNED" && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex gap-3">
                    <button
                      onClick={() => setConfirmAction({ id: ret.id, action: "MARK_RETURNED", item: ret })}
                      disabled={processing === ret.id}
                      className="flex-1 bg-green-50 text-green-700 border border-green-200 rounded-lg py-2 text-sm font-medium hover:bg-green-100 disabled:opacity-50"
                    >
                      {processing === ret.id ? "..." : "Mark Returned"}
                    </button>
                    <button
                      onClick={() => setConfirmAction({ id: ret.id, action: "RETURN_TO_STOCK", item: ret })}
                      disabled={processing === ret.id}
                      className="flex-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg py-2 text-sm font-medium hover:bg-blue-100 disabled:opacity-50"
                    >
                      {processing === ret.id ? "..." : "Back to Stock"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop table layout */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Item</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-700">Qty</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Job</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Client</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Location</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Date</th>
                  {statusFilter !== "RETURNED" && (
                    <th className="text-right px-4 py-3 font-medium text-gray-700">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {returns.map((ret) => (
                  <tr key={ret.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-gray-500">{ret.item.code}</span>{" "}
                      <span className="text-gray-700">{ret.item.description}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {Number(ret.quantity)} {UOM_LABELS[ret.item.unitOfMeasure] || ret.item.unitOfMeasure}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {ret.job ? (
                        <span className="font-mono text-xs">{ret.job.projectId}</span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {ret.job?.client || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{ret.location.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        ret.status === "TO_BE_RETURNED"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-green-100 text-green-800"
                      }`}>
                        {CLIENT_RETURN_STATUS_LABELS[ret.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {ret.status === "RETURNED" && ret.returnedAt
                        ? new Date(ret.returnedAt).toLocaleDateString()
                        : new Date(ret.createdAt).toLocaleDateString()}
                    </td>
                    {statusFilter !== "RETURNED" && (
                      <td className="px-4 py-3 text-right">
                        {ret.status === "TO_BE_RETURNED" && (
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => setConfirmAction({ id: ret.id, action: "MARK_RETURNED", item: ret })}
                              disabled={processing === ret.id}
                              className="text-green-600 hover:text-green-800 text-xs font-medium disabled:opacity-50"
                            >
                              {processing === ret.id ? "..." : "Mark Returned"}
                            </button>
                            <button
                              onClick={() => setConfirmAction({ id: ret.id, action: "RETURN_TO_STOCK", item: ret })}
                              disabled={processing === ret.id}
                              className="text-blue-600 hover:text-blue-800 text-xs font-medium disabled:opacity-50"
                            >
                              {processing === ret.id ? "..." : "Back to Stock"}
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Confirm Action Modal */}
      <Modal isOpen={!!confirmAction} onClose={() => setConfirmAction(null)} title={confirmAction?.action === "MARK_RETURNED" ? "Confirm Return to Client" : "Confirm Return to Stock"}>
        {confirmAction && (
          <div className="space-y-4">
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <div className="text-sm">
                <span className="font-mono text-xs text-gray-500">{confirmAction.item.item.code}</span>{" "}
                <span className="font-medium text-gray-900">{confirmAction.item.item.description}</span>
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {Number(confirmAction.item.quantity)} {UOM_LABELS[confirmAction.item.item.unitOfMeasure] || confirmAction.item.item.unitOfMeasure}
                {confirmAction.item.job && <span> from job <span className="font-mono">{confirmAction.item.job.projectId}</span></span>}
                {confirmAction.item.job?.client && <span> ({confirmAction.item.job.client})</span>}
              </div>
            </div>

            <p className="text-sm text-gray-600">
              {confirmAction.action === "MARK_RETURNED"
                ? "This will mark the material as returned to the client and remove it from stock. This cannot be undone."
                : "This will add the material back into unallocated stock at the current location and remove it from the returns queue."}
            </p>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeAction}
                className={`text-white px-4 py-2 rounded-lg text-sm font-medium ${
                  confirmAction.action === "MARK_RETURNED"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {confirmAction.action === "MARK_RETURNED" ? "Mark as Returned" : "Return to Stock"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
