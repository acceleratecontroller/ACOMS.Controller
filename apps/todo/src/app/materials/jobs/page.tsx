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
  _count: { movements: number };
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ projectId: "", name: "", client: "", contact: "" });
  const [formError, setFormError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const res = await fetch(`/api/materials/jobs?${params}`);
    if (res.ok) setJobs(await res.json());
    setLoading(false);
  }, [search]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  function openCreate() {
    setForm({ projectId: "", name: "", client: "", contact: "" });
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

  return (
    <div>
      <PageHeader title="Jobs" description="Manage jobs and track materials received against them" />

      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by project ID, name, or client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-80"
        />
        <div className="flex-1" />
        <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          Create Job
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : jobs.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-500 text-sm">No jobs found. Create a job to start tracking materials against it.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Project ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Job Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Client</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Contact</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Movements</th>
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
                  <td className="px-4 py-3 text-gray-500">{job.contact}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{job._count.movements}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Job">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project ID *</label>
            <input type="text" required value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g. PRJ-001" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Name *</label>
            <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
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
