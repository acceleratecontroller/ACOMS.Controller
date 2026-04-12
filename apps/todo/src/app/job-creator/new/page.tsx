"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { JobRequestForm, JobRequestFormData } from "../JobRequestForm";

export default function NewJobRequestPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(data: JobRequestFormData) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/job-creator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to create job request");
        return;
      }
      const job = await res.json();
      router.push(`/job-creator/${job.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="New Job Request" description="Create a new quote or direct work order" />

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6">
        <JobRequestForm
          onSubmit={handleSubmit}
          onCancel={() => router.push("/job-creator")}
          saving={saving}
          submitLabel="Create Draft"
        />
      </div>
    </div>
  );
}
