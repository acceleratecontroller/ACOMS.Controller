export interface SelectOption {
  value: string;
  label: string;
}

export const DEPOT_OPTIONS: SelectOption[] = [
  { value: "BRISBANE", label: "Brisbane" },
  { value: "HERVEY_BAY", label: "Hervey Bay" },
  { value: "BUNDABERG", label: "Bundaberg" },
  { value: "MACKAY", label: "Mackay" },
];

export const JOB_TYPE_OPTIONS: SelectOption[] = [
  { value: "QUOTE", label: "Quote" },
  { value: "DIRECT_WORK_ORDER", label: "Direct Work Order" },
];

export const JOB_REQUEST_STATUS_OPTIONS: SelectOption[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING_REVIEW", label: "Pending Review" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

export const DEPOT_LABELS: Record<string, string> = {
  BRISBANE: "Brisbane",
  HERVEY_BAY: "Hervey Bay",
  BUNDABERG: "Bundaberg",
  MACKAY: "Mackay",
};

export const JOB_TYPE_LABELS: Record<string, string> = {
  QUOTE: "Quote",
  DIRECT_WORK_ORDER: "Direct Work Order",
};

export const JOB_REQUEST_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_REVIEW: "Pending Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  PENDING_REVIEW: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  APPROVED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export const JOB_TYPE_COLORS: Record<string, string> = {
  QUOTE: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  DIRECT_WORK_ORDER: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};
