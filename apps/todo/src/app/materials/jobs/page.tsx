"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

interface Job {
  projectCode: string;
  projectName: string | null;
  clientName: string | null;
  totalIssued: number;
  totalReturned: number;
  netIssued: number;
  movementCount: number;
  lastActivity: string;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const res = await fetch(`/api/materials/jobs?${params}`);
    if (res.ok) setJobs(await res.json());
    setLoading(false);
  }, [search]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "2-digit" });
  }

  return (
    <div>
      <PageHeader title="Jobs" description="View all jobs and their material usage" />

      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by project code, name, or client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-80"
        />
        <span className="text-xs text-gray-400 ml-auto">{jobs.length} jobs</span>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : jobs.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-500 text-sm">No jobs found. Jobs appear here when materials are issued with a project code.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Project Code</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Project Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Client</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Issued</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Returned</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Net Out</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Movements</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.projectCode} className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer">
                  <td className="px-4 py-3">
                    <Link href={`/materials/jobs/${encodeURIComponent(job.projectCode)}`} className="font-mono text-blue-600 hover:text-blue-800 font-medium">
                      {job.projectCode}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{job.projectName || "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{job.clientName || "—"}</td>
                  <td className="px-4 py-3 text-right font-medium text-orange-600">{job.totalIssued}</td>
                  <td className="px-4 py-3 text-right font-medium text-green-600">{job.totalReturned}</td>
                  <td className="px-4 py-3 text-right font-bold">{job.netIssued}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{job.movementCount}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(job.lastActivity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
