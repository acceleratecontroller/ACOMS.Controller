"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Modal } from "@/components/Modal";
import {
  DEPOT_LABELS,
  JOB_TYPE_LABELS,
  JOB_TYPE_OPTIONS,
  JOB_REQUEST_STATUS_LABELS,
  STATUS_COLORS,
  JOB_TYPE_COLORS,
} from "@/modules/job-creator/constants";

interface IntegrationEntry {
  status: string;
  error?: string;
  details?: Record<string, unknown>;
}

interface JobRequest {
  id: string;
  acomsNumber: string;
  depot: string;
  client: string;
  contract: string;
  jobType: string;
  financePONumber: string | null;
  clientReference: string | null;
  projectName: string;
  address: string | null;
  jobReceivedDate: string;
  quoteReceivedDate: string | null;
  workOrderReceivedDate: string | null;
  quoteDueDate: string | null;
  workOrderDueDate: string | null;
  clientContactName: string | null;
  clientContactPhone: string | null;
  clientContactEmail: string | null;
  emailContent: string | null;
  status: string;
  rejectionReason: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  integrationLog: Record<string, IntegrationEntry> | null;
}

const INTEGRATION_NAMES: Record<string, string> = {
  googleSheets: "Google Sheets (Data)",
  quoteTab: "Google Sheets (Quote)",
  constructionTab: "Google Sheets (Construction)",
  serviceM8: "ServiceM8",
  simPro: "SimPRO",
};

export default function JobRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<JobRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Reject modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectError, setRejectError] = useState("");

  // Approve modal (allows changing job type)
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveJobType, setApproveJobType] = useState("");

  useEffect(() => {
    fetch(`/api/job-creator/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          setError("Job request not found");
          return;
        }
        const data = await res.json();
        setJob(data);
        setApproveJobType(data.jobType);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmitForReview() {
    setActionLoading(true);
    const res = await fetch(`/api/job-creator/${id}/submit`, { method: "POST" });
    if (res.ok) {
      setJob(await res.json());
    } else {
      const err = await res.json();
      setError(err.error || "Failed to submit");
    }
    setActionLoading(false);
  }

  async function handleApprove() {
    setActionLoading(true);
    setError("");
    const body: Record<string, string> = {};
    if (approveJobType !== job?.jobType) body.jobType = approveJobType;
    const res = await fetch(`/api/job-creator/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) {
      setJob(data);
      setShowApproveModal(false);
    } else {
      // If integrations partially failed, update job with the integration log
      if (data.integrationLog) {
        setJob((prev) => prev ? { ...prev, integrationLog: data.integrationLog } : prev);
      }
      setError(data.error || "Failed to approve");
      setShowApproveModal(false);
    }
    setActionLoading(false);
  }

  async function handleReject() {
    if (!rejectionReason.trim()) {
      setRejectError("Rejection reason is required");
      return;
    }
    setActionLoading(true);
    const res = await fetch(`/api/job-creator/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rejectionReason }),
    });
    if (res.ok) {
      setJob(await res.json());
      setShowRejectModal(false);
    } else {
      const err = await res.json();
      setRejectError(err.error || "Failed to reject");
    }
    setActionLoading(false);
  }

  if (loading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>;
  }

  if (!job) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
        {error || "Job request not found"}
      </div>
    );
  }

  const fieldCls = "text-sm text-gray-900 dark:text-gray-100";
  const labelFieldCls = "text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5";

  // Determine if there are integration failures to show
  const integrationLog = job.integrationLog;
  const hasIntegrationFailures = integrationLog && Object.values(integrationLog).some((v) => v.status === "failed");

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4 md:mb-6">
        <div>
          <Link href="/job-creator" className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2 inline-block">
            &larr; Back to Job Creator
          </Link>
          <PageHeader
            title={`${job.acomsNumber} — ${job.client}`}
            description={job.address ? `${job.projectName} — ${job.address}` : job.projectName}
          />
          <div className="flex gap-2 mt-2">
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[job.status] || ""}`}>
              {JOB_REQUEST_STATUS_LABELS[job.status]}
            </span>
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${JOB_TYPE_COLORS[job.jobType] || ""}`}>
              {JOB_TYPE_LABELS[job.jobType]}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 shrink-0">
          {job.status === "DRAFT" && (
            <>
              <Link
                href={`/job-creator/${job.id}/edit`}
                className="px-3 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Edit
              </Link>
              <button
                onClick={handleSubmitForReview}
                disabled={actionLoading}
                className="px-3 py-2 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors"
              >
                {actionLoading ? "Submitting..." : "Submit for Review"}
              </button>
            </>
          )}
          {job.status === "PENDING_REVIEW" && (
            <>
              <button
                onClick={() => setShowApproveModal(true)}
                disabled={actionLoading}
                className="px-3 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {hasIntegrationFailures ? "Retry Approval" : "Approve"}
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={actionLoading}
                className="px-3 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                Reject
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Integration status panel — shown when there are results (success or failure) */}
      {integrationLog && Object.keys(integrationLog).length > 0 && (
        <div className={`mb-4 p-4 rounded-lg border ${
          hasIntegrationFailures
            ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800"
            : "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800"
        }`}>
          <h3 className={`text-sm font-semibold mb-3 ${
            hasIntegrationFailures
              ? "text-red-800 dark:text-red-300"
              : "text-green-800 dark:text-green-300"
          }`}>
            {hasIntegrationFailures ? "Integration Status — Some Failed" : "Integration Status — All Succeeded"}
          </h3>
          <div className="space-y-2">
            {Object.entries(integrationLog).map(([key, entry]) => (
              <div key={key} className="flex items-start gap-2">
                {entry.status === "success" && (
                  <svg className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {entry.status === "failed" && (
                  <svg className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                {entry.status === "skipped" && (
                  <svg className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                  </svg>
                )}
                <div>
                  <p className={`text-sm font-medium ${
                    entry.status === "failed"
                      ? "text-red-700 dark:text-red-400"
                      : entry.status === "success"
                        ? "text-green-700 dark:text-green-400"
                        : "text-gray-500 dark:text-gray-400"
                  }`}>
                    {INTEGRATION_NAMES[key] || key}
                    {entry.status === "skipped" && <span className="font-normal"> — Skipped (Quotes only)</span>}
                  </p>
                  {entry.error && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{entry.error}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          {hasIntegrationFailures && job.status === "PENDING_REVIEW" && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-3 pt-2 border-t border-red-200 dark:border-red-700">
              Fix the issue and click &quot;Retry Approval&quot; to try again. Integrations that already succeeded may create duplicates — check and clean up if needed.
            </p>
          )}
        </div>
      )}

      {/* Rejection reason banner */}
      {job.status === "REJECTED" && job.rejectionReason && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-xs font-medium text-red-700 dark:text-red-400 uppercase tracking-wide mb-1">Rejection Reason</p>
          <p className="text-sm text-red-800 dark:text-red-300">{job.rejectionReason}</p>
        </div>
      )}

      {/* Job details */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div>
            <p className={labelFieldCls}>ACOMS Number</p>
            <p className={fieldCls}>{job.acomsNumber}</p>
          </div>
          <div>
            <p className={labelFieldCls}>Depot</p>
            <p className={fieldCls}>{DEPOT_LABELS[job.depot] || job.depot}</p>
          </div>
          <div>
            <p className={labelFieldCls}>Job Type</p>
            <p className={fieldCls}>{JOB_TYPE_LABELS[job.jobType] || job.jobType}</p>
          </div>
          <div>
            <p className={labelFieldCls}>Client</p>
            <p className={fieldCls}>{job.client}</p>
          </div>
          <div>
            <p className={labelFieldCls}>Contract</p>
            <p className={fieldCls}>{job.contract}</p>
          </div>
          <div>
            <p className={labelFieldCls}>Job Received Date</p>
            <p className={fieldCls}>{new Date(job.jobReceivedDate).toLocaleDateString()}</p>
          </div>
          {job.quoteReceivedDate && (
            <div>
              <p className={labelFieldCls}>Quote Received Date</p>
              <p className={fieldCls}>{new Date(job.quoteReceivedDate).toLocaleDateString()}</p>
            </div>
          )}
          {job.quoteDueDate && (
            <div>
              <p className={labelFieldCls}>Quote Submission Due Date</p>
              <p className={fieldCls}>{new Date(job.quoteDueDate).toLocaleDateString()}</p>
            </div>
          )}
          {job.workOrderReceivedDate && (
            <div>
              <p className={labelFieldCls}>Work Order Received Date</p>
              <p className={fieldCls}>{new Date(job.workOrderReceivedDate).toLocaleDateString()}</p>
            </div>
          )}
          {job.workOrderDueDate && (
            <div>
              <p className={labelFieldCls}>Work Order Due Date</p>
              <p className={fieldCls}>{new Date(job.workOrderDueDate).toLocaleDateString()}</p>
            </div>
          )}
          <div>
            <p className={labelFieldCls}>Project Name</p>
            <p className={fieldCls}>{job.projectName}</p>
          </div>
          {job.address && (
            <div className="sm:col-span-2">
              <p className={labelFieldCls}>Address</p>
              <p className={fieldCls}>{job.address}</p>
            </div>
          )}
          {job.financePONumber && (
            <div>
              <p className={labelFieldCls}>Finance / PO Number</p>
              <p className={fieldCls}>{job.financePONumber}</p>
            </div>
          )}
          {job.clientReference && (
            <div>
              <p className={labelFieldCls}>Client Reference</p>
              <p className={fieldCls}>{job.clientReference}</p>
            </div>
          )}
        </div>

        {/* Client contact */}
        {(job.clientContactName || job.clientContactPhone || job.clientContactEmail) && (
          <div className="mt-6 pt-5 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Client Contact</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {job.clientContactName && (
                <div>
                  <p className={labelFieldCls}>Name</p>
                  <p className={fieldCls}>{job.clientContactName}</p>
                </div>
              )}
              {job.clientContactPhone && (
                <div>
                  <p className={labelFieldCls}>Phone</p>
                  <p className={fieldCls}>{job.clientContactPhone}</p>
                </div>
              )}
              {job.clientContactEmail && (
                <div>
                  <p className={labelFieldCls}>Email</p>
                  <p className={fieldCls}>{job.clientContactEmail}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Email content */}
        {job.emailContent && (
          <div className="mt-6 pt-5 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Email Content</h3>
            <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 rounded-lg p-3 max-h-60 overflow-y-auto">
              {job.emailContent}
            </pre>
          </div>
        )}

        {/* Audit info */}
        <div className="mt-6 pt-5 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500 space-y-1">
          <p>Created: {new Date(job.createdAt).toLocaleString()}</p>
          <p>Last updated: {new Date(job.updatedAt).toLocaleString()}</p>
          {job.reviewedAt && <p>Reviewed: {new Date(job.reviewedAt).toLocaleString()}</p>}
        </div>
      </div>

      {/* Approve modal */}
      <Modal isOpen={showApproveModal} onClose={() => setShowApproveModal(false)} title={hasIntegrationFailures ? "Retry Approval" : "Approve Job Request"}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {hasIntegrationFailures
              ? <>Retry approval for <strong>{job.acomsNumber}</strong>? This will re-run all integrations.</>
              : <>Approve <strong>{job.acomsNumber}</strong> for <strong>{job.client}</strong>?</>
            }
          </p>
          {hasIntegrationFailures && (
            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded text-xs text-amber-700 dark:text-amber-400">
              Warning: Integrations that previously succeeded may create duplicates. Check Google Sheets and ServiceM8 after approval.
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Job Type (change if needed)
            </label>
            <div className="flex gap-3">
              {JOB_TYPE_OPTIONS.map((t) => (
                <label
                  key={t.value}
                  className={`flex-1 flex items-center justify-center px-3 py-2 rounded-lg border text-sm font-medium cursor-pointer transition-colors ${
                    approveJobType === t.value
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                      : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400"
                  }`}
                >
                  <input
                    type="radio"
                    name="approveJobType"
                    value={t.value}
                    checked={approveJobType === t.value}
                    onChange={(e) => setApproveJobType(e.target.value)}
                    className="sr-only"
                  />
                  {t.label}
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setShowApproveModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApprove}
              disabled={actionLoading}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {actionLoading ? "Processing..." : hasIntegrationFailures ? "Retry Approval" : "Approve"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reject modal */}
      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="Reject Job Request">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Reject <strong>{job.acomsNumber}</strong> for <strong>{job.client}</strong>? This will archive the request.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Reason for rejection *
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => {
                setRejectionReason(e.target.value);
                if (rejectError) setRejectError("");
              }}
              rows={3}
              placeholder="Explain why this job request is being rejected..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
            />
            {rejectError && <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{rejectError}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setShowRejectModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleReject}
              disabled={actionLoading}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {actionLoading ? "Rejecting..." : "Reject"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
