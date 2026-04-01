"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Modal } from "@/components/Modal";
import { UOM_LABELS } from "@/modules/materials/constants";

interface Job {
  id: string;
  projectId: string;
  name: string;
  client: string;
  contact: string;
  createdAt: string;
  location: { id: string; name: string } | null;
  wipProjectId: string | null;
  stage: string | null;
  depotName: string | null;
  _count: { movements: number; materials: number };
}

interface WipProject {
  id: string;
  acomsNumber: number;
  acomsNumberFormatted: string;
  name: string;
  stage: string;
  clientName: string | null;
  depotName: string | null;
  contactName: string | null;
}

interface JobMaterialSummary {
  itemId: string;
  code: string;
  description: string;
  unitOfMeasure: string;
  fromStockQty: number;
  receivedQty: number;
  totalQty: number;
}

interface JobDetailForArchive {
  id: string;
  projectId: string;
  name: string;
  client: string;
  location: { name: string } | null;
  materials: {
    itemId: string;
    fromStockQty: number;
    receivedQty: number;
    item: { code: string; description: string; unitOfMeasure: string };
  }[];
  itemSummary: {
    itemId: string;
    code: string;
    description: string;
    unitOfMeasure: string;
    received: number;
    alreadyInRequirements: boolean;
  }[];
}

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [stockFilter, setStockFilter] = useState<"" | "true" | "false">("true");
  const [showModal, setShowModal] = useState(false);
  const [wipSearch, setWipSearch] = useState("");
  const [wipProjects, setWipProjects] = useState<WipProject[]>([]);
  const [wipLoading, setWipLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [archiving, setArchiving] = useState<string | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  // Archive disposition modal state
  const [archiveJob, setArchiveJob] = useState<Job | null>(null);
  const [archiveDetail, setArchiveDetail] = useState<JobDetailForArchive | null>(null);
  const [archiveMaterials, setArchiveMaterials] = useState<JobMaterialSummary[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [disposition, setDisposition] = useState<"RETURN_TO_STOCK" | "RETURN_TO_CLIENT">("RETURN_TO_STOCK");

  const fetchWipProjects = useCallback(async (searchTerm?: string) => {
    setWipLoading(true);
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    const res = await fetch(`/api/materials/wip-jobs?${params}`);
    if (res.ok) setWipProjects(await res.json());
    setWipLoading(false);
  }, []);

  useEffect(() => {
    // Sync WIP-linked jobs with latest data on page load
    fetch("/api/materials/jobs/sync", { method: "POST" }).catch(() => {});
  }, []);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (showArchived) params.set("archived", "true");
    if (stockFilter) params.set("hasStock", stockFilter);
    const res = await fetch(`/api/materials/jobs?${params}`);
    if (res.ok) setJobs(await res.json());
    setLoading(false);
  }, [search, showArchived, stockFilter]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  function openLinkModal() {
    setWipSearch("");
    setWipProjects([]);
    setFormError(null);
    setShowModal(true);
    fetchWipProjects();
  }

  async function handleLinkWipJob(wipProjectId: string) {
    setLinking(true);
    setFormError(null);

    const res = await fetch("/api/materials/wip-jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wipProjectId }),
    });

    if (res.ok) {
      setShowModal(false);
      fetchJobs();
    } else {
      const data = await res.json();
      setFormError(data.error || "Failed to link WIP job");
    }
    setLinking(false);
  }

  async function openArchiveModal(job: Job) {
    setArchiveJob(job);
    setArchiveError(null);
    setArchiveLoading(true);
    setDisposition("RETURN_TO_STOCK");

    // Fetch full job detail to get materials summary
    const res = await fetch(`/api/materials/jobs/${job.id}`);
    if (!res.ok) {
      setArchiveError("Failed to load job details");
      setArchiveLoading(false);
      return;
    }

    const detail: JobDetailForArchive = await res.json();
    setArchiveDetail(detail);

    // Build combined materials list
    const materialMap = new Map<string, JobMaterialSummary>();

    // Add materials from requirements
    for (const mat of detail.materials) {
      const fromStockQty = mat.fromStockQty || 0;
      const receivedQty = mat.receivedQty || 0;
      materialMap.set(mat.itemId, {
        itemId: mat.itemId,
        code: mat.item.code,
        description: mat.item.description,
        unitOfMeasure: mat.item.unitOfMeasure,
        fromStockQty,
        receivedQty,
        totalQty: fromStockQty + receivedQty,
      });
    }

    // Add received items not in requirements
    for (const item of detail.itemSummary) {
      if (!item.alreadyInRequirements && item.received > 0) {
        materialMap.set(item.itemId, {
          itemId: item.itemId,
          code: item.code,
          description: item.description,
          unitOfMeasure: item.unitOfMeasure,
          fromStockQty: 0,
          receivedQty: item.received,
          totalQty: item.received,
        });
      }
    }

    setArchiveMaterials(Array.from(materialMap.values()).filter((m) => m.totalQty > 0));
    setArchiveLoading(false);
  }

  function closeArchiveModal() {
    setArchiveJob(null);
    setArchiveDetail(null);
    setArchiveMaterials([]);
    setArchiveError(null);
  }

  async function handleArchive() {
    if (!archiveJob) return;
    setArchiving(archiveJob.id);
    setArchiveError(null);

    const res = await fetch(`/api/materials/jobs/${archiveJob.id}/archive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disposition }),
    });

    if (res.ok) {
      closeArchiveModal();
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
        <select
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value as "" | "true" | "false")}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All jobs</option>
          <option value="true">With stock</option>
          <option value="false">No stock</option>
        </select>
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
          <button onClick={openLinkModal} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 w-full sm:w-auto">
            Link WIP Job
          </button>
        )}
      </div>

      {archiveError && !archiveJob && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{archiveError}</div>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : jobs.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-500 text-sm">
            {showArchived ? "No archived jobs." : "No jobs found. Link a WIP job to start tracking materials against it."}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile card layout */}
          <div className="space-y-3 md:hidden">
            {jobs.map((job) => (
              <div key={job.id} onClick={() => router.push(`/materials/jobs/${job.id}`)} className="bg-white rounded-lg border border-gray-200 p-3 overflow-hidden cursor-pointer hover:bg-blue-50 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <span className="font-mono text-blue-600 font-medium text-sm break-all">
                      {job.projectId}
                    </span>
                    <div className="text-sm font-medium text-gray-900 mt-0.5 truncate">{job.name}</div>
                  </div>
                  <div className="text-right shrink-0">
                    {(job._count.materials > 0 || job._count.movements > 0) ? (
                      <span className="inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                        {job._count.movements} mov.
                      </span>
                    ) : (
                      <span className="inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-400">
                        No stock
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm mt-2">
                  <div className="min-w-0">
                    <span className="text-gray-400 text-xs">Client</span>
                    <div className="text-gray-700 truncate">{job.client}</div>
                  </div>
                  <div className="min-w-0">
                    <span className="text-gray-400 text-xs">Depot</span>
                    <div className="text-gray-700 truncate">{job.depotName || job.location?.name || "—"}</div>
                  </div>
                  {job.stage && (
                    <div className="min-w-0">
                      <span className="text-gray-400 text-xs">Stage</span>
                      <div className="text-gray-700 truncate capitalize">{job.stage.replace(/_/g, " ")}</div>
                    </div>
                  )}
                  {job.contact && (
                    <div className="min-w-0">
                      <span className="text-gray-400 text-xs">Contact</span>
                      <div className="text-gray-700 truncate">{job.contact}</div>
                    </div>
                  )}
                </div>
                {!showArchived && (
                  <div className="mt-3 pt-3 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openArchiveModal(job)}
                      disabled={archiving === job.id}
                      className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                    >
                      {archiving === job.id ? "Archiving..." : "Archive"}
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
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Project ID</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Job Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Client</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Depot</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Stage</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-700">Movements</th>
                  {!showArchived && <th className="text-right px-4 py-3 font-medium text-gray-700">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} onClick={() => router.push(`/materials/jobs/${job.id}`)} className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer">
                    <td className="px-4 py-3">
                      <span className="font-mono text-blue-600 font-medium">
                        {job.projectId}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{job.name}</td>
                    <td className="px-4 py-3 text-gray-500">{job.client}</td>
                    <td className="px-4 py-3 text-gray-500">{job.depotName || job.location?.name || "—"}</td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{job.stage ? job.stage.replace(/_/g, " ") : "—"}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{job._count.movements}</td>
                    {!showArchived && (
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openArchiveModal(job)}
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
        </>
      )}

      {/* Link WIP Job Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Link WIP Job" wide>
        <div className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Search WIP jobs by name, client, or ACOMS number..."
              value={wipSearch}
              onChange={(e) => {
                setWipSearch(e.target.value);
                fetchWipProjects(e.target.value);
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              autoFocus
            />
          </div>

          {formError && <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">{formError}</div>}

          {wipLoading ? (
            <p className="text-gray-500 text-sm py-4">Loading WIP jobs...</p>
          ) : wipProjects.length === 0 ? (
            <p className="text-gray-500 text-sm py-4">
              {wipSearch ? "No matching WIP jobs found." : "No available WIP jobs to link."}
            </p>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-700">ACOMS #</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-700">Job Name</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-700">Client</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-700">Depot</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-700">Stage</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-700"></th>
                  </tr>
                </thead>
                <tbody>
                  {wipProjects.map((wp) => (
                    <tr key={wp.id} className="border-b border-gray-100 hover:bg-blue-50">
                      <td className="px-3 py-2 font-mono text-blue-600 font-medium">{wp.acomsNumberFormatted}</td>
                      <td className="px-3 py-2 text-gray-700">{wp.name}</td>
                      <td className="px-3 py-2 text-gray-500">{wp.clientName || "—"}</td>
                      <td className="px-3 py-2 text-gray-500">{wp.depotName || "—"}</td>
                      <td className="px-3 py-2 text-gray-500 capitalize">{wp.stage.replace(/_/g, " ")}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => handleLinkWipJob(wp.id)}
                          disabled={linking}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
                        >
                          {linking ? "Linking..." : "Link"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Archive Disposition Modal */}
      <Modal isOpen={!!archiveJob} onClose={closeArchiveModal} title={`Archive Job — ${archiveJob?.projectId}`} wide>
        {archiveLoading ? (
          <p className="text-gray-500 text-sm py-4">Loading job details...</p>
        ) : archiveDetail && (
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium text-gray-900">{archiveDetail.name}</span>
              {" — "}{archiveDetail.client}
              {archiveDetail.location && <span> at <span className="font-medium">{archiveDetail.location.name}</span></span>}
            </div>

            {archiveMaterials.length > 0 ? (
              <>
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Materials on this job</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-gray-700">Item</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-700">From Stock</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-700">Received</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-700">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {archiveMaterials.map((mat) => (
                          <tr key={mat.itemId} className="border-b border-gray-100">
                            <td className="px-3 py-2">
                              <span className="font-mono text-xs text-gray-500">{mat.code}</span>{" "}
                              <span className="text-gray-700">{mat.description}</span>
                            </td>
                            <td className="px-3 py-2 text-right text-gray-500">
                              {mat.fromStockQty > 0 ? `${mat.fromStockQty} ${UOM_LABELS[mat.unitOfMeasure] || mat.unitOfMeasure}` : "—"}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-500">
                              {mat.receivedQty > 0 ? `${mat.receivedQty} ${UOM_LABELS[mat.unitOfMeasure] || mat.unitOfMeasure}` : "—"}
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-gray-900">
                              {mat.totalQty} {UOM_LABELS[mat.unitOfMeasure] || mat.unitOfMeasure}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">What should happen to these materials?</h3>
                  <div className="space-y-2">
                    <label
                      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer ${disposition === "RETURN_TO_STOCK" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}
                    >
                      <input
                        type="radio"
                        name="disposition"
                        value="RETURN_TO_STOCK"
                        checked={disposition === "RETURN_TO_STOCK"}
                        onChange={() => setDisposition("RETURN_TO_STOCK")}
                        className="mt-0.5"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">Add back to stock</div>
                        <div className="text-xs text-gray-500">Materials will be returned as unallocated stock at {archiveDetail.location?.name || "the current location"}</div>
                      </div>
                    </label>
                    <label
                      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer ${disposition === "RETURN_TO_CLIENT" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}
                    >
                      <input
                        type="radio"
                        name="disposition"
                        value="RETURN_TO_CLIENT"
                        checked={disposition === "RETURN_TO_CLIENT"}
                        onChange={() => setDisposition("RETURN_TO_CLIENT")}
                        className="mt-0.5"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">Return to client</div>
                        <div className="text-xs text-gray-500">Materials will be tracked in the Returns queue for return to the client</div>
                      </div>
                    </label>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500 py-2">No materials on this job. It will be archived directly.</p>
            )}

            {archiveError && (
              <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">{archiveError}</div>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={closeArchiveModal}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleArchive}
                disabled={archiving === archiveJob?.id}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {archiving === archiveJob?.id ? "Archiving..." : `Archive Job${archiveMaterials.length > 0 ? ` & ${disposition === "RETURN_TO_STOCK" ? "Return to Stock" : "Queue for Client Return"}` : ""}`}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
