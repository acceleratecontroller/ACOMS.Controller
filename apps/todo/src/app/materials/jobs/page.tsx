"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Modal } from "@/components/Modal";

interface Job {
  id: string;
  projectId: string;
  name: string;
  client: string;
  contact: string;
  createdAt: string;
  location: { id: string; name: string } | null;
  _count: { movements: number };
}

interface Location { id: string; name: string }

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ projectId: "", name: "", client: "", contact: "", locationId: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [archiving, setArchiving] = useState<string | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/materials/locations").then((r) => r.json()).then(setLocations);
  }, []);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (showArchived) params.set("archived", "true");
    const res = await fetch(`/api/materials/jobs?${params}`);
    if (res.ok) setJobs(await res.json());
    setLoading(false);
  }, [search, showArchived]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  function openCreate() {
    setForm({ projectId: "", name: "", client: "", contact: "", locationId: "" });
    setFormError(null);
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const res = await fetch("/api/materials/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setShowModal(false);
      fetchJobs();
    } else {
      const data = await res.json();
      setFormError(data.error || "Failed to create job");
    }
  }

  async function handleArchive(job: Job) {
    if (!confirm(`Archive job "${job.projectId} — ${job.name}"?\n\nAll materials must be removed from the job first.`)) return;
    setArchiving(job.id);
    setArchiveError(null);

    const res = await fetch(`/api/materials/jobs/${job.id}`, { method: "DELETE" });
    if (res.ok) {
      fetchJobs();
    } else {
      const data = await res.json();
      setArchiveError(data.error || "Failed to archive job");
    }
    setArchiving(null);
  }

  return (
    <div>
      <PageHeader title="Jobs" description="Manage jobs and track materials received against them" />

      <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-4">
        <input
          type="text"
          placeholder="Search jobs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full sm:w-80"
        />
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="rounded border-gray-300"
          />
          Show Archived
        </label>
        <div className="flex-1" />
        {!showArchived && (
          <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 w-full sm:w-auto">
            Create Job
          </button>
        )}
      </div>

      {archiveError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{archiveError}</div>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : jobs.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-500 text-sm">
            {showArchived ? "No archived jobs." : "No jobs found. Create a job to start tracking materials against it."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Project ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Job Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Client</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Location</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Contact</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Movements</th>
                {!showArchived && <th className="text-right px-4 py-3 font-medium text-gray-700">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-b border-gray-100 hover:bg-blue-50">
                  <td className="px-4 py-3">
                    <Link href={`/materials/jobs/${job.id}`} className="font-mono text-blue-600 hover:text-blue-800 font-medium">
                      {job.projectId}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{job.name}</td>
                  <td className="px-4 py-3 text-gray-500">{job.client}</td>
                  <td className="px-4 py-3 text-gray-500">{job.location?.name || "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{job.contact}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{job._count.movements}</td>
                  {!showArchived && (
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleArchive(job)}
                        disabled={archiving === job.id}
                        className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                      >
                        {archiving === job.id ? "Archiving..." : "Archive"}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Job">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project ID *</label>
              <input type="text" required value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g. PRJ-001" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location (Depot) *</label>
              <select required value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Select location...</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Name *</label>
            <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
              <input type="text" required value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact *</label>
              <input type="text" required value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          {formError && <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">{formError}</div>}
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Create</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
