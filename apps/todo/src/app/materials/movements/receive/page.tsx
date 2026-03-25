"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { UOM_LABELS } from "@/modules/materials/constants";

interface Supplier { id: string; name: string; isFreeIssue: boolean; clientName: string | null }
interface Item { id: string; code: string; description: string; unitOfMeasure: string; supplierId: string | null }
interface Location { id: string; name: string }
interface Job { id: string; projectId: string; name: string }

interface ReceiveLine {
  key: string;
  itemId: string;
  quantity: string;
}

function makeLine(): ReceiveLine {
  return { key: crypto.randomUUID(), itemId: "", quantity: "" };
}

// ─── Autocomplete item picker ────────────────────────────
function ItemAutocomplete({
  items,
  value,
  onChange,
  onConfirm,
  autoFocus,
  disabled,
}: {
  items: Item[];
  value: string;
  onChange: (itemId: string) => void;
  onConfirm: () => void;
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedItem = items.find((i) => i.id === value);

  const filtered = query.length > 0
    ? items.filter((i) =>
        i.code.toLowerCase().includes(query.toLowerCase()) ||
        i.description.toLowerCase().includes(query.toLowerCase()),
      ).slice(0, 30)
    : [];

  useEffect(() => {
    setHighlightIdx(0);
  }, [query]);

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.children[highlightIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [highlightIdx]);

  useEffect(() => {
    if (autoFocus && !disabled) inputRef.current?.focus();
  }, [autoFocus, disabled]);

  // Reset when items list changes (supplier changed)
  useEffect(() => {
    setQuery("");
    setOpen(false);
  }, [items]);

  function selectItem(item: Item) {
    onChange(item.id);
    setQuery("");
    setOpen(false);
    onConfirm();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open && e.key !== "Escape") {
      setOpen(true);
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered.length > 0 && open) {
        selectItem(filtered[highlightIdx]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        disabled={disabled}
        value={open ? query : (selectedItem ? `${selectedItem.code} — ${selectedItem.description}` : query)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (value) onChange("");
        }}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        onBlur={() => {
          setTimeout(() => setOpen(false), 150);
        }}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? "Select a supplier first..." : "Type item code..."}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-400"
      />
      {open && filtered.length > 0 && (
        <div
          ref={listRef}
          className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {filtered.map((item, idx) => (
            <div
              key={item.id}
              onMouseDown={(e) => { e.preventDefault(); selectItem(item); }}
              className={`px-3 py-2 text-sm cursor-pointer ${
                idx === highlightIdx ? "bg-blue-50 text-blue-800" : "hover:bg-gray-50"
              }`}
            >
              <span className="font-mono font-medium">{item.code}</span>
              <span className="text-gray-500 ml-2">— {item.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────
export default function ReceivePage() {
  const router = useRouter();
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{ success: number; failed: number } | null>(null);

  const [header, setHeader] = useState({
    supplierId: "",
    toLocationId: "",
    jobId: "",
    reference: "",
    notes: "",
  });

  const [lines, setLines] = useState<ReceiveLine[]>([makeLine()]);
  const [focusLineKey, setFocusLineKey] = useState<string | null>(null);
  const [focusField, setFocusField] = useState<"item" | "quantity">("item");
  const qtyRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    fetch("/api/materials/items").then((r) => r.json()).then(setAllItems);
    fetch("/api/materials/suppliers").then((r) => r.json()).then(setSuppliers);
    fetch("/api/materials/locations").then((r) => r.json()).then(setLocations);
    fetch("/api/materials/jobs").then((r) => r.json()).then(setJobs);
  }, []);

  // Filter items by selected supplier
  const supplierItems = header.supplierId
    ? allItems.filter((i) => i.supplierId === header.supplierId)
    : [];

  const selectedSupplier = suppliers.find((s) => s.id === header.supplierId);

  // Derive movement fields from supplier
  const isFreeIssue = selectedSupplier?.isFreeIssue ?? false;
  const movementType = isFreeIssue ? "RECEIVED_FREE_ISSUE" : "RECEIVED";
  const ownershipType = isFreeIssue ? "CLIENT_FREE_ISSUE" : "COMPANY";

  // Clear lines when supplier changes
  function handleSupplierChange(newSupplierId: string) {
    setHeader((prev) => ({ ...prev, supplierId: newSupplierId }));
    setLines([makeLine()]);
    setError(null);
  }

  const updateLine = useCallback((key: string, field: keyof ReceiveLine, value: string) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, [field]: value } : l)));
  }, []);

  function removeLine(key: string) {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  function handleItemConfirm(lineKey: string) {
    setTimeout(() => {
      qtyRefs.current[lineKey]?.focus();
    }, 0);
  }

  function handleQtyKeyDown(e: React.KeyboardEvent, lineKey: string) {
    if (e.key === "Enter") {
      e.preventDefault();
      const currentLine = lines.find((l) => l.key === lineKey);
      if (!currentLine?.quantity) return;

      const newLine = makeLine();
      setLines((prev) => [...prev, newLine]);
      setFocusLineKey(newLine.key);
      setFocusField("item");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResults(null);

    if (!header.supplierId) {
      setError("Please select a supplier.");
      setSubmitting(false);
      return;
    }

    if (!header.toLocationId) {
      setError("Please select a location to receive into.");
      setSubmitting(false);
      return;
    }

    const validLines = lines.filter((l) => l.itemId && l.quantity);
    if (validLines.length === 0) {
      setError("Add at least one complete line item (item and quantity).");
      setSubmitting(false);
      return;
    }

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const line of validLines) {
      const res = await fetch("/api/materials/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: line.itemId,
          quantity: Number(line.quantity),
          movementType,
          ownershipType,
          toLocationId: header.toLocationId,
          sourceType: "SUPPLIER",
          sourceName: selectedSupplier?.name || null,
          clientName: isFreeIssue ? (selectedSupplier?.clientName || null) : null,
          jobId: header.jobId || null,
          reference: header.reference || null,
          notes: header.notes || null,
        }),
      });

      if (res.ok) {
        success++;
      } else {
        failed++;
        const item = allItems.find((i) => i.id === line.itemId);
        const data = await res.json().catch(() => ({ error: "Unknown error" }));
        errors.push(`${item?.code || "Unknown"}: ${data.error || "Failed"}`);
      }
    }

    if (failed === 0) {
      setResults({ success, failed });
      setTimeout(() => router.push("/materials/movements"), 1500);
    } else {
      setResults({ success, failed });
      setError(`${failed} item(s) failed: ${errors.join("; ")}`);
    }
    setSubmitting(false);
  }

  return (
    <div>
      <PageHeader title="Receive Stock" description="Record incoming materials — select a supplier and add items" />

      {results && results.failed === 0 ? (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          {results.success} item(s) received successfully. Redirecting...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-4xl">
          {/* Receipt header */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Receipt Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
                <select value={header.supplierId} onChange={(e) => handleSupplierChange(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">Select supplier...</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {selectedSupplier && (
                  <div className="mt-2">
                    {selectedSupplier.isFreeIssue ? (
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                        Free Issue — {selectedSupplier.clientName}
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                        Company Supplier
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Receive Into Location *</label>
                <select value={header.toLocationId} onChange={(e) => setHeader({ ...header, toLocationId: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">Select location...</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job</label>
                <select value={header.jobId} onChange={(e) => setHeader({ ...header, jobId: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">No job</option>
                  {jobs.map((j) => <option key={j.id} value={j.id}>{j.projectId} — {j.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference (PO, Docket, etc.)</label>
                <input type="text" value={header.reference} onChange={(e) => setHeader({ ...header, reference: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <input type="text" value={header.notes} onChange={(e) => setHeader({ ...header, notes: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">
                Items to Receive
                {header.supplierId && <span className="font-normal text-gray-500 ml-2">({supplierItems.length} items available)</span>}
              </h3>
              {header.supplierId && (
                <span className="text-xs text-gray-400">Press Enter after quantity to add a new line</span>
              )}
            </div>

            {!header.supplierId ? (
              <p className="text-sm text-gray-400 py-4 text-center">Select a supplier above to start adding items.</p>
            ) : supplierItems.length === 0 ? (
              <p className="text-sm text-amber-600 py-4 text-center">No items are linked to this supplier. Add items to this supplier first.</p>
            ) : (
              <>
                <div className="space-y-3">
                  <div className="grid grid-cols-[1fr_120px_40px] gap-3 text-xs font-medium text-gray-500 px-1">
                    <span>Item</span>
                    <span>Quantity</span>
                    <span></span>
                  </div>
                  {lines.map((line, lineIdx) => {
                    const selectedItem = supplierItems.find((i) => i.id === line.itemId);
                    const shouldAutoFocusItem = focusLineKey === line.key && focusField === "item";
                    return (
                      <div key={line.key} className="grid grid-cols-[1fr_120px_40px] gap-3 items-center">
                        <ItemAutocomplete
                          items={supplierItems}
                          value={line.itemId}
                          onChange={(id) => updateLine(line.key, "itemId", id)}
                          onConfirm={() => handleItemConfirm(line.key)}
                          autoFocus={shouldAutoFocusItem || lineIdx === 0}
                        />
                        <div className="relative">
                          <input
                            ref={(el) => { qtyRefs.current[line.key] = el; }}
                            type="number"
                            min="0.01"
                            step="any"
                            value={line.quantity}
                            onChange={(e) => updateLine(line.key, "quantity", e.target.value)}
                            onKeyDown={(e) => handleQtyKeyDown(e, line.key)}
                            placeholder="Qty"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          />
                          {selectedItem && (
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                              {UOM_LABELS[selectedItem.unitOfMeasure] || ""}
                            </span>
                          )}
                        </div>
                        <button type="button" onClick={() => removeLine(line.key)} disabled={lines.length <= 1} className="text-gray-400 hover:text-red-500 disabled:opacity-30 text-lg">
                          &times;
                        </button>
                      </div>
                    );
                  })}
                </div>

                <button type="button" onClick={() => {
                  const newLine = makeLine();
                  setLines([...lines, newLine]);
                  setFocusLineKey(newLine.key);
                  setFocusField("item");
                }} className="mt-3 w-full border-2 border-dashed border-gray-300 rounded-lg py-2 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600">
                  + Add another item
                </button>
              </>
            )}
          </div>

          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
          {results && results.failed > 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              {results.success} item(s) received successfully, {results.failed} failed.
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => router.back()} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={submitting || !header.supplierId} className="bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
              {submitting ? "Recording..." : `Receive ${lines.filter((l) => l.itemId && l.quantity).length} Item(s)`}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
