"use client";

import { useState } from "react";
import { DEPOT_OPTIONS, JOB_TYPE_OPTIONS, CLIENT_OPTIONS, CONTRACT_OPTIONS } from "@/modules/job-creator/constants";

export interface JobRequestFormData {
  depot: string;
  client: string;
  contract: string;
  jobType: string;
  financePONumber: string;
  clientReference: string;
  projectNameAddress: string;
  jobReceivedDate: string;
  clientContactName: string;
  clientContactPhone: string;
  clientContactEmail: string;
  emailContent: string;
}

interface JobRequestFormProps {
  initial?: Partial<JobRequestFormData>;
  onSubmit: (data: JobRequestFormData) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  submitLabel?: string;
}

const EMPTY: JobRequestFormData = {
  depot: "",
  client: "",
  contract: "",
  jobType: "QUOTE",
  financePONumber: "",
  clientReference: "",
  projectNameAddress: "",
  jobReceivedDate: "",
  clientContactName: "",
  clientContactPhone: "",
  clientContactEmail: "",
  emailContent: "",
};

export function JobRequestForm({ initial, onSubmit, onCancel, saving, submitLabel = "Save Draft" }: JobRequestFormProps) {
  const [form, setForm] = useState<JobRequestFormData>({ ...EMPTY, ...initial });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set(field: keyof JobRequestFormData, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: "" }));
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.depot) errs.depot = "Depot is required";
    if (!form.client.trim()) errs.client = "Client is required";
    if (!form.contract.trim()) errs.contract = "Contract is required";
    if (!form.jobType) errs.jobType = "Job type is required";
    if (!form.projectNameAddress.trim()) errs.projectNameAddress = "Project name/address is required";
    if (!form.jobReceivedDate) errs.jobReceivedDate = "Job received date is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(form);
  }

  const inputCls = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none";
  const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
  const errorCls = "text-xs text-red-600 dark:text-red-400 mt-0.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Core fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Depot *</label>
          <select value={form.depot} onChange={(e) => set("depot", e.target.value)} className={inputCls}>
            <option value="">Select depot...</option>
            {DEPOT_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
          {errors.depot && <p className={errorCls}>{errors.depot}</p>}
        </div>

        <div>
          <label className={labelCls}>Job Type *</label>
          <div className="flex gap-3 mt-1.5">
            {JOB_TYPE_OPTIONS.map((t) => (
              <label
                key={t.value}
                className={`flex-1 flex items-center justify-center px-3 py-2 rounded-lg border text-sm font-medium cursor-pointer transition-colors ${
                  form.jobType === t.value
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                    : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400"
                }`}
              >
                <input
                  type="radio"
                  name="jobType"
                  value={t.value}
                  checked={form.jobType === t.value}
                  onChange={(e) => set("jobType", e.target.value)}
                  className="sr-only"
                />
                {t.label}
              </label>
            ))}
          </div>
          {errors.jobType && <p className={errorCls}>{errors.jobType}</p>}
        </div>

        <div>
          <label className={labelCls}>Client *</label>
          <select value={form.client} onChange={(e) => set("client", e.target.value)} className={inputCls}>
            <option value="">Select client...</option>
            {CLIENT_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          {errors.client && <p className={errorCls}>{errors.client}</p>}
        </div>

        <div>
          <label className={labelCls}>Contract *</label>
          <select value={form.contract} onChange={(e) => set("contract", e.target.value)} className={inputCls}>
            <option value="">Select contract...</option>
            {CONTRACT_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          {errors.contract && <p className={errorCls}>{errors.contract}</p>}
        </div>

        <div className="md:col-span-2">
          <label className={labelCls}>Project Name / Address *</label>
          <input type="text" value={form.projectNameAddress} onChange={(e) => set("projectNameAddress", e.target.value)} placeholder="Project name or site address" className={inputCls} />
          {errors.projectNameAddress && <p className={errorCls}>{errors.projectNameAddress}</p>}
        </div>

        <div>
          <label className={labelCls}>Job Received Date *</label>
          <input type="date" value={form.jobReceivedDate} onChange={(e) => set("jobReceivedDate", e.target.value)} className={inputCls} />
          {errors.jobReceivedDate && <p className={errorCls}>{errors.jobReceivedDate}</p>}
        </div>

        <div>
          <label className={labelCls}>Finance / PO Number</label>
          <input type="text" value={form.financePONumber} onChange={(e) => set("financePONumber", e.target.value)} placeholder="PO or finance reference" className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>Client Reference Number</label>
          <input type="text" value={form.clientReference} onChange={(e) => set("clientReference", e.target.value)} placeholder="Client ref" className={inputCls} />
        </div>
      </div>

      {/* Client Contact */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Client Contact</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Name</label>
            <input type="text" value={form.clientContactName} onChange={(e) => set("clientContactName", e.target.value)} placeholder="Contact name" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input type="tel" value={form.clientContactPhone} onChange={(e) => set("clientContactPhone", e.target.value)} placeholder="Phone number" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" value={form.clientContactEmail} onChange={(e) => set("clientContactEmail", e.target.value)} placeholder="Email address" className={inputCls} />
          </div>
        </div>
      </div>

      {/* Email content (placeholder for future AI parsing) */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Email Content</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Paste the source email here for reference. In a future version this will auto-populate fields.
        </p>
        <textarea
          value={form.emailContent}
          onChange={(e) => set("emailContent", e.target.value)}
          rows={5}
          placeholder="Paste email content here..."
          className={inputCls}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
