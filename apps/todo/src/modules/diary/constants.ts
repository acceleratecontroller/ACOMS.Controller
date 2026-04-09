export const DIARY_TYPE_OPTIONS = [
  { value: "NOTE", label: "Note" },
  { value: "EVENT", label: "Event" },
  { value: "CONVERSATION", label: "Conversation" },
] as const;

export const DIARY_TYPE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  NOTE: {
    bg: "bg-blue-50 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  EVENT: {
    bg: "bg-green-50 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-400",
    dot: "bg-green-500",
  },
  CONVERSATION: {
    bg: "bg-amber-50 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
  },
};
