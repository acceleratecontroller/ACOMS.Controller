"use client";

import { useState, useEffect, useCallback } from "react";
import { DEPOT_OPTIONS, JOB_TYPE_OPTIONS } from "@/modules/job-creator/constants";
import { SearchableSelect } from "@/components/SearchableSelect";
import { Modal } from "@/components/Modal";

interface WipContract {
  id: string;
  name: string;
  contractNumber: string | null;
}

interface WipClient {
  id: string;
  name: string;
  simproCustomerId: number | null;
  contracts: WipContract[];
}

export interface JobRequestFormData {
  depot: string;
  client: string;
  contract: string;
  jobType: string;
  dueDate: string;
  financePONumber: string;
  clientReference: string;
  projectName: string;
  address: string;
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
  dueDate: "",
  financePONumber: "",
  clientReference: "",
  projectName: "",
  address: "",
  jobReceivedDate: "",
  clientContactName: "",
  clientContactPhone: "",
  clientContactEmail: "",
  emailContent: "",
};

export function JobRequestForm({ initial, onSubmit, onCancel, saving, submitLabel = "Save Draft" }: JobRequestFormProps) {
  const [form, setForm] = useState<JobRequestFormData>({ ...EMPTY, ...initial });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Live client/contract data from WIP
  const [wipClients, setWipClients] = useState<WipClient[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);

  // New Client modal
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientAbn, setNewClientAbn] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientAddress, setNewClientAddress] = useState("");
  const [newClientSyncSimPro, setNewClientSyncSimPro] = useState(true);
  const [newClientSaving, setNewClientSaving] = useState(false);
  const [newClientError, setNewClientError] = useState("");

  // Fetch clients from WIP on mount
  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/job-creator/clients");
      if (res.ok) {
        const data: WipClient[] = await res.json();
        setWipClients(data);
      }
    } catch {
      // Silently fail — form still works with typed-in values
    } finally {
      setClientsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Build client options from WIP data
  const clientOptions = wipClients.map((c) => ({ value: c.name, label: c.name }));

  // Build contract options filtered to selected client
  const selectedClient = wipClients.find((c) => c.name === form.client);
  const contractOptions = selectedClient
    ? selectedClient.contracts.map((c) => ({ value: c.name, label: c.name }))
    : // If no matching WIP client, show all unique contracts across all clients
      Array.from(
        new Map(
          wipClients.flatMap((c) => c.contracts).map((c) => [c.name, { value: c.name, label: c.name }]),
        ).values(),
      );

  function set(field: keyof JobRequestFormData, value: string) {
    setForm((f) => {
      const next = { ...f, [field]: value };
      // Clear contract when client changes (the old contract may not belong to the new client)
      if (field === "client" && value !== f.client) {
        next.contract = "";
      }
      return next;
    });
    if (errors[field]) setErrors((e) => ({ ...e, [field]: "" }));
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.depot) errs.depot = "Depot is required";
    if (!form.client.trim()) errs.client = "Client is required";
    if (!form.contract.trim()) errs.contract = "Contract is required";
    if (!form.jobType) errs.jobType = "Job type is required";
    if (!form.projectName.trim()) errs.projectName = "Project name is required";
    if (!form.jobReceivedDate) errs.jobReceivedDate = "Job received date is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(form);
  }

  function resetNewClientModal() {
    setShowNewClient(false);
    setNewClientName("");
    setNewClientAbn("");
    setNewClientPhone("");
    setNewClientEmail("");
    setNewClientAddress("");
    setNewClientSyncSimPro(true);
    setNewClientError("");
  }

  async function handleCreateClient() {
    const name = newClientName.trim();
    if (!name) {
      setNewClientError("Client name is required");
      return;
    }
    setNewClientSaving(true);
    setNewClientError("");
    try {
      const res = await fetch("/api/job-creator/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          abn: newClientAbn.trim() || undefined,
          contactPhone: newClientPhone.trim() || undefined,
          contactEmail: newClientEmail.trim() || undefined,
          address: newClientAddress.trim() || undefined,
          skipSimPro: !newClientSyncSimPro,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setNewClientError(err.error || "Failed to create client");
        return;
      }
      const client: WipClient = await res.json();
      setWipClients((prev) => [...prev, client].sort((a, b) => a.name.localeCompare(b.name)));
      set("client", client.name);
      resetNewClientModal();
    } catch {
      setNewClientError("Network error — please try again");
    } finally {
      setNewClientSaving(false);
    }
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
          <div className="flex gap-2">
            <div className="flex-1">
              <SearchableSelect
                value={form.client}
                onChange={(v) => set("client", v)}
                options={clientOptions}
                placeholder={clientsLoading ? "Loading clients..." : "Type to search clients..."}
                className={inputCls}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowNewClient(true)}
              className="shrink-0 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              title="Add new client"
            >
              + New
            </button>
          </div>
          {errors.client && <p className={errorCls}>{errors.client}</p>}
        </div>

        <div>
          <label className={labelCls}>Contract *</label>
          <SearchableSelect
            value={form.contract}
            onChange={(v) => set("contract", v)}
            options={contractOptions}
            placeholder={
              form.client && selectedClient && contractOptions.length === 0
                ? "No contracts for this client"
                : "Type to search contracts..."
            }
            className={inputCls}
          />
          {errors.contract && <p className={errorCls}>{errors.contract}</p>}
        </div>

        <div>
          <label className={labelCls}>Project Name *</label>
          <input type="text" value={form.projectName} onChange={(e) => set("projectName", e.target.value)} placeholder="Project or job name" className={inputCls} />
          {errors.projectName && <p className={errorCls}>{errors.projectName}</p>}
        </div>

        <div>
          <label className={labelCls}>Address</label>
          <input type="text" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Site address (e.g. 42 Victoria St, Grafton NSW 2460)" className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>Job Received Date *</label>
          <input type="date" value={form.jobReceivedDate} onChange={(e) => set("jobReceivedDate", e.target.value)} className={inputCls} />
          {errors.jobReceivedDate && <p className={errorCls}>{errors.jobReceivedDate}</p>}
        </div>

        <div>
          <label className={labelCls}>
            {form.jobType === "DIRECT_WORK_ORDER" ? "Work Order Due Date" : "Quote Submission Due Date"}
          </label>
          <input type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} className={inputCls} />
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

      {/* New Client Modal */}
      <Modal isOpen={showNewClient} onClose={resetNewClientModal} title="New Client" wide>
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Create a new client in ACOMS.WIP. This will be available across all ACOMS portals.
          </p>

          {newClientError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
              {newClientError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Client Name *</label>
              <input
                type="text"
                value={newClientName}
                onChange={(e) => {
                  setNewClientName(e.target.value);
                  if (newClientError) setNewClientError("");
                }}
                placeholder="Company name"
                className={inputCls}
                autoFocus
              />
            </div>
            <div>
              <label className={labelCls}>ABN</label>
              <input
                type="text"
                value={newClientAbn}
                onChange={(e) => setNewClientAbn(e.target.value)}
                placeholder="Australian Business Number"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input
                type="tel"
                value={newClientPhone}
                onChange={(e) => setNewClientPhone(e.target.value)}
                placeholder="Phone number"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input
                type="email"
                value={newClientEmail}
                onChange={(e) => setNewClientEmail(e.target.value)}
                placeholder="Email address"
                className={inputCls}
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Address</label>
              <input
                type="text"
                value={newClientAddress}
                onChange={(e) => setNewClientAddress(e.target.value)}
                placeholder="Business address"
                className={inputCls}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={newClientSyncSimPro}
              onChange={(e) => setNewClientSyncSimPro(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Also create in SimPRO
            </span>
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={resetNewClientModal}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateClient}
              disabled={newClientSaving}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {newClientSaving ? "Creating..." : "Create Client"}
            </button>
          </div>
        </div>
      </Modal>
    </form>
  );
}
