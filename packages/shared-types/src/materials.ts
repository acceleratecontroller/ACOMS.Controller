// ============================================================
// Material Tracker shared types
// ============================================================

export type MovementType =
  | "RECEIVED"
  | "RECEIVED_FREE_ISSUE"
  | "ISSUED"
  | "TRANSFERRED"
  | "RETURNED_FROM_JOB"
  | "RETURNED_TO_SUPPLIER"
  | "ADJUSTED";

export type OwnershipType = "COMPANY" | "CLIENT_FREE_ISSUE";

export type UnitOfMeasure =
  | "EACH"
  | "METRE"
  | "ROLL"
  | "KILOGRAM"
  | "LITRE"
  | "BOX"
  | "PACK"
  | "LENGTH"
  | "SET";

export type SourceType = "SUPPLIER" | "CLIENT" | "INTERNAL";

export type StocktakeStatus = "DRAFT" | "COMPLETED";

// ─── Input Types ─────────────────────────────────────────

export interface CreateItemInput {
  code: string;
  description: string;
  category?: string | null;
  unitOfMeasure?: UnitOfMeasure;
  aliases?: string[];
  minimumStockLevel?: number | null;
  notes?: string | null;
}

export interface UpdateItemInput {
  code?: string;
  description?: string;
  category?: string | null;
  unitOfMeasure?: UnitOfMeasure;
  aliases?: string[];
  minimumStockLevel?: number | null;
  notes?: string | null;
}

export interface CreateMovementInput {
  itemId: string;
  quantity: number;
  movementType: MovementType;
  ownershipType?: OwnershipType;
  fromLocationId?: string | null;
  toLocationId?: string | null;
  clientName?: string | null;
  externalClientId?: string | null;
  projectName?: string | null;
  projectCode?: string | null;
  externalProjectId?: string | null;
  externalSource?: string | null;
  sourceType?: SourceType | null;
  sourceName?: string | null;
  reference?: string | null;
  notes?: string | null;
}

export interface StockLevel {
  itemId: string;
  itemCode: string;
  itemDescription: string;
  unitOfMeasure: string;
  locationId: string;
  locationName: string;
  currentStock: number;
  minimumStockLevel: number | null;
  isBelowMinimum: boolean;
}
