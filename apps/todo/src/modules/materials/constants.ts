export interface SelectOption {
  value: string;
  label: string;
}

export const MOVEMENT_TYPE_OPTIONS: SelectOption[] = [
  { value: "RECEIVED", label: "Received (Supplier)" },
  { value: "RECEIVED_FREE_ISSUE", label: "Received (Client Free Issue)" },
  { value: "ISSUED", label: "Issued to Job" },
  { value: "TRANSFERRED", label: "Transferred" },
  { value: "RETURNED_FROM_JOB", label: "Returned from Job" },
  { value: "RETURNED_TO_SUPPLIER", label: "Returned to Supplier" },
  { value: "ADJUSTED", label: "Adjustment" },
];

export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  RECEIVED: "Received (Supplier)",
  RECEIVED_FREE_ISSUE: "Received (Client Free Issue)",
  ISSUED: "Issued to Job",
  TRANSFERRED: "Transferred",
  RETURNED_FROM_JOB: "Returned from Job",
  RETURNED_TO_SUPPLIER: "Returned to Supplier",
  ADJUSTED: "Adjustment",
};

export const OWNERSHIP_TYPE_OPTIONS: SelectOption[] = [
  { value: "COMPANY", label: "Company" },
  { value: "CLIENT_FREE_ISSUE", label: "Client Free Issue" },
];

export const UNIT_OF_MEASURE_OPTIONS: SelectOption[] = [
  { value: "EACH", label: "Each" },
  { value: "METRE", label: "Metre" },
  { value: "ROLL", label: "Roll" },
  { value: "KILOGRAM", label: "Kilogram" },
  { value: "LITRE", label: "Litre" },
  { value: "BOX", label: "Box" },
  { value: "PACK", label: "Pack" },
  { value: "LENGTH", label: "Length" },
  { value: "SET", label: "Set" },
  { value: "OTHER", label: "Other" },
];

export const UOM_LABELS: Record<string, string> = {
  EACH: "ea",
  METRE: "m",
  ROLL: "roll",
  KILOGRAM: "kg",
  LITRE: "L",
  BOX: "box",
  PACK: "pk",
  LENGTH: "len",
  SET: "set",
  OTHER: "other",
};

export const CATEGORY_OPTIONS: SelectOption[] = [
  { value: "Civil", label: "Civil" },
  { value: "Fibre Cable", label: "Fibre Cable" },
  { value: "Copper Cable", label: "Copper Cable" },
  { value: "Fibre Joint", label: "Fibre Joint" },
  { value: "Copper Joint", label: "Copper Joint" },
  { value: "Other", label: "Other" },
];

export const SOURCE_TYPE_OPTIONS: SelectOption[] = [
  { value: "SUPPLIER", label: "Supplier" },
  { value: "CLIENT", label: "Client" },
  { value: "INTERNAL", label: "Internal" },
];

export const STOCKTAKE_STATUS_OPTIONS: SelectOption[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "COMPLETED", label: "Completed" },
];

export const CLIENT_RETURN_STATUS_LABELS: Record<string, string> = {
  TO_BE_RETURNED: "To Be Returned",
  RETURNED: "Returned",
};
