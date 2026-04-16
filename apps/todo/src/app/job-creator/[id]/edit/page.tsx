"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { JobRequestForm, JobRequestFormData } from "../../JobRequestForm";

export default function EditJobRequestPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [initial, setInitial] = useState<Partial<JobRequestFormData> | null>(null);

  useEffect(() => {
    fetch(`/api/job-creator/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          setError("Job request not found");
          return;
        }
        const job = await res.json();
        if (job.status !== "DRAFT") {
          setError("Only draft job requests can be edited");
          return;
        }
        setInitial({
          depot: job.depot,
          client: job.client,
          contract: job.contract,
          jobType: job.jobType,
          financePONumber: job.financePONumber || "",
          clientReference: job.clientReference || "",
          projectName: job.projectName,
          address: job.address || "",
          jobReceivedDate: job.jobReceivedDate ? job.jobReceivedDate.slice(0, 10) : "",
          quoteReceivedDate: job.quoteReceivedDate ? job.quoteReceivedDate.slice(0, 10) : "",
          workOrderReceivedDate: job.workOrderReceivedDate ? job.workOrderReceivedDate.slice(0, 10) : "",
          quoteDueDate: job.quoteDueDate ? job.quoteDueDate.slice(0, 10) : "",
          workOrderDueDate: job.workOrderDueDate ? job.workOrderDueDate.slice(0, 10) : "",
          clientContactName: job.clientContactName || "",
          clientContactPhone: job.clientContactPhone || "",
          clientContactEmail: job.clientContactEmail || "",
          emailContent: job.emailContent || "",
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(data: JobRequestFormData) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/job-creator/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to update job request");
        return;
      }
      router.push(`/job-creator/${id}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>;
  }

  if (error && !initial) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Edit Job Request" description="Update this draft job request" />

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6">
        <JobRequestForm
          initial={initial || undefined}
          onSubmit={handleSubmit}
          onCancel={() => router.push(`/job-creator/${id}`)}
          saving={saving}
          submitLabel="Save Changes"
        />
      </div>
    </div>
  );
}
