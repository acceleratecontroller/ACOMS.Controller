import { z } from "zod";
import { optionalString, positiveDecimal } from "@/lib/validation-helpers";

// ─── Item Schemas ────────────────────────────────────────

export const createItemSchema = z.object({
  code: z.string().min(1, "Item code is required"),
  description: z.string().min(1, "Description is required"),
  category: optionalString,
  unitOfMeasure: z
    .enum(["EACH", "METRE", "ROLL", "KILOGRAM", "LITRE", "BOX", "PACK", "LENGTH", "SET", "OTHER"])
    .default("EACH"),
  customUnitOfMeasure: optionalString,
  aliases: z.array(z.string()).default([]),
  minimumStockLevel: z.number().min(0).optional().nullable(),
  notes: optionalString,
  ownershipType: z.enum(["COMPANY", "CLIENT_FREE_ISSUE"]).default("COMPANY"),
  clientName: optionalString,
  supplierId: z.string().min(1, "Supplier is required"),
});

export const updateItemSchema = createItemSchema.partial();

// ─── Location Schemas ────────────────────────────────────

export const createLocationSchema = z.object({
  name: z.string().min(1, "Location name is required"),
  description: optionalString,
});

export const updateLocationSchema = createLocationSchema.partial();

// ─── Movement Schema ─────────────────────────────────────

export const createMovementSchema = z.object({
  itemId: z.string().min(1, "Item is required"),
  quantity: positiveDecimal,
  movementType: z.enum([
    "RECEIVED",
    "RECEIVED_FREE_ISSUE",
    "ISSUED",
    "TRANSFERRED",
    "RETURNED_FROM_JOB",
    "RETURNED_TO_SUPPLIER",
    "ADJUSTED",
  ]),
  ownershipType: z.enum(["COMPANY", "CLIENT_FREE_ISSUE"]).default("COMPANY"),

  fromLocationId: optionalString,
  toLocationId: optionalString,

  // Client tracking
  clientName: optionalString,
  externalClientId: optionalString,

  // Project/Job tracking
  projectName: optionalString,
  projectCode: optionalString,
  externalProjectId: optionalString,

  // External system mapping
  externalSource: optionalString,

  // Source context
  sourceType: z.enum(["SUPPLIER", "CLIENT", "INTERNAL"]).optional().nullable(),
  sourceName: optionalString,

  // Job link
  jobId: optionalString,

  // References
  reference: optionalString,
  notes: optionalString,
  attachmentPlaceholder: optionalString,
});

// ─── Movement Type Location Requirements ────────────────
// Which location fields are required per movement type.

/** Movement types that require a toLocationId (stock arriving). */
export const MOVEMENT_NEEDS_TO_LOCATION: readonly string[] = [
  "RECEIVED", "RECEIVED_FREE_ISSUE", "RETURNED_FROM_JOB", "ADJUSTED",
] as const;

/** Movement types that require a fromLocationId (stock leaving). */
export const MOVEMENT_NEEDS_FROM_LOCATION: readonly string[] = [
  "ISSUED", "RETURNED_TO_SUPPLIER",
] as const;

/** Movement types that require both fromLocationId and toLocationId. */
export const MOVEMENT_NEEDS_BOTH_LOCATIONS: readonly string[] = [
  "TRANSFERRED",
] as const;

// ─── Stocktake Schemas ───────────────────────────────────

export const createStocktakeSchema = z.object({
  locationId: z.string().min(1, "Location is required"),
  notes: optionalString,
});

export const updateStocktakeLineSchema = z.object({
  countedQty: z.number().min(0, "Counted quantity cannot be negative"),
  notes: optionalString,
});

// ─── Pick List Schemas ───────────────────────────────────

export const createPickListSchema = z.object({
  name: z.string().min(1, "Pick list name is required"),
  description: optionalString,
  items: z.array(z.object({
    itemId: z.string().min(1),
    defaultQty: z.number().positive().default(1),
  })).min(1, "At least one item is required"),
});

export const updatePickListSchema = z.object({
  name: z.string().min(1).optional(),
  description: optionalString,
  items: z.array(z.object({
    itemId: z.string().min(1),
    defaultQty: z.number().positive().default(1),
  })).optional(),
});

// ─── Import Schema ───────────────────────────────────────

export const importItemRowSchema = z.object({
  code: z.string().min(1, "Item code is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().optional(),
  unitOfMeasure: z
    .enum(["EACH", "METRE", "ROLL", "KILOGRAM", "LITRE", "BOX", "PACK", "LENGTH", "SET", "OTHER"])
    .optional()
    .default("EACH"),
  customUnitOfMeasure: z.string().optional(),
  aliases: z.string().optional(),
  minimumStockLevel: z.number().min(0).optional(),
  notes: z.string().optional(),
});

// ─── Job Schemas ────────────────────────────────────────

export const createJobSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  name: z.string().min(1, "Job name is required"),
  client: z.string().min(1, "Client is required"),
  contact: z.string().min(1, "Contact is required"),
  locationId: z.string().min(1, "Location is required"),
});

export const createJobMaterialSchema = z.object({
  itemId: z.string().min(1, "Item is required"),
  requiredQty: z.number().positive("Required quantity must be greater than zero"),
  notes: optionalString,
});

export const updateJobMaterialSchema = z.object({
  requiredQty: z.number().positive("Required quantity must be greater than zero").optional(),
  status: z.enum(["PENDING", "REQUESTED", "FULFILLED"]).optional(),
  notes: optionalString,
});

export const bulkCreateJobMaterialSchema = z.object({
  items: z.array(z.object({
    itemId: z.string().min(1, "Item is required"),
    requiredQty: z.number().positive("Required quantity must be greater than zero"),
    notes: optionalString,
  })).min(1, "At least one item is required"),
});

// ─── Supplier Schemas ───────────────────────────────────

export const createSupplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required"),
  contactName: optionalString,
  phone: optionalString,
  email: optionalString,
  notes: optionalString,
  isFreeIssue: z.boolean().default(false),
  clientName: optionalString,
}).refine(
  (data) => !data.isFreeIssue || (data.clientName && data.clientName.trim().length > 0),
  { message: "Client name is required for free-issue suppliers", path: ["clientName"] },
);

export const updateSupplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required").optional(),
  contactName: optionalString,
  phone: optionalString,
  email: optionalString,
  notes: optionalString,
  isFreeIssue: z.boolean().optional(),
  clientName: optionalString,
}).refine(
  (data) => data.isFreeIssue === undefined || !data.isFreeIssue || (data.clientName && data.clientName.trim().length > 0),
  { message: "Client name is required for free-issue suppliers", path: ["clientName"] },
);
