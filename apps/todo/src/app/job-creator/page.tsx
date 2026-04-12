"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import {
  JOB_REQUEST_STATUS_OPTIONS,
  DEPOT_OPTIONS,
  DEPOT_LABELS,
  JOB_TYPE_LABELS,
  JOB_REQUEST_STATUS_LABELS,
  STATUS_COLORS,
  JOB_TYPE_COLORS,
} from "@/modules/job-creator/constants";

interface JobRequest {
  id: string;
  acomsNumber: string;
  depot: string;
  client: string;
  contract: string;
  jobType: string;
  financePONumber: string | null;
  clientReference: string | null;
  projectNameAddress: string;
  jobReceivedDate: string;
  status: string;
  createdAt: string;
}

export default function JobCreatorPage() {
  const [jobs, setJobs] = useState<JobRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [depotFilter, setDepotFilter] = useState("");
  const [search, setSearch] = useState("");

  const loadJobs = useCallback(async () => {
    const sp = new URLSearchParams();
    if (statusFilter) sp.set("status", statusFilter);
    if (depotFilter) sp.set("depot", depotFilter);
    if (search) sp.set("search", search);
    const res = await fetch(`/api/job-creator?${sp}`);
    if (res.ok) setJobs(await res.json());
    setLoading(false);
  }, [statusFilter, depotFilter, search]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const counts = {
    DRAFT: jobs.filter((j) => j.status === "DRAFT").length,
    PENDING_REVIEW: jobs.filter((j) => j.status === "PENDING_REVIEW").length,
    APPROVED: jobs.filter((j) => j.status === "APPROVED").length,
    REJECTED: jobs.filter((j) => j.status === "REJECTED").length,
  };

  // When we have a status filter, show all jobs; otherwise show only active (non-rejected)
  const filtered = statusFilter
    ? jobs
    : jobs.filter((j) => j.status !== "REJECTED");

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
        <PageHeader
          title="Job Creator"
          description="Create and manage job requests — quotes and direct work orders"
        />
        <Link
          href="/job-creator/new"
          className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shrink-0"
        >
          + New Job
        </Link>
      </div>

      {/* Status summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {(["DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(statusFilter === s ? "" : s)}
            className={`rounded-lg border p-3 text-left transition-colors ${
              statusFilter === s
                ? "border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
            }`}
          >
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {statusFilter ? jobs.length : counts[s]}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {JOB_REQUEST_STATUS_LABELS[s]}
            </div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          placeholder="Search client, project, ACOMS #..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400"
        />
        <select
          value={depotFilter}
          onChange={(e) => setDepotFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          <option value="">All Depots</option>
          {DEPOT_OPTIONS.map((d) => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          <option value="">All Statuses</option>
          {JOB_REQUEST_STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Jobs table */}
      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p className="text-sm">No job requests found.</p>
          <Link href="/job-creator/new" className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-block">
            Create your first job request
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                <th className="py-2 pr-3 font-medium text-gray-500 dark:text-gray-400">ACOMS #</th>
                <th className="py-2 pr-3 font-medium text-gray-500 dark:text-gray-400">Client</th>
                <th className="py-2 pr-3 font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">Project</th>
                <th className="py-2 pr-3 font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">Depot</th>
                <th className="py-2 pr-3 font-medium text-gray-500 dark:text-gray-400">Type</th>
                <th className="py-2 pr-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="py-2 pr-3 font-medium text-gray-500 dark:text-gray-400 hidden lg:table-cell">Received</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((job) => (
                <tr
                  key={job.id}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td className="py-2.5 pr-3">
                    <Link href={`/job-creator/${job.id}`} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                      {job.acomsNumber}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-3 text-gray-900 dark:text-gray-100">{job.client}</td>
                  <td className="py-2.5 pr-3 text-gray-600 dark:text-gray-400 hidden md:table-cell max-w-[200px] truncate">
                    {job.projectNameAddress}
                  </td>
                  <td className="py-2.5 pr-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                    {DEPOT_LABELS[job.depot] || job.depot}
                  </td>
                  <td className="py-2.5 pr-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${JOB_TYPE_COLORS[job.jobType] || ""}`}>
                      {JOB_TYPE_LABELS[job.jobType] || job.jobType}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[job.status] || ""}`}>
                      {JOB_REQUEST_STATUS_LABELS[job.status] || job.status}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-gray-500 dark:text-gray-400 hidden lg:table-cell">
                    {new Date(job.jobReceivedDate).toLocaleDateString()}
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
