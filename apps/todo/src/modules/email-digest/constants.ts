export const TIER_OPTIONS = [
  { value: "TIER_1_ACTION", label: "Action Required", color: "red" },
  { value: "TIER_2_UPDATE", label: "Important Update", color: "amber" },
  { value: "TIER_3_FYI", label: "FYI", color: "slate" },
] as const;

export const WINDOW_OPTIONS = [
  { value: "EARLY_MORNING", label: "Early Morning", time: "3 PM yesterday → 5:30 AM" },
  { value: "MORNING", label: "Morning", time: "5:30 AM → 9:30 AM" },
  { value: "MIDDAY", label: "Midday", time: "9:30 AM → 1 PM" },
  { value: "AFTERNOON", label: "Afternoon", time: "1 PM → 3 PM" },
] as const;

export const WINDOW_DISPLAY_ORDER: string[] = [
  "AFTERNOON", "MIDDAY", "MORNING", "EARLY_MORNING",
];

export const TIER_COLORS = {
  TIER_1_ACTION: {
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-l-4 border-red-500",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  },
  TIER_2_UPDATE: {
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-l-4 border-amber-500",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  },
  TIER_3_FYI: {
    bg: "bg-slate-50 dark:bg-slate-800",
    border: "border-l-4 border-slate-300 dark:border-slate-600",
    badge: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400",
  },
} as const;

export const TIER_PRIORITY_MAP: Record<string, "HIGH" | "MEDIUM" | "LOW"> = {
  TIER_1_ACTION: "HIGH",
  TIER_2_UPDATE: "MEDIUM",
  TIER_3_FYI: "LOW",
};
